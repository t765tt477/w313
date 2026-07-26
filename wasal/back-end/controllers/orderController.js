import Order from '../models/Order.js';
import dispatchService from '../services/dispatchService.js';
import { broadcastToAdmins } from './notificationController.js';

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

    // Calculate price
    const basePrice = distance * 2.00;
    const weightFee = (packageDetails.weight || 0) * 0.50;
    const sizeFee = (packageDetails.size === 'large' ? 2 : packageDetails.size === 'medium' ? 1 : 0);
    const totalPrice = basePrice + weightFee + sizeFee;
    const platformFee = totalPrice * 0.10;
    const driverEarnings = totalPrice * 0.90;

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
      `طلب توصيل جديد من ${order.client?.name || 'عميل'} بقيمة ${totalPrice.toFixed(2)} جنيه`,
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
      .populate('driver')
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
      .populate('driver');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is the driver
    if (order.client._id.toString() !== req.user.id && 
        (!order.driver || order.driver.user?.toString() !== req.user.id)) {
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

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel order in progress' });
    }

    order.status = 'cancelled';
    order.dispatchStatus = 'cancelled';
    order.dispatchDriver = null;
    await order.save();
    await dispatchService.cancelDispatch(order._id);

    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate order
export const rateOrder = async (req, res) => {
  try {
    const { rating } = req.body;

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

    // Update driver rating
    const Driver = (await import('../models/Driver.js')).default;
    const driver = await Driver.findById(order.driver);
    
    const totalRating = driver.rating * driver.ratingCount + rating;
    driver.ratingCount += 1;
    driver.rating = totalRating / driver.ratingCount;
    await driver.save();

    res.status(200).json({ message: 'Rating submitted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
