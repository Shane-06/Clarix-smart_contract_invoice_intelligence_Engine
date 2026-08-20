import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { invoiceSchema, paymentSchema } from '../validators';

export async function getInvoices(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contractId } = req.query;

    const whereClause: any = {
      contract: {
        userId: req.user.userId,
      },
    };

    if (contractId && typeof contractId === 'string') {
      whereClause.contractId = contractId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        contract: {
          select: { title: true }
        },
        milestone: {
          select: { title: true }
        },
        payments: true
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = invoiceSchema.parse(req.body);

    // Verify contract belongs to user
    const contract = await prisma.contract.findUnique({
      where: { id: validatedData.contractId }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Verify milestone if provided
    if (validatedData.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: validatedData.milestoneId }
      });
      if (!milestone || milestone.contractId !== validatedData.contractId) {
        return res.status(400).json({ error: 'Milestone must belong to the selected contract.' });
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        contractId: validatedData.contractId,
        milestoneId: validatedData.milestoneId || null,
        amount: validatedData.amount,
        dueDate: validatedData.dueDate,
        status: validatedData.status,
      },
      include: {
        contract: { select: { title: true } },
        milestone: { select: { title: true } }
      }
    });

    return res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create invoice error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateInvoice(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { amount, dueDate, status, milestoneId } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!invoice || invoice.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null;

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        contract: { select: { title: true } },
        milestone: { select: { title: true } },
        payments: true
      }
    });

    return res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addPayment(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = paymentSchema.parse(req.body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: validatedData.invoiceId },
      include: { contract: true, payments: true }
    });

    if (!invoice || invoice.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        invoiceId: validatedData.invoiceId,
        amount: validatedData.amount,
        method: validatedData.method,
      }
    });

    // Compute total paid
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + validatedData.amount;

    // Check if fully paid or update status
    const newStatus = totalPaid >= invoice.amount ? 'PAID' : 'UNPAID';

    const updatedInvoice = await prisma.invoice.update({
      where: { id: validatedData.invoiceId },
      data: { status: newStatus },
      include: { payments: true }
    });

    return res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
      invoice: updatedInvoice
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Add payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!invoice || invoice.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await prisma.invoice.delete({
      where: { id }
    });

    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
