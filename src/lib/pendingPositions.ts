import type { Position, HistoricalPosition } from './types';

const KEY = 'lp_pending_positions';
const CLOSED_KEY = 'lp_closed_positions';

function readRaw(): Position[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch {
    return [];
  }
}

export function getPendingPositions(): Position[] {
  return readRaw();
}

export function getPendingAddresses(): Set<string> {
  return new Set(readRaw().map((p) => p.positionAddress));
}

export function savePendingPosition(pos: Position): void {
  const existing = readRaw().filter((p) => p.positionAddress !== pos.positionAddress);
  localStorage.setItem(KEY, JSON.stringify([...existing, pos]));
}

export function removePendingPosition(positionAddress: string): void {
  const updated = readRaw().filter((p) => p.positionAddress !== positionAddress);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

// ── Closed positions (Zap-Out) ────────────────────────────────────────────────

function readClosed(): HistoricalPosition[] {
  try {
    const raw = localStorage.getItem(CLOSED_KEY);
    return raw ? (JSON.parse(raw) as HistoricalPosition[]) : [];
  } catch {
    return [];
  }
}

export function saveClosedPosition(pos: HistoricalPosition): void {
  const existing = readClosed().filter((p) => p.positionAddress !== pos.positionAddress);
  localStorage.setItem(CLOSED_KEY, JSON.stringify([...existing, pos]));
}

export function getClosedPositions(): HistoricalPosition[] {
  return readClosed();
}

export function getClosedAddresses(): Set<string> {
  return new Set(readClosed().map((p) => p.positionAddress));
}
