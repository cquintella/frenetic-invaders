import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILTIN_BACKGROUNDS,
  backgroundForLevel,
  coverRect,
} from './backgrounds.ts';
import { BUILTIN_DIFFICULTY, difficultyFromUnknown } from './difficulty.ts';

test('levels cycle bg1, bg2, bg3 and then repeat', () => {
  assert.deepEqual(BUILTIN_DIFFICULTY.backgrounds, [...BUILTIN_BACKGROUNDS]);
  assert.equal(backgroundForLevel(1), 'backgrounds/bg1-nebula-purple.webp');
  assert.equal(backgroundForLevel(2), 'backgrounds/bg2-golden-galaxy.webp');
  assert.equal(backgroundForLevel(3), 'backgrounds/bg3-blue-nebula.webp');
  assert.equal(backgroundForLevel(4), backgroundForLevel(1));
  assert.equal(backgroundForLevel(5), backgroundForLevel(2));
  assert.equal(backgroundForLevel(6), backgroundForLevel(3));
  assert.equal(backgroundForLevel(0), backgroundForLevel(1));
  assert.equal(backgroundForLevel(Number.NaN), backgroundForLevel(1));

  const custom = ['plates/a.webp', 'plates/b.webp'];
  assert.equal(backgroundForLevel(1, custom), 'plates/a.webp');
  assert.equal(backgroundForLevel(2, custom), 'plates/b.webp');
  assert.equal(backgroundForLevel(3, custom), 'plates/a.webp');
  assert.equal(backgroundForLevel(1, []), null);
});

test('a bad backgrounds list falls back and a usable list is kept', () => {
  const missing = difficultyFromUnknown({});
  assert.deepEqual(missing.file.backgrounds, [...BUILTIN_BACKGROUNDS]);
  assert.deepEqual(missing.warnings, []);

  const broken = difficultyFromUnknown({ backgrounds: 'purple' });
  assert.deepEqual(broken.file.backgrounds, [...BUILTIN_BACKGROUNDS]);
  assert.ok(broken.warnings.some((warning) => warning.includes('backgrounds')));

  const empty = difficultyFromUnknown({ backgrounds: [12, '../secret.webp', ''] });
  assert.deepEqual(empty.file.backgrounds, [...BUILTIN_BACKGROUNDS]);
  assert.ok(empty.warnings.length >= 2);

  const custom = difficultyFromUnknown({ backgrounds: ['/backgrounds/only.webp', 4] });
  assert.deepEqual(custom.file.backgrounds, ['backgrounds/only.webp']);
  assert.equal(backgroundForLevel(2, custom.file.backgrounds), 'backgrounds/only.webp');
});

test('the plate covers the canvas with one scale on both axes', () => {
  const portrait = coverRect(766, 2752, 800, 600);
  assert.ok(portrait.x <= 0 && portrait.y <= 0);
  assert.ok(portrait.x + portrait.w >= 800 - 1e-6);
  assert.ok(portrait.y + portrait.h >= 600 - 1e-6);
  assert.ok(Math.abs(portrait.w / 766 - portrait.h / 2752) < 1e-9);

  const plate = coverRect(1600, 1200, 800, 600);
  assert.equal(plate.x, 0);
  assert.equal(plate.y, 0);
  assert.equal(plate.w, 800);
  assert.equal(plate.h, 600);

  const hidpi = coverRect(1600, 1200, 1600, 1200);
  assert.equal(hidpi.w, 1600);
  assert.equal(hidpi.h, 1200);
});
