import type { RequestHandler } from 'express';
import { UserRole } from '../generated/prisma/client.ts';

export const requireRole: RequestHandler = (req, res, next) => {
  if (req.user?.role !== UserRole.ADMIN) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
};
