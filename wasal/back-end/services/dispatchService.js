import Order from '../models/Order.js';
import Driver from '../models/Driver.js';
import Notification from '../models/Notification.js';
import { emitToUser, emitToRole } from './socketService.js';

// How long a driver has to respond to an order offer before it is
// automatically handed to the next-nearest driver.
const OFFER_TIMEOUT_MS = Number(process.env.DISPATCH_OFFER_TIMEOUT_MS) || 2 * 60 * 1000;

// orderId -> Node timeout handle, so we can cancel it if the driver
// responds (accept/reject) before the timer fires.
const offerTimers = new Map();

const clearOfferTimer = (orderId) => {
  const handle = offerTimers.get(orderId.toString());
  if (handle) {
    clearTimeout(handle);
    offerTimers.delete(orderId.toString());
  }
};

const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

// Finds the closest available driver to the order's pickup point, excluding
// anyone who already rejected/timed-out on this order.
const findNearestAvailableDriver = async (order) => {
  const excludedIds = (order.rejectedDrivers || []).map(r => r.driver.toString());

  const candidates = await Driver.find({
    isAvailable: true,
    isApproved: true,
    isSuspended: false,
    _id: { $nin: excludedIds },
    'currentLocation.lat': { $ne: null },
    'currentLocation.lng': { $ne: null }
  });

  if (!candidates.length || !order.pickupLocation?.lat) return null;

  let nearest = null;
  let nearestDistance = Infinity;
  for (const driver of candidates) {
    const distance = haversineKm(order.pickupLocation, driver.currentLocation);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = driver;
    }
  }

  return nearest ? { driver: nearest, distanceKm: nearestDistance } : null;
};

const notifyAdmins = (type, title, message, data = {}, sound = false) => {
  const payload = { type, title, message, data, sound, createdAt: new Date(), isRead: false, isLive: true };
  emitToRole('admin', 'notification:new', payload);
  emitToRole('super_admin', 'notification:new', payload);
};

const notify = async (recipientId, recipientModel, type, title, message, data = {}, sound = true) => {
  const notification = await Notification.create({
    recipient: recipientId, recipientModel, type, title, message, data, sound
  });
  emitToUser(recipientId, 'notification:new', notification);
  return notification;
};

// Main entry point: (re)starts the search for a driver for this order.
// Call this right after an order is created, and again any time a driver
// rejects or times out.
export const dispatchOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate('client', 'name phone');
  if (!order) return;
  if (!['pending'].includes(order.status)) return; // already accepted/cancelled elsewhere

  clearOfferTimer(orderId);

  const match = await findNearestAvailableDriver(order);

  if (!match) {
    order.dispatchDriver = null;
    order.dispatchStatus = 'no_drivers_available';
    await order.save();
    await notify(
      order.client._id, 'Client', 'order_no_driver',
      'لا يوجد مندوب متاح حالياً',
      'نعمل على إيجاد مندوب لطلبك، سنعلمك فور توفر أحدهم.',
      { orderId: order._id }
    );
    notifyAdmins(
      'system', 'لا يوجد مندوبون متاحون',
      `لم يتم إيجاد مندوب متاح للطلب #${order._id.toString().slice(-6)}`,
      { orderId: order._id }, true
    );
    return;
  }

  order.dispatchDriver = match.driver._id;
  order.dispatchStatus = 'offered';
  order.dispatchOfferExpiresAt = new Date(Date.now() + OFFER_TIMEOUT_MS);
  order.dispatchAttempts = (order.dispatchAttempts || 0) + 1;
  await order.save();

  // Push the offer to the driver in real time.
  emitToUser(match.driver._id, 'order:new_offer', {
    orderId: order._id,
    pickupLocation: order.pickupLocation,
    deliveryLocation: order.deliveryLocation,
    packageDetails: order.packageDetails,
    price: order.price,
    driverEarnings: order.driverEarnings,
    distance: order.distance,
    distanceToPickupKm: Math.round(match.distanceKm * 10) / 10,
    expiresAt: order.dispatchOfferExpiresAt,
    sound: true
  });

  await notify(
    match.driver._id, 'Driver',
    order.dispatchAttempts > 1 ? 'order_reassigned' : 'order_offer',
    'طلب توصيل جديد',
    `طلب جديد على بعد ${(Math.round(match.distanceKm * 10) / 10)} كم من موقعك، لديك دقيقتان للرد.`,
    { orderId: order._id }
  );

  if (order.dispatchAttempts > 1) {
    notifyAdmins(
      'order_update', 'إعادة تحويل طلب',
      `تم تحويل الطلب #${order._id.toString().slice(-6)} إلى مندوب آخر (المحاولة رقم ${order.dispatchAttempts})`,
      { orderId: order._id }
    );
  }

  // Also let the client know a driver is being contacted (first attempt only,
  // to avoid spamming them on every reassignment).
  if (order.dispatchAttempts === 1) {
    await notify(
      order.client._id, 'Client', 'order_update',
      'يتم البحث عن مندوب',
      'وجدنا مندوباً قريباً منك ونطلب منه الآن قبول طلبك.',
      { orderId: order._id },
      false
    );
  }

  // Start the 2-minute countdown. If nobody has accepted/rejected by then,
  // treat it as a timeout and move on to the next nearest driver.
  const handle = setTimeout(async () => {
    try {
      await handleOfferTimeout(order._id, match.driver._id);
    } catch (err) {
      console.error('Dispatch timeout handling error:', err.message);
    }
  }, OFFER_TIMEOUT_MS);
  offerTimers.set(order._id.toString(), handle);
};

