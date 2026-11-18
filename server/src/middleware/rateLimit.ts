import { RequestHandler } from 'express';

export function rateLimit(maxRequests: number, windowMs: number): RequestHandler {
  const entries = new Map<string, { count: number; expires: number }>();
  let nextCleanup = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextCleanup) {
      for (const [key, entry] of entries) {
        if (entry.expires <= now) entries.delete(key);
      }
      nextCleanup = now + windowMs;
    }
    const key = req.user?.userId ?? req.ip ?? 'local';
    const current = entries.get(key);
    if ((!current && entries.size >= 10000) || (current && current.expires > now && current.count >= maxRequests)) {
      res.setHeader('Retry-After', Math.ceil(((current?.expires ?? nextCleanup) - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    if (current && current.expires > now) current.count++;
    else entries.set(key, { count: 1, expires: now + windowMs });
    return next();
  };
}
