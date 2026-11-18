import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import prisma from '../utils/prisma';
import { invoiceBalance, presentInvoice } from '../utils/invoiceAmounts';
import { invoiceSchema, invoiceUpdateSchema, paymentSchema } from '../validators';

const invoiceDetails = {
  contract: { select: { title: true } },
  milestone: { select: { title: true } },
  payments: true,
} satisfies Prisma.InvoiceInclude;

class InvoiceError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function invoiceError(res: Response, error: unknown) {
  if (error instanceof InvoiceError) return res.status(error.status).json({ error: error.message });
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues });
  console.error('Invoice operation failed:', error instanceof Error ? error.name : 'Unknown error');
  return res.status(500).json({ error: 'Invoice operation failed' });
}

async function checkMilestone(db: Prisma.TransactionClient, milestoneId: string | null | undefined, contractId: string) {
  if (!milestoneId) return;
  const milestone = await db.milestone.findFirst({ where: { id: milestoneId, contractId }, select: { id: true } });
  if (!milestone) throw new InvoiceError(400, 'Milestone must belong to the selected contract.');
}

async function invoiceTransaction<T>(operation: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(error.code)) throw error;
    }
  }
  throw new InvoiceError(409, 'The invoice changed during this request. Please retry.');
}

export async function getInvoices(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { contractId } = req.query;
  try {
    const invoices = await prisma.invoice.findMany({
      where: { contract: { userId: req.user.userId }, contractId: typeof contractId === 'string' ? contractId : undefined },
      include: invoiceDetails,
      orderBy: { dueDate: 'asc' },
    });
    return res.json(invoices.map(presentInvoice));
  } catch (error) {
    return invoiceError(res, error);
  }
}

export async function createInvoice(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = invoiceSchema.parse(req.body);
    const contract = await prisma.contract.findFirst({
      where: { id: data.contractId, userId: req.user.userId }, select: { id: true },
    });
    if (!contract) throw new InvoiceError(404, 'Contract not found');
    await checkMilestone(prisma, data.milestoneId, contract.id);
    const invoice = await prisma.invoice.create({ data, include: invoiceDetails });
    return res.status(201).json({ message: 'Invoice created successfully', invoice: presentInvoice(invoice) });
  } catch (error) {
    return invoiceError(res, error);
  }
}

export async function updateInvoice(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.userId;
  try {
    const data = invoiceUpdateSchema.parse(req.body);
    const invoice = await invoiceTransaction(async db => {
      const current = await db.invoice.findFirst({
        where: { id: req.params.id, contract: { userId } }, include: { payments: true },
      });
      if (!current) throw new InvoiceError(404, 'Invoice not found');
      await checkMilestone(db, data.milestoneId, current.contractId);
      const next = { ...current, ...data, amount: data.amount === undefined ? current.amount : new Prisma.Decimal(data.amount) };
      const { paid, status } = invoiceBalance(next);
      if (next.amount.lessThan(paid)) throw new InvoiceError(400, 'The invoice amount cannot be below recorded payments.');
      return db.invoice.update({ where: { id: current.id }, data: { ...data, status }, include: invoiceDetails });
    });
    return res.json({ message: 'Invoice updated successfully', invoice: presentInvoice(invoice) });
  } catch (error) {
    return invoiceError(res, error);
  }
}

export async function addPayment(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.userId;
  try {
    const data = paymentSchema.parse(req.body);
    const amount = new Prisma.Decimal(data.amount);
    const result = await invoiceTransaction(async db => {
      const invoice = await db.invoice.findFirst({
        where: { id: data.invoiceId, contract: { userId } }, include: invoiceDetails,
      });
      if (!invoice) throw new InvoiceError(404, 'Invoice not found');
      if (data.reference) {
        const existing = await db.payment.findUnique({ where: { reference: data.reference } });
        if (existing) {
          if (existing.invoiceId !== invoice.id || !existing.amount.equals(amount) || existing.method !== data.method) {
            throw new InvoiceError(409, 'Payment reference has already been used.');
          }
          return { created: false, payment: existing, invoice };
        }
      }
      if (amount.greaterThan(invoiceBalance(invoice).balance)) {
        throw new InvoiceError(400, 'Payment exceeds the outstanding balance.');
      }
      const payment = await db.payment.create({ data });
      const { status } = invoiceBalance({ ...invoice, payments: [...invoice.payments, payment] });
      const updated = await db.invoice.update({ where: { id: invoice.id }, data: { status }, include: invoiceDetails });
      return { created: true, payment, invoice: updated };
    });
    return res.status(result.created ? 201 : 200).json({
      message: 'Payment recorded successfully',
      payment: { ...result.payment, amount: result.payment.amount.toNumber() },
      invoice: presentInvoice(result.invoice),
    });
  } catch (error) {
    return invoiceError(res, error);
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.userId;
  try {
    await invoiceTransaction(async db => {
      const invoice = await db.invoice.findFirst({
        where: { id: req.params.id, contract: { userId } }, include: { payments: true },
      });
      if (!invoice) throw new InvoiceError(404, 'Invoice not found');
      if (invoiceBalance(invoice).paid.greaterThan(0)) throw new InvoiceError(409, 'An invoice with payments cannot be deleted.');
      await db.invoice.delete({ where: { id: invoice.id } });
    });
    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return invoiceError(res, error);
  }
}
