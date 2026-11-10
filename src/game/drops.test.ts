import assert from 'node:assert/strict';
import test from 'node:test';
import { PICKUP_KINDS, rollPickup } from './drops.ts';

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mix = Math.imul(state ^ (state >>> 15), 1 | state);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}

test('consecutive UFO drops are different kinds across many seeded rolls', () => {
  for (const seed of [1, 7, 42, 99, 2026]) {
    const random = mulberry32(seed);
    let previous: ReturnType<typeof rollPickup> | null = null;
    const counts = { wing: 0, twin: 0, shield: 0 };
    for (let draw = 0; draw < 240; draw += 1) {
      const next = rollPickup(random(), previous);
      if (previous !== null) assert.notEqual(next, previous, `seed ${seed} draw ${draw}`);
      counts[next] += 1;
      previous = next;
    }
    assert.ok(counts.wing > 0 && counts.twin > 0 && counts.shield > 0);
  }
});

test('the first drop uses the full weights and a single catalog falls back', () => {
  assert.equal(rollPickup(0), 'wing');
  assert.equal(rollPickup(0.4), 'twin');
  assert.equal(rollPickup(0.75), 'shield');
  assert.equal(rollPickup(0.99, 'wing'), 'shield');
  assert.equal(rollPickup(0, 'wing'), 'twin');
  assert.equal(rollPickup(0.2, 'shield', ['shield']), 'shield');
  assert.deepEqual([...PICKUP_KINDS], ['wing', 'twin', 'shield']);
});

test('after a wing, twin stays more likely than shield', () => {
  let twin = 0;
  let shield = 0;
  for (let step = 0; step < 1000; step += 1) {
    const kind = rollPickup(step / 1000, 'wing');
    if (kind === 'twin') twin += 1;
    if (kind === 'shield') shield += 1;
    assert.notEqual(kind, 'wing');
  }
  assert.ok(twin > shield);
  assert.equal(twin + shield, 1000);
});
