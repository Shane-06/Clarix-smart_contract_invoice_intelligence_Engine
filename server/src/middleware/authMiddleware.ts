import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing from request headers' });
  }

  const secret = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

  jwt.verify(token, secret, (err, decoded) => {
    if (err || !decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
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
