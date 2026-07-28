import Order from '../models/Order.js';
import dispatchService from './dispatchService.js';
import { createNotification } from '../controllers/notificationController.js';
import { emitToUser } from './socketService.js';

// Auto-cancel orders that have been pending for more than 10 minutes
export const autoCancelPendingOrders = async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const pendingOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: tenMinutesAgo },
      cancelReason: null
    }).populate('client', 'name phone');

    for (const order of pendingOrders) {
      order.status = 'cancelled';
      order.dispatchStatus = 'no_drivers_available';
      order.dispatchDriver = null;
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

      console.log(`Auto-cancelled order ${order.orderNumber} due to timeout`);
    }

    return pendingOrders.length;
  } catch (error) {
    console.error('Error in auto-cancel pending orders:', error);
    return 0;
  }
};

// Start the cleanup interval (runs every minute)
export const startOrderCleanupService = () => {
  // Run immediately on startup
  autoCancelPendingOrders();

  // Then run every minute
  const interval = setInterval(autoCancelPendingOrders, 60 * 1000);

  console.log('🧹 Order cleanup service started - checking for timeout orders every minute');

  return interval;
};
