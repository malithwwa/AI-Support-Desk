import express from 'express';
import cors from 'cors';
import router from './routes/index.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
