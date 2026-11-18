import { Resend } from 'resend';
import { demoMode } from '../utils/config';

const key = process.env.RESEND_API_KEY;
const resend = key && !key.startsWith('your-') ? new Resend(key) : null;

export class EmailUnavailableError extends Error {
  constructor() {
    super('Email delivery is unavailable. Check the Resend configuration or try again later.');
  }
}

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (demoMode) return { sent: false };
  if (!resend || !process.env.RESEND_FROM_EMAIL) throw new EmailUnavailableError();
  try {
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to, subject, text });
    if (result.error || !result.data?.id) throw new EmailUnavailableError();
    return { sent: true };
  } catch {
    throw new EmailUnavailableError();
  }
}
