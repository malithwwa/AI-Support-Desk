import { Router } from 'express';

const router = Router();

router.get('/message', (_req, res) => {
  res.json({ message: 'Message API is working' });
});

export default router;