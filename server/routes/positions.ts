import { Router } from 'express';
import * as lp from '../services/lpagent.js';

export const positionsRouter = Router();

/** Coerce whatever the real API returns into an array. */
function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    // common wrappers: { data: [...] }, { positions: [...] }, { result: [...] }
    for (const key of ['data', 'positions', 'result', 'items', 'list']) {
      if (Array.isArray(r[key])) return r[key] as unknown[];
    }
  }
  return [];
}

positionsRouter.get('/open', async (req, res) => {
  const owner = req.query.owner as string;
  if (!owner) {
    res.status(400).json({ success: false, error: 'owner query param required' });
    return;
  }
  try {
    const raw = await lp.getOpenPositions(owner);
    console.log('[positions/open] raw response type:', typeof raw, Array.isArray(raw) ? 'array' : JSON.stringify(raw).slice(0, 200));
    const data = toArray(raw);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[positions/open] error:', err);
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
    const raw = await lp.getPortfolioOverview(owner);
    console.log('[positions/overview] raw:', JSON.stringify(raw).slice(0, 200));
    // overview is a single object; unwrap { data: {...} } if needed
    const data = (raw && typeof raw === 'object' && 'data' in (raw as object))
      ? (raw as Record<string, unknown>).data
      : raw;
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    console.error('[positions/overview] error:', err);
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
    const raw = await lp.getHistoricalPositions(owner);
    console.log('[positions/history] raw response type:', typeof raw, Array.isArray(raw) ? 'array' : JSON.stringify(raw).slice(0, 200));
    const data = toArray(raw);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[positions/history] error:', err);
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
