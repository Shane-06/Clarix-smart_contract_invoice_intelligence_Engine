import 'dotenv/config';

export const demoMode = process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('your-')) {
    throw new Error('Set JWT_SECRET to a unique value of at least 32 characters.');
  }
  return secret;
}
