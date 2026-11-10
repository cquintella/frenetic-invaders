import assert from 'node:assert/strict';
import test from 'node:test';
import { GameEngine } from './engine.ts';
import { intermissionAdvanceKey } from './intermission.ts';

test('a held or repeated Space does not leave the interval; a new press does', () => {
  const held = { code: 'Space', repeat: false, paused: false, armed: false };
  assert.equal(intermissionAdvanceKey(held), false);
  assert.equal(intermissionAdvanceKey({ ...held, repeat: true, armed: true }), false);
  assert.equal(intermissionAdvanceKey({ ...held, armed: true, paused: true }), false);
  assert.equal(intermissionAdvanceKey({ code: 'Enter', repeat: false, paused: false, armed: true }), false);
  assert.equal(intermissionAdvanceKey({ code: 'Space', repeat: false, paused: false, armed: true }), true);
});

test('clearing a wave waits, and the next press starts the next level', () => {
  const engine = new GameEngine();
  engine.start();
  engine.world.twin = 1;
  engine.world.shield = 3;
  engine.world.wingShots = 4;
  engine.world.wings = [{ offsetX: -36, x: 0, y: 0, width: 24, height: 18 }];
  const score = engine.world.score;
  for (const invader of engine.world.invaders) invader.alive = false;
  const last = engine.world.invaders[0];
  if (!last) throw new Error('missing invader');
  last.alive = true;
  engine.world.enemyBullets.push({
    x: 10, y: 10, width: 4, height: 12, active: true, speed: 200, owner: 'enemy',
  });
  engine.world.bombs.push({
    x: 10, y: 10, width: 20, height: 20, active: true, speed: 80, exploding: false, explosionTimer: 0,
  });
  engine.world.bullets.push({
    x: last.x, y: last.y, width: last.width, height: last.height, active: true, speed: 0, owner: 'player',
  });
  engine.setKey('Space', true);
  engine.update(1 / 60);
  assert.equal(engine.world.bannerLevel, 1);
  assert.equal(engine.world.level, 1);
  assert.equal(engine.isKeyDown('Space'), true);
  assert.equal(intermissionAdvanceKey({
    code: 'Space', repeat: false, paused: false, armed: !engine.isKeyDown('Space'),
  }), false);
  assert.equal(engine.world.bullets.length, 0);
  assert.equal(engine.world.enemyBullets.length, 0);
  assert.equal(engine.world.bombs.length, 0);
  assert.equal(engine.world.twin, 1);
  assert.equal(engine.world.wingShots, 4);
  assert.equal(engine.world.shield, 3);
  assert.equal(engine.world.wings.length, 1);
  assert.ok(engine.world.score >= score);
  const time = engine.world.time;
  const x = engine.world.player.x;
  engine.setKey('ArrowRight', true);
  engine.update(1);
  assert.equal(engine.world.time, time);
  assert.equal(engine.world.player.x, x);
  assert.equal(engine.world.level, 1);
  assert.equal(engine.world.shield, 3);
  assert.equal(intermissionAdvanceKey({ code: 'Space', repeat: false, paused: false, armed: true }), true);
  engine.advance();
  assert.equal(engine.world.level, 2);
  assert.equal(engine.world.bannerLevel, null);
  assert.equal(engine.world.twin, 1);
  assert.equal(engine.world.wingShots, 4);
  assert.equal(engine.world.shield, 3);
  assert.ok(engine.world.invaders.some((invader) => invader.alive));
});
