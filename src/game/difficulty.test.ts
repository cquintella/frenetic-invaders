import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GameEngine } from './engine.ts';
import {
  BUILTIN_DIFFICULTY,
  difficultyFromUnknown,
  installDifficulty,
  installedDifficulty,
  loadDifficultyConfig,
  resolveLevel,
} from './difficulty.ts';

test('the shipped difficulty file matches the built-in numbers', () => {
  const text = readFileSync(new URL('../../public/config/difficulty.json', import.meta.url), 'utf8');
  const parsed = difficultyFromUnknown(JSON.parse(text));
  assert.deepEqual(parsed.warnings, []);
  assert.deepEqual(parsed.file, BUILTIN_DIFFICULTY);
});

test('a missing or unreadable file keeps the built-in numbers', async () => {
  const missing = await loadDifficultyConfig(async () => new Response('', { status: 404 }));
  assert.equal(missing.warnings.length, 1);
  assert.equal(missing.file.shots.rateBase, BUILTIN_DIFFICULTY.shots.rateBase);

  const broken = await loadDifficultyConfig(async () => new Response('not-json', { status: 200 }));
  assert.equal(broken.warnings.length, 1);
  assert.equal(broken.file.shots.maxAliveMax, BUILTIN_DIFFICULTY.shots.maxAliveMax);
});

test('invalid fields fall back or clamp and a level override wins', () => {
  const parsed = difficultyFromUnknown({
    shots: { rateBase: 'fast', maxAliveBase: 40 },
    levels: { '9': { maxAlive: 2 }, nope: { maxAlive: 1 } },
  });
  assert.ok(parsed.warnings.length >= 2);
  assert.equal(parsed.file.shots.rateBase, BUILTIN_DIFFICULTY.shots.rateBase);
  assert.equal(parsed.file.shots.maxAliveBase, 8);
  assert.equal(resolveLevel(parsed.file, 9).maxAlive, 2);
  assert.notEqual(resolveLevel(parsed.file, 8).maxAlive, 2);
});

test('shot pressure still rises after level 6, and more slowly', () => {
  const first = resolveLevel(BUILTIN_DIFFICULTY, 1);
  const knee = resolveLevel(BUILTIN_DIFFICULTY, 6);
  const later = resolveLevel(BUILTIN_DIFFICULTY, 12);
  assert.ok(first.shotRate < knee.shotRate);
  assert.ok(knee.shotRate < later.shotRate);
  assert.ok(later.shotRate - knee.shotRate < knee.shotRate - first.shotRate);
  assert.ok(later.maxAlive >= knee.maxAlive);
  assert.ok(later.maxAlive <= 6);
  assert.equal(first.volley, 1);
  assert.equal(later.volley, 1);
});

test('enemy shots stay under the cap and a long step is not a volley', () => {
  const previous = installedDifficulty();
  const tuned = difficultyFromUnknown({
    shots: {
      rateBase: 12,
      ratePerLevel: 0,
      ratePerLevelAfterKnee: 0,
      rateMax: 12,
      maxAliveBase: 2,
      maxAlivePerLevel: 0,
      maxAliveMax: 2,
      volley: 1,
    },
  });
  installDifficulty(tuned.file);
  try {
    const engine = new GameEngine();
    engine.start();
    let peak = 0;
    for (let i = 0; i < 240; i += 1) {
      engine.update(1 / 60);
      const alive = engine.world.enemyBullets.filter((bullet) => bullet.active).length;
      if (alive > peak) peak = alive;
    }
    assert.ok(peak >= 1);
    assert.ok(peak <= 2);

    engine.world.enemyBullets = [];
    engine.update(2);
    const dumped = engine.world.enemyBullets.filter((bullet) => bullet.active).length;
    assert.ok(dumped <= 1);
  } finally {
    installDifficulty(previous);
  }
});
