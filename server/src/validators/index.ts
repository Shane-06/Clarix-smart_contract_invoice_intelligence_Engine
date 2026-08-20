import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['user', 'admin']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const milestoneSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  title: z.string().min(1, 'Milestone title is required'),
  dueDate: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date({ required_error: 'Due date is required' })),
  status: z.enum(['PENDING', 'COMPLETED']).default('PENDING'),
});

export const invoiceSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  milestoneId: z.string().uuid('Invalid milestone ID').nullable().optional(),
  amount: z.number().positive('Amount must be a positive number'),
  dueDate: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date({ required_error: 'Due date is required' })),
  status: z.enum(['UNPAID', 'PAID', 'OVERDUE']).default('UNPAID'),
});

export const paymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z.number().positive('Amount must be a positive number'),
  method: z.string().min(1, 'Payment method is required'),
});

export const workLogSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  description: z.string().min(1, 'Description is required'),
  hours: z.number().positive('Hours must be positive'),
  date: z.preprocess((arg) => {
    if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
  }, z.date()).optional(),
});
