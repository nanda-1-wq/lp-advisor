import { Router } from 'express';
import * as lp from '../services/lpagent.js';

export const transactionsRouter = Router();

// Generate unsigned zap-in transactions
transactionsRouter.post('/zap-in', async (req, res) => {
  try {
    const { poolId, ...body } = req.body as {
      poolId: string;
      stratergy: string;
      inputSOL: number;
      percentX: number;
      fromBinId: number;
      toBinId: number;
      owner: string;
      slippage_bps?: number;
    };
    if (!poolId) {
      res.status(400).json({ success: false, error: 'poolId required' });
      return;
    }
    const data = await lp.generateZapInTxForPool(poolId, {
      ...body,
      slippage_bps: body.slippage_bps ?? 500,
      mode: 'zap-in',
    });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[tx/zap-in]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Submit signed zap-in via Jito
transactionsRouter.post('/submit-zap-in', async (req, res) => {
  try {
    const data = await lp.submitZapIn(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[tx/submit-zap-in]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Get zap-out preview quote
transactionsRouter.post('/zap-out-quote', async (req, res) => {
  try {
    const data = await lp.getZapOutQuotes(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[tx/zap-out-quote]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Generate unsigned zap-out transactions
transactionsRouter.post('/zap-out', async (req, res) => {
  try {
    const data = await lp.generateZapOutTx(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[tx/zap-out]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Submit signed zap-out via Jito
transactionsRouter.post('/submit-zap-out', async (req, res) => {
  try {
    const data = await lp.submitZapOut(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[tx/submit-zap-out]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});
