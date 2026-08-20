import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generatePaymentReminder } from '../services/aiService';
import { sendEmail } from '../services/emailService';

export async function sendInvoiceReminder(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'invoiceId is required.' });
    }

    // Fetch invoice details with related contract
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        contract: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        milestone: true,
      }
    });

    if (!invoice || invoice.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Try to determine client name from contract summary/title, or default to Client
    // In a real application, you might have a Client table or record clientName on the Contract model.
    // For this engine, we can parse the clientName if extracted, or fallback.
    // Let's attempt to use "Acme Corp" or extract it.
    let clientName = 'Client';
    if (invoice.contract.title) {
      // Look for indicators in title like "Contract with Acme Corp"
      const match = invoice.contract.title.match(/(?:with|for)\s+([A-Za-z0-9\s]+)$/i);
      if (match) {
        clientName = match[1].trim();
      }
    }

    const freelancerName = invoice.contract.user.name || 'Freelancer';
    const milestoneTitle = invoice.milestone ? invoice.milestone.title : 'Project milestone';

    console.log(`[Email Reminder] Generating reminder content for: Invoice ${invoice.id}, Milestone: ${milestoneTitle}`);
    
    // Generate reminder via AI
    const emailContent = await generatePaymentReminder(
      invoice.amount,
      invoice.dueDate.toISOString().split('T')[0],
      milestoneTitle,
      clientName,
      freelancerName
    );

    // Dispatch email
    const recipientEmail = invoice.contract.user.email; // Send to freelancer as proof/Cc, or client if we had their email
    // For safety in this interview demo application, we send to the freelancer's email (as a test notification)
    console.log(`[Email Reminder] Sending email to freelancer: ${recipientEmail}`);
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.body
    });

    // Save notification log in database
    await prisma.notification.create({
      data: {
        userId: req.user.userId,
        type: 'email_reminder',
        message: `Sent payment reminder for invoice ${invoice.id.substring(0, 8)}... ($${invoice.amount.toFixed(2)}) to ${clientName}.`,
        status: 'UNREAD'
      }
    });

    return res.json({
      message: 'Reminder email processed successfully',
      sent: true,
      recipient: recipientEmail,
      subject: emailContent.subject,
      body: emailContent.body,
      resendResult: emailResult
    });
  } catch (error) {
    console.error('Invoice reminder email handler error:', error);
    return res.status(500).json({ error: 'Failed to process and send payment reminder email.' });
  }
}

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { status: 'READ' }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
