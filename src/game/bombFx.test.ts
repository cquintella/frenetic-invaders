import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPLOSION_RADIUS, EXPLOSION_TIME } from './constants.ts';
import { bombBlastRadius } from './bombFx.ts';
import { GameEngine } from './engine.ts';
import { soundService } from '../services/soundService.ts';

test('enemy bomb radius still grows from zero to the original cap', () => {
  assert.equal(bombBlastRadius(EXPLOSION_TIME), 0);
  assert.ok(Math.abs(bombBlastRadius(0) - EXPLOSION_RADIUS) < 1e-9);
  assert.ok(bombBlastRadius(EXPLOSION_TIME / 2) > 0);
  assert.ok(bombBlastRadius(EXPLOSION_TIME / 2) < EXPLOSION_RADIUS);
});

test('a shot detonates the enemy bomb once and the blast cleans up', () => {
  const random = Math.random;
  Math.random = () => 0.5;
  try {
  const engine = new GameEngine();
  engine.start();
  engine.world.invaders = [
    invader(190, 110),
    invader(190 + EXPLOSION_RADIUS + 80, 110),
  ];
  const near = engine.world.invaders[0];
  const far = engine.world.invaders[1];
  engine.world.bombs.push({
    x: 200,
    y: 120,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    exploding: false,
    explosionTimer: 0,
  });
  engine.world.bullets.push({
    x: 200,
    y: 120,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    owner: 'player',
  });
  const before = soundService.bombPlays;
  engine.update(1 / 60);
  assert.equal(engine.world.bombs[0]?.exploding, true);
  assert.equal(engine.world.blasts.length, 1);
  assert.equal(soundService.bombPlays, before + 1);
  engine.update(1 / 60);
  assert.equal(engine.world.blasts.length, 1);
  for (let i = 0; i < 80; i += 1) engine.update(1 / 60);
  assert.equal(near?.alive, false);
  assert.equal(far?.alive, true);
  assert.equal(engine.world.shield, 3);
  assert.equal(engine.world.over, false);
  for (let i = 0; i < 80; i += 1) engine.update(1 / 60);
  assert.equal(engine.world.blasts.length, 0);
  assert.equal(engine.world.particles.length, 0);
  assert.equal(engine.world.bombs.length, 0);
  } finally {
    Math.random = random;
  }
});

function invader(x: number, y: number) {
  return {
    x,
    y,
    width: 40,
    height: 30,
    type: 0,
    points: 30,
    alive: true,
    homeX: x,
    homeY: y,
    dive: null,
  };
}
