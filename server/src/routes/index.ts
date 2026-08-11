import { Router } from 'express';

const router = Router();

router.get('/message', (_req, res) => {
  res.json({ message: 'Hello from the Express API on Bun 🐰' });
});

export default router;