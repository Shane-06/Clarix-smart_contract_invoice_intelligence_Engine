import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { getJwtSecret } from '../utils/config';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.match(/^Bearer (\S+)$/i)?.[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing from request headers' });
  }

  jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }, (err, decoded) => {
    if (err || !decoded || typeof decoded === 'string' || typeof decoded.userId !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded as JwtPayload;
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to administrator role' });
  }

  next();
}
