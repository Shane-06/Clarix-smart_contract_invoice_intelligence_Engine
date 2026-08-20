import { Router } from 'express';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  addPayment,
  deleteInvoice
} from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.patch('/:id', updateInvoice);
router.post('/payment', addPayment);
router.delete('/:id', deleteInvoice);

export default router;
