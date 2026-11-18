import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
    .refine(value => Buffer.byteLength(value) <= 72, 'Password must fit within 72 bytes'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const milestoneSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  title: z.string().trim().min(1, 'Milestone title is required').max(200),
  dueDate: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date({ required_error: 'Due date is required' })),
  status: z.enum(['PENDING', 'COMPLETED']).default('PENDING'),
});

export const milestoneUpdateSchema = milestoneSchema.omit({ contractId: true }).partial();

const moneySchema = z.number().finite().positive('Amount must be a positive number')
  .max(999999999999.99)
  .refine(value => /^\d+(\.\d{1,2})?$/.test(String(value)), 'Use at most two decimal places');

export const invoiceSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  milestoneId: z.string().uuid('Invalid milestone ID').nullable().optional(),
  amount: moneySchema,
  dueDate: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date({ required_error: 'Due date is required' })),
  status: z.enum(['UNPAID', 'PAID', 'OVERDUE']).default('UNPAID'),
});

export const invoiceUpdateSchema = invoiceSchema.omit({ contractId: true }).partial();

export const paymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: moneySchema,
  method: z.string().trim().min(1, 'Payment method is required').max(80),
  reference: z.string().uuid().optional(),
});

export const workLogSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(2000),
  hours: z.number().finite().positive('Hours must be positive'),
  date: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).optional(),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(16000) }))
    .max(20).default([]),
});
