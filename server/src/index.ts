import express from 'express';
import cors from 'cors';
import router from './routes/index.ts';
import { prisma } from './lib/prisma.ts';
import { auth } from './lib/auth.ts';
import { toNodeHandler } from 'better-auth/node';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api', router);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
