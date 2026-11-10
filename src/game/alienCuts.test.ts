import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { ALIEN_IDS } from './alienMotion.ts';

test('the four enemy ships are RGBA pngs and the monsters are not packed', () => {
  assert.equal(ALIEN_IDS.length, 4);
  const packed = readdirSync(new URL('../../public/sprites/aliens/', import.meta.url))
    .filter((name) => name.endsWith('.png'))
    .sort();
  assert.deepEqual(packed, [...ALIEN_IDS].map((id) => `${id}.png`).sort());
  for (const id of ALIEN_IDS) {
    const buf = readFileSync(new URL(`../../public/sprites/aliens/${id}.png`, import.meta.url));
    assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', id);
    assert.ok(buf.length > 1000, id);
    // IHDR color type 6 is truecolor with alpha.
    assert.equal(buf[25], 6, id);
  }
});
