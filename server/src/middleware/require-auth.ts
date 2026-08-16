import type { NextFunction, Request, Response } from 'express';
import { auth } from '../lib/auth.ts';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.session = session.session;
  req.user = session.user;
  next();
}
