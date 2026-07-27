import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getConversations,
  getOrCreateSupportConversation,
  getOrCreateOrderConversation,
  getMessages,
  sendMessage,
  markConversationRead
} from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/support', getOrCreateSupportConversation);
router.post('/order/:orderId', getOrCreateOrderConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.put('/:id/read', markConversationRead);

export default router;
