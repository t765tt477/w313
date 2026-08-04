import Order from '../models/Order.js';
import Client from '../models/Client.js';
import PricingSettings from '../models/PricingSettings.js';
import dispatchService from '../services/dispatchService.js';
import { broadcastToAdmins, createNotification } from './notificationController.js';
import { emitToUser } from '../services/socketService.js';

// Create order
export const createOrder = async (req, res) => {
  try {
    const {
      pickupLocation,
      deliveryLocation,
      packageDetails,
      distance,
      paymentMethod,
      notes
    } = req.body;

    // Use the client's city pricing settings when available, so admin-configured
    // rates (and the commission percentage) are actually applied; fall back to
    // sensible defaults if no settings exist yet for that city.
    const client = await Client.findById(req.user.id).select('city');
    const pricing = client?.city ? await PricingSettings.findOne({ cityId: client.city }) : null;

    const basePricePerKm = pricing?.basePricePerKm ?? 2.00;
    const weightFeePerKg = pricing?.weightFeePerKg ?? 0.50;
    const sizeFeeMap = {
      small: pricing?.sizeSmallFee ?? 0,
      medium: pricing?.sizeMediumFee ?? 1,
      large: pricing?.sizeLargeFee ?? 2
    };
    const commissionPercentage = pricing?.commissionPercentage ?? 10;

    // Calculate price
    const basePrice = distance * basePricePerKm;
    const weightFee = (packageDetails.weight || 0) * weightFeePerKg;
    const sizeFee = sizeFeeMap[packageDetails.size] ?? 0;
    const totalPrice = basePrice + weightFee + sizeFee;
    const platformFee = totalPrice * (commissionPercentage / 100);
    const driverEarnings = totalPrice - platformFee;

    const order = await Order.create({
      client: req.user.id,
      pickupLocation,
      deliveryLocation,
      packageDetails,
      distance,
      price: totalPrice,
      platformFee,
      driverEarnings,
      paymentMethod: paymentMethod || 'cash',
      notes
    });

    await order.populate('client', 'name phone');

    res.status(201).json({ message: 'Order created successfully', order });

    broadcastToAdmins(
      'new_order',
      'طلب جديد',
      `طلب توصيل جديد من ${order.client?.name || 'زبون'} بقيمة ${totalPrice.toFixed(2)} جنيه`,
      { orderId: order._id }
    );

    // Fire-and-forget: find the nearest available driver and offer them the
    // order. Runs after the response is sent so it never delays the client.
    dispatchService.dispatchOrder(order._id).catch((err) => {
      console.error('dispatchOrder error:', err.message);
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ client: req.user.id })
      .populate('driver', 'name phone profileImage vehicleType vehicleNumber rating')
      .sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('client', 'name phone')
      .populate('driver', 'name phone profileImage vehicleType vehicleNumber rating');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is the driver
    if (order.client._id.toString() !== req.user.id &&
      (!order.driver || order.driver._id.toString() !== req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Allow cancellation for pending and accepted orders, but not after pickup
    if (!['pending', 'accepted'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order after pickup' });
    }

    const { reason = 'client' } = req.body;

    order.status = 'cancelled';
    order.dispatchStatus = 'cancelled';
    order.dispatchDriver = null;
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    await order.save();

    // Cancel dispatch if order is still pending
    if (order.status === 'pending') {
      await dispatchService.cancelDispatch(order._id);
    }

    // Notify the driver if order was accepted
    if (order.driver) {
      await createNotification(
        order.driver,
        'order_cancelled',
        'تم إلغاء الطلب',
        'قام الزبون بإلغاء الطلب',
        { orderId: order._id },
        'Driver',
        true
      );
      emitToUser(order.driver, 'order:cancelled', {
        orderId: order._id,
        message: 'قام الزبون بإلغاء الطلب'
      });
    }

    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check and cancel expired orders (10 minutes timeout)
export const checkExpiredOrders = async () => {
  try {
    const timeoutMinutes = 10;
    const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const expiredOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: timeoutDate },
      cancelReason: null
    });

    for (const order of expiredOrders) {
      order.status = 'cancelled';
      order.dispatchStatus = 'no_drivers_available';
      order.cancelledAt = new Date();
      order.cancelReason = 'timeout';
      await order.save();
      await dispatchService.cancelDispatch(order._id);

      // Notify client about timeout
      await createNotification(
        order.client,
        'order_timeout',
        'انتهى وقت الطلب',
        'عذراً، لم يتم العثور على مندوب متاح في الوقت المحدد. يرجى المحاولة مرة أخرى بعد قليل.',
        { orderId: order._id },
        'Client',
        true
      );

      emitToUser(order.client, 'order:timeout', {
        orderId: order._id,
        message: 'عذراً، لم يتم العثور على مندوب متاح في الوقت المحدد. يرجى المحاولة مرة أخرى بعد قليل.'
      });
    }

    console.log(`Checked expired orders: ${expiredOrders.length} orders cancelled due to timeout`);
  } catch (error) {
    console.error('Error checking expired orders:', error);
  }
};

// Rate order
export const rateOrder = async (req, res) => {
  try {
    const rating = Number(req.body.rating);

    if (!rating || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'التقييم يجب أن يكون رقمًا بين 1 و 5' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only rate delivered orders' });
    }

    if (order.rating) {
      return res.status(400).json({ message: 'تم تقييم هذا الطلب مسبقًا' });
    }

    // Update driver rating
    const Driver = (await import('../models/Driver.js')).default;
    const driver = await Driver.findById(order.driver);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const totalRating = (driver.rating || 0) * (driver.ratingCount || 0) + rating;
    driver.ratingCount = (driver.ratingCount || 0) + 1;
    driver.rating = totalRating / driver.ratingCount;
    await driver.save();

    order.rating = rating;
    order.ratedAt = new Date();
    await order.save();

    res.status(200).json({ message: 'Rating submitted', rating: order.rating, driverRating: driver.rating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
