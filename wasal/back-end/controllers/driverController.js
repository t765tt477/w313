import Driver from '../models/Driver.js';
import Order from '../models/Order.js';

// Update driver profile
export const updateDriverProfile = async (req, res) => {
  try {
    const { vehicleImage, licenseImage, name, phone } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { vehicleImage, licenseImage, name, phone },
      { new: true, runValidators: true }
    ).select('name email phone profileImage vehicleType vehicleNumber vehicleImage licenseImage isAvailable');

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    res.status(200).json({ message: 'Driver profile updated', driver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver profile
export const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id)
      .select('name email phone profileImage vehicleType vehicleNumber vehicleImage licenseImage isAvailable balance totalEarnings totalDeliveries rating ratingCount isApproved');

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    res.status(200).json({ driver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update driver location
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { currentLocation: { lat, lng } },
      { new: true }
    );

    res.status(200).json({ message: 'Location updated', driver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle availability
export const toggleAvailability = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.isAvailable = !driver.isAvailable;
    await driver.save();

    res.status(200).json({ message: 'Availability updated', driver });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available orders
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept order
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const driver = await Driver.findById(req.user.id);
    if (!driver || !driver.isAvailable) {
      return res.status(400).json({ message: 'Driver not available' });
    }

    const order = await Order.findById(orderId);
    if (!order || order.status !== 'pending') {
      return res.status(400).json({ message: 'Order not available' });
    }

    order.driver = driver._id;
    order.status = 'accepted';
    order.acceptedAt = new Date();
    await order.save();

    res.status(200).json({ message: 'Order accepted', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const order = await Order.findOne({
      _id: orderId,
      driver: driver._id
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (status === 'picked_up') {
      order.pickedUpAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';

      // Update driver stats
      driver.totalDeliveries += 1;
      driver.totalEarnings += order.driverEarnings;
      driver.balance += order.driverEarnings;
      await driver.save();
    }

    await order.save();

    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver orders
export const getDriverOrders = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const orders = await Order.find({ driver: driver._id })
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver earnings
export const getEarnings = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const orders = await Order.find({
      driver: driver._id,
      status: 'delivered'
    }).sort({ deliveredAt: -1 });

    // Group earnings by date
    const earningsByDate = {};
    orders.forEach(order => {
      const date = new Date(order.deliveredAt).toLocaleDateString('ar-SA', {
        day: 'numeric',
        month: 'long'
      });

      if (!earningsByDate[date]) {
        earningsByDate[date] = {
          date,
          orders: 0,
          earned: 0
        };
      }

      earningsByDate[date].orders += 1;
      earningsByDate[date].earned += order.driverEarnings;
    });

    // Convert to array and format
    const earnings = Object.values(earningsByDate).map((e) => ({
      date: e.date,
      orders: e.orders,
      earned: e.earned.toFixed(2) + ' جنيه'
    }));

    res.status(200).json({ earnings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
