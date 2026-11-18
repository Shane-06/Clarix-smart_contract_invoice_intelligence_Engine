import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import prisma from '../utils/prisma';
import { invoiceBalance } from '../utils/invoiceAmounts';
import { AIUnavailableError, generatePaymentReminder } from '../services/aiService';
import { EmailUnavailableError, sendEmail } from '../services/emailService';
import { demoMode } from '../utils/config';

const requestSchema = z.object({
  invoiceId: z.string().uuid(),
  delivery: z.object({
    recipient: z.string().email(),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(10000),
  }).optional(),
});

export async function sendInvoiceReminder(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { invoiceId, delivery } = requestSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, contract: { userId: req.user.userId } },
      include: { contract: { include: { user: { select: { name: true } } } }, milestone: true, payments: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
    const { balance } = invoiceBalance(invoice);
    if (balance.isZero()) return res.status(400).json({ error: 'This invoice has no outstanding balance.' });

    const recipient = invoice.contract.clientEmail;
    if (!delivery) {
      const analysis = z.object({ clientName: z.string() }).safeParse(invoice.contract.analysis);
      const clientName = analysis.success && !invoice.contract.isDemo ? analysis.data.clientName : '';
      const draft = await generatePaymentReminder(
        balance.toNumber(),
        invoice.dueDate.toISOString().slice(0, 10),
        invoice.milestone?.title || invoice.contract.title,
        clientName || 'there',
        invoice.contract.user.name,
      );
      return res.json({ ...draft, recipient, sent: false, demo: demoMode });
    }

    if (!recipient || recipient !== delivery.recipient) {
      return res.status(409).json({ error: 'The contract contact changed or is missing. Update it and refresh the draft.' });
    }
    const result = await sendEmail({ to: recipient, subject: delivery.subject, text: delivery.body });
    // Delivery has already completed. A notification failure must never prompt an email retry.
    await prisma.notification.create({
      data: {
        userId: req.user.userId,
        type: 'email_reminder',
        message: result.sent
          ? 'Payment reminder sent to ' + recipient + ' for ' + invoice.contract.title + '.'
          : 'Demo reminder recorded for ' + invoice.contract.title + '. No email was sent.',
      },
    }).catch(() => console.error('Could not record reminder notification'));
    return res.json({ ...result, recipient, demo: demoMode });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues });
    if (error instanceof AIUnavailableError || error instanceof EmailUnavailableError) return res.status(503).json({ error: error.message });
    console.error('Invoice reminder failed:', error instanceof Error ? error.name : 'Unknown error');
    return res.status(500).json({ error: 'Failed to process the reminder.' });
  }
}

export async function getNotifications(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId }, orderBy: { createdAt: 'desc' }, take: 20,
    });
    return res.json(notifications);
  } catch {
    return res.status(500).json({ error: 'Failed to load notifications.' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.userId }, data: { status: 'READ' },
    });
    if (!notification.count) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ id: req.params.id, status: 'READ' });
  } catch {
    return res.status(500).json({ error: 'Failed to update the notification.' });
  }
}
