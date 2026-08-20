import { Router } from 'express';
import {
  uploadContract,
  getContracts,
  getContractById,
  reanalyzeContract,
  chatContract,
  checkScopeCreep,
  addWorkLog,
  downloadContract
} from '../controllers/contractController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Apply auth middleware to all contract routes
router.use(authenticateToken);

router.post('/upload', upload.single('file'), uploadContract);
router.get('/', getContracts);
router.get('/:id', getContractById);
router.get('/:id/download', downloadContract);
router.post('/:id/analyze', reanalyzeContract);
router.post('/:id/chat', chatContract);
router.get('/:id/creep', checkScopeCreep);
router.post('/:id/worklog', addWorkLog);

export default router;
