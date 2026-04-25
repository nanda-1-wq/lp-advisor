// Load .env FIRST, before any other import reads process.env.
// override:true ensures .env values win over stale shell variables.
import { config as loadEnv } from 'dotenv';
loadEnv({ override: true });

import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { poolsRouter } from './routes/pools.js';
import { positionsRouter } from './routes/positions.js';
import { transactionsRouter } from './routes/transactions.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));
app.use(express.json());

app.use('/api/chat', chatRouter);
app.use('/api/pools', poolsRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/tx', transactionsRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mockMode: process.env.USE_MOCK !== 'false',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  const groqKey = process.env.GROQ_API_KEY ?? '';
  const isMock = process.env.USE_MOCK !== 'false';
  console.log(`\n  LP Advisor backend → http://localhost:${PORT}`);
  console.log(`  Data mode:     ${isMock ? '🟡 MOCK (USE_MOCK != false)' : '🟢 REAL LPAgent API'}`);
  console.log(`  Groq key:      ${groqKey ? '✓ set' : '✗ MISSING — chat will fail'}`);
  console.log(`  LP Agent key:  ${process.env.LPAGENT_API_KEY ? '✓ set' : '✗ missing — real API calls will fail'}\n`);
});
