import assert from 'node:assert/strict';
import test from 'node:test';
import { ALIEN_FRAME_COUNT, ALIEN_IDS, alienFrame, alienLook, shipLean } from './alienMotion.ts';

test('six board cuts rotate by row and level', () => {
  assert.deepEqual([...ALIEN_IDS], ['A1', 'B1', 'D1', 'E2', 'C4', 'E3']);
  assert.equal(alienLook(1, 0, 0), alienLook(1, 0, 9));
  assert.equal(alienLook(1, 1, 0), 1);
  assert.equal(alienLook(2, 0, 3), 1);
  const seen = new Set<number>();
  for (let level = 1; level <= 2; level += 1) {
    for (let row = 0; row < 5; row += 1) seen.add(alienLook(level, row, 0));
  }
  assert.equal(seen.size, ALIEN_IDS.length);
});

test('alien frames follow simulation time and hold still when time holds', () => {
  const first = alienFrame(1.25, 3, 4);
  assert.equal(alienFrame(1.25, 3, 4), first);
  assert.ok(first >= 0 && first < ALIEN_FRAME_COUNT);
  const later = alienFrame(1.25 + 0.7, 3, 4);
  assert.notEqual(later, first);
  const paused = alienFrame(1.25, 3, 4);
  assert.equal(paused, first);
});

test('ship lean follows horizontal intent and ignores a cancelled pair', () => {
  assert.equal(shipLean(false, false), 0);
  assert.equal(shipLean(true, true), 0);
  assert.equal(shipLean(true, false), -1);
  assert.equal(shipLean(false, true), 1);
});
