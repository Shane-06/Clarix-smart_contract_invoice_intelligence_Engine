import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your-')
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailPayload) {
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!resend) {
    console.log('--- MOCK EMAIL DISPATCH ---');
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML):\n${html}`);
    console.log('---------------------------');
    return { id: `mock-email-${Date.now()}`, message: 'Mock email logged successfully' };
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    throw error;
  }
}
