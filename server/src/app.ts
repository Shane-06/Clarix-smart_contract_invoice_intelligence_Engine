import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import contractRoutes from './routes/contractRoutes';
import milestoneRoutes from './routes/milestoneRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import emailRoutes from './routes/emailRoutes';
import { demoMode } from './utils/config';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
app.disable('x-powered-by');

const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0) app.set('trust proxy', trustedProxyHops);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Status Route
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', env: process.env.NODE_ENV || 'development', demo: demoMode });
  } catch {
    res.status(503).json({ status: 'unavailable', error: 'Database is unavailable' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/emails', emailRoutes);

// 404 Route
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express Global Error]:', err);

  // Multer errors (e.g. file size exceeded)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size too large. Maximum size allowed is 10MB.' });
  }

  // General Multer errors or custom file type errors
  if (err instanceof Error && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  // Zod Validation schema errors (usually handled in controllers, but as a safeguard)
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: err.errors });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'An unexpected error occurred on the server.' : err.message
  });
});

export default app;
