import { Router } from 'express';
import * as lp from '../services/lpagent.js';

export const poolsRouter = Router();

poolsRouter.get('/discover', async (req, res) => {
  try {
    const data = await lp.discoverPools(req.query as Record<string, string>);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[pools/discover]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

poolsRouter.get('/:poolId/info', async (req, res) => {
  try {
    const data = await lp.getPoolInfo(req.params.poolId);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[pools/info]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

poolsRouter.get('/:poolId/stats', async (req, res) => {
  try {
    const data = await lp.getPoolStats(req.params.poolId);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[pools/stats]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});
