import assert from 'node:assert/strict';
import test from 'node:test';
import { ALIEN_FRAMES, PLAYER_COLS, PLAYER_MAP, PLAYER_ROWS, SHIP_INK_PX, WING_MAP, celShade } from './sprites.ts';

test('ship ink stays a single pixel and cel shading keeps the silhouette', () => {
  assert.equal(SHIP_INK_PX, 1);
  assert.equal(PLAYER_MAP.length, PLAYER_COLS * PLAYER_ROWS);
  assert.equal(WING_MAP.length, 48);
  for (const frames of ALIEN_FRAMES) {
    for (const map of frames) {
      const shaded = celShade(map);
      assert.equal(shaded.length, 64);
      shaded.forEach((value, index) => {
        assert.equal(value === 0, map[index] === 0);
      });
      assert.ok(shaded.some((value) => value === 2));
      assert.ok(shaded.some((value) => value === 3));
    }
  }
});
