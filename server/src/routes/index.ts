import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.ts';

const router = Router();

router.get('/message', requireAuth, (_req, res) => {
  res.json({ message: 'Message API is working' });
});

export default router;