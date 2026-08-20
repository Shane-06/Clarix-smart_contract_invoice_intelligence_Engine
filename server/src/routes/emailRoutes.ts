import { Router } from 'express';
import {
  sendInvoiceReminder,
  getNotifications,
  markNotificationRead
} from '../controllers/emailController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/reminder', sendInvoiceReminder);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id', markNotificationRead);

export default router;