const handleOfferTimeout = async (orderId, driverId) => {
  const order = await Order.findById(orderId);
  if (!order || order.status !== 'pending') return;
  // Make sure the offer we're timing out is still the current one
  // (it may already have been accepted/rejected).
  if (!order.dispatchDriver || order.dispatchDriver.toString() !== driverId.toString()) return;

  order.rejectedDrivers.push({ driver: driverId, reason: 'timeout' });
  order.dispatchDriver = null;
  order.dispatchStatus = 'searching';
  await order.save();

  await notify(
    driverId, 'Driver', 'order_offer_expired',
    'انتهت مهلة الرد',
    'انتهت مهلة الدقيقتين، تم تحويل الطلب إلى مندوب آخر.',
    { orderId: order._id },
    false
  );

  await dispatchOrder(order._id);
};

// Called when a driver taps "accept" on an offered order.
export const acceptOrder = async (orderId, driverId) => {
  const order = await Order.findById(orderId).populate('client', 'name phone');
  if (!order) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });

  if (order.status !== 'pending' || !order.dispatchDriver ||
    order.dispatchDriver.toString() !== driverId.toString()) {
    throw Object.assign(new Error('هذا الطلب لم يعد متاحاً لك'), { status: 400 });
  }

  const driver = await Driver.findById(driverId);
  if (!driver || !driver.isAvailable) {
    throw Object.assign(new Error('حسابك غير متاح لاستقبال الطلبات حالياً'), { status: 400 });
  }

  clearOfferTimer(orderId);

  order.driver = driverId;
  order.status = 'accepted';
  order.acceptedAt = new Date();
  order.dispatchStatus = 'assigned';
  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('client', 'name phone')
    .populate('driver');

  emitToUser(order.client._id, 'order:accepted', {
    orderId: order._id,
    order: populatedOrder,
    driver: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      rating: driver.rating,
      profileImage: driver.profileImage,
      currentLocation: driver.currentLocation
    },
    sound: true
  });

  await notify(
    order.client._id, 'Client', 'order_accepted',
    'تم قبول طلبك',
    `المندوب ${driver.name} في طريقه لاستلام طلبك.`,
    { orderId: order._id, driverId: driver._id }
  );

  return populatedOrder;
};

// Called when a driver taps "reject" on an offered order.
export const rejectOrder = async (orderId, driverId) => {
  const order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('الطلب غير موجود'), { status: 404 });

  if (!order.dispatchDriver || order.dispatchDriver.toString() !== driverId.toString()) {
    throw Object.assign(new Error('هذا الطلب لم يعد معروضاً عليك'), { status: 400 });
  }

  clearOfferTimer(orderId);

  order.rejectedDrivers.push({ driver: driverId, reason: 'rejected' });
  order.dispatchDriver = null;
  order.dispatchStatus = 'searching';
  await order.save();

  // Notify the client a driver passed on it, but reassignment is under way
  // (soft, no sound - this is expected/normal flow, not a problem).
  await notify(
    order.client._id, 'Client', 'order_rejected',
    'يتم تحويل طلبك',
    'اعتذر أحد المندوبين عن الطلب، يتم البحث عن مندوب آخر أقرب إليك الآن.',
    { orderId: order._id },
    false
  );

  await dispatchOrder(order._id);

  return order;
};

// Called when a client cancels a pending order, so we stop bothering drivers.
export const cancelDispatch = async (orderId) => {
  clearOfferTimer(orderId);
};

// Driver's live GPS ping (from the socket). Updates their stored location and,
// if they currently have an in-progress order, relays the position to the
// client tracking that order so the client map can show live movement.
export const handleDriverLocationPing = async (driverId, { lat, lng }) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return;

  await Driver.findByIdAndUpdate(driverId, { currentLocation: { lat, lng } });

  const activeOrder = await Order.findOne({
    driver: driverId,
    status: { $in: ['accepted', 'picked_up'] }
  });

  if (activeOrder) {
    emitToUser(activeOrder.client, 'driver:location', {
      orderId: activeOrder._id,
      lat,
      lng
    });
  }
};

export default {
  dispatchOrder,
  acceptOrder,
  rejectOrder,
  cancelDispatch,
  handleDriverLocationPing
};
