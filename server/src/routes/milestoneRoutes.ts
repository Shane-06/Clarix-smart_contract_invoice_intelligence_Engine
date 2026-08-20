import { Router } from 'express';
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
} from '../controllers/milestoneController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getMilestones);
router.post('/', createMilestone);
router.patch('/:id', updateMilestone);
router.delete('/:id', deleteMilestone);

export default router;
