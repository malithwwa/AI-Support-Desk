import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { auth } from '../lib/auth.ts';
import { fromNodeHeaders } from 'better-auth/node';

export const requireAuth:RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.session = session.session;
  req.user = session.user;
  next();
}
