import { Router } from 'express';
import {
  sendInvoiceReminder,
  getNotifications,
  markNotificationRead
} from '../controllers/emailController';
import { authenticateToken } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.use(authenticateToken);

router.post('/reminder', rateLimit(15, 60000), sendInvoiceReminder);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id', markNotificationRead);

export default router;
