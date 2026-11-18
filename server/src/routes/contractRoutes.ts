import { Router } from 'express';
import {
  uploadContract,
  getContracts,
  getContractById,
  reanalyzeContract,
  chatContract,
  checkScopeCreep,
  addWorkLog,
  downloadContract,
  updateContractContact
} from '../controllers/contractController';
import { authenticateToken } from '../middleware/authMiddleware';
import { rateLimit } from '../middleware/rateLimit';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Apply auth middleware to all contract routes
router.use(authenticateToken);

const limitIntelligence = rateLimit(30, 60000);
router.post('/upload', limitIntelligence, upload.single('file'), uploadContract);
router.get('/', getContracts);
router.get('/:id', getContractById);
router.patch('/:id/contact', updateContractContact);
router.get('/:id/download', downloadContract);
router.post('/:id/analyze', limitIntelligence, reanalyzeContract);
router.post('/:id/chat', limitIntelligence, chatContract);
router.get('/:id/creep', limitIntelligence, checkScopeCreep);
router.post('/:id/worklog', addWorkLog);

export default router;
