import { Router } from 'express';
import * as lp from '../services/lpagent.js';

export const positionsRouter = Router();

positionsRouter.get('/open', async (req, res) => {
  const owner = req.query.owner as string;
  if (!owner) {
    res.status(400).json({ success: false, error: 'owner query param required' });
    return;
  }
  try {
    const data = await lp.getOpenPositions(owner);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[positions/open]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

positionsRouter.get('/overview', async (req, res) => {
  const owner = req.query.owner as string;
  if (!owner) {
    res.status(400).json({ success: false, error: 'owner query param required' });
    return;
  }
  try {
    const data = await lp.getPortfolioOverview(owner);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[positions/overview]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

positionsRouter.get('/history', async (req, res) => {
  const owner = req.query.owner as string;
  if (!owner) {
    res.status(400).json({ success: false, error: 'owner query param required' });
    return;
  }
  try {
    const data = await lp.getHistoricalPositions(owner);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[positions/history]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

positionsRouter.get('/revenue', async (req, res) => {
  const owner = req.query.owner as string;
  if (!owner) {
    res.status(400).json({ success: false, error: 'owner query param required' });
    return;
  }
  try {
    const data = await lp.getRevenue(owner);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[positions/revenue]', err);
    res.status(500).json({ success: false, error: String(err) });
  }
});
