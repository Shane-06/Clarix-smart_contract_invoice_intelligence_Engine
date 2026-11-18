import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

const limitAuth = rateLimit(20, 60000);
router.post('/register', limitAuth, register);
router.post('/login', limitAuth, login);
router.get('/me', authenticateToken, getProfile);

export default router;
