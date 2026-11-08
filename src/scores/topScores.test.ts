import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { CREATE_SCORES_SQL, TOP_SCORE_LIMIT, TOP_SCORES_SQL, rankScores } from './topScores.ts';

test('rankScores orders numerically and caps at 100 without dropping the source list', () => {
  const rows = Array.from({ length: 130 }, (_, index) => ({
    id: index + 1,
    name: `FIXTURE-${index + 1}`,
    score: index + 1,
    level: 1,
  }));
  rows.push({ id: 999, name: 'FIXTURE-TIE', score: 50, level: 2 });
  const ranked = rankScores(rows);
  assert.equal(rows.length, 131);
  assert.equal(ranked.length, TOP_SCORE_LIMIT);
  assert.equal(ranked[0]?.score, 130);
  assert.equal(ranked[1]?.score, 129);
  assert.ok(ranked.every((row, index) => index === 0 || Number(row.score) <= Number(ranked[index - 1]?.score)));
  const ties = ranked.filter((row) => row.score === 50);
  assert.deepEqual(ties.map((row) => row.id), [50, 999]);
  assert.equal(ranked.some((row) => row.score === 1), false);
});

test('sqlite keeps every row and returns only the top 100', () => {
  const db = new Database(':memory:');
  db.exec(CREATE_SCORES_SQL);
  const insert = db.prepare('INSERT INTO high_scores (name, score, level) VALUES (?, ?, ?)');
  for (let score = 1; score <= 120; score += 1) {
    insert.run(`FIXTURE-${score}`, score, score % 7);
  }
  insert.run('FIXTURE-LOW', 0, 1);
  const top = db.prepare(TOP_SCORES_SQL).all(TOP_SCORE_LIMIT) as { score: number; name: string }[];
  const kept = db.prepare('SELECT COUNT(*) AS total FROM high_scores').get() as { total: number };
  assert.equal(kept.total, 121);
  assert.equal(top.length, 100);
  assert.equal(top[0]?.score, 120);
  assert.equal(top[99]?.score, 21);
  assert.equal(top.some((row) => row.name === 'FIXTURE-LOW'), false);
  db.close();
});
