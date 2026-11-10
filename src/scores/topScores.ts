export const TOP_SCORE_LIMIT = 100;

export const CREATE_SCORES_SQL = `
  CREATE TABLE IF NOT EXISTS high_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

/** Highest scores only. Older rows stay in the table. */
export const TOP_SCORES_SQL =
  'SELECT id, name, score, level, created_at FROM high_scores ORDER BY score DESC, id ASC LIMIT ?';

export interface ScoreRow {
  id: number;
  name: string;
  score: number;
  level: number;
  created_at?: string;
}

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Descending numeric score. Equal scores keep the earlier id ahead. */
export function compareScores(a: { id?: number; score: unknown }, b: { id?: number; score: unknown }): number {
  const delta = asNumber(b.score) - asNumber(a.score);
  if (delta !== 0) return delta;
  return asNumber(a.id) - asNumber(b.id);
}

export function rankScores<T extends { id?: number; score: unknown }>(
  rows: readonly T[],
  limit = TOP_SCORE_LIMIT
): T[] {
  return [...rows].sort(compareScores).slice(0, Math.max(0, limit));
}
