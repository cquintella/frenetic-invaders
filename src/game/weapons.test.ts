import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  WING_BOMB_RADIUS,
  WING_COOLDOWN,
  WING_HEIGHT,
  WING_LEFT,
  WING_RIGHT,
  WING_SHOTS,
  WING_WIDTH,
} from './constants.ts';
import { GameEngine } from './engine.ts';
import type { Ufo, WingCannon } from './types.ts';

function quiet(engine: GameEngine): void {
  engine.world.invaders = [];
  engine.world.ufo = {
    x: -200,
    y: 0,
    width: 10,
    height: 10,
    active: false,
    speed: 0,
    points: 0,
    trail: [],
    phase: 0,
    bob: 0,
    age: 0,
  } satisfies Ufo;
}

function wing(offsetX: number): WingCannon {
  return { offsetX, x: 0, y: 0, width: WING_WIDTH, height: WING_HEIGHT };
}

test('paired side cannons spend one shared charge per volley and stop after six', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.wings = [wing(WING_LEFT), wing(WING_RIGHT)];
  engine.world.wingShots = WING_SHOTS;
  engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingShots, 5);
  assert.equal(engine.world.wingBombs.length, 2);
  assert.equal(engine.world.wings.length, 2);
  for (let i = 0; i < 5; i += 1) engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingShots, 0);
  assert.equal(engine.world.wings.length, 0);
  engine.world.wingBombs = [];
  engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingBombs.length, 0);
});

test('a single side cannon also spends one charge and does not fire plasma', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.wings = [wing(WING_LEFT)];
  engine.world.wingShots = WING_SHOTS;
  engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingShots, 5);
  assert.equal(engine.world.wingBombs.length, 1);
  assert.equal(engine.world.bullets.length, 0);
});

test('pickup mounts left, then right, and only refills once both are aboard', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  const drop = () => {
    engine.world.pickups.push({
      x: engine.world.player.x,
      y: engine.world.player.y,
      width: 10,
      height: 10,
      active: true,
      kind: 'wing',
      vy: 0,
    });
    engine.update(1 / 60);
  };
  drop();
  assert.equal(engine.world.wings.length, 1);
  assert.equal(engine.world.wingShots, 6);
  engine.world.wingShots = 3;
  drop();
  assert.equal(engine.world.wings.length, 2);
  assert.equal(engine.world.wingShots, 3);
  drop();
  assert.equal(engine.world.wings.length, 2);
  assert.equal(engine.world.wingShots, 6);
});

test('wing bomb damage is a single radius check', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  const origin = { x: 300, y: 200, width: 40, height: 30, type: 1, points: 20, alive: true, homeX: 300, homeY: 200, dive: null };
  const neighbor = { ...origin, x: 300 + 36, homeX: 336 };
  const outside = { ...origin, x: 300 + WING_BOMB_RADIUS + 70, homeX: 500 };
  engine.world.invaders = [origin, neighbor, outside];
  engine.world.wingBombs.push({
    x: origin.x + 8,
    y: origin.y + 4,
    width: 12,
    height: 16,
    active: true,
    speed: 0,
  });
  engine.update(1 / 60);
  assert.equal(origin.alive, false);
  assert.equal(neighbor.alive, false);
  assert.equal(outside.alive, true);
  const late = { ...origin, x: origin.x, alive: true, homeX: origin.x };
  engine.world.invaders.push(late);
  for (let i = 0; i < 20; i += 1) engine.update(1 / 60);
  assert.equal(late.alive, true);
});

test('double plasma ignores time and level changes, and drops only on a real hit', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.twin = 1;
  engine.world.wings = [];
  engine.world.wingShots = 0;
  for (let i = 0; i < 30; i += 1) engine.update(1);
  assert.equal(engine.world.twin, 1);
  engine.world.wingShots = 4;
  engine.world.wings = [wing(WING_LEFT)];
  engine.world.bannerLevel = engine.world.level;
  engine.advance();
  assert.equal(engine.world.level, 2);
  assert.equal(engine.world.twin, 1);
  assert.equal(engine.world.wingShots, 4);
  assert.equal(engine.world.wings.length, 1);

  engine.world.iframe = 1;
  engine.world.shield = 3;
  engine.world.enemyBullets.push({
    x: engine.world.player.x,
    y: engine.world.player.y,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    owner: 'enemy',
  });
  engine.update(1 / 60);
  assert.equal(engine.world.twin, 1);
  assert.equal(engine.world.shield, 3);

  engine.world.iframe = 0;
  engine.world.enemyBullets.push({
    x: engine.world.player.x,
    y: engine.world.player.y,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    owner: 'enemy',
  });
  engine.update(1 / 60);
  assert.equal(engine.world.twin, 0);
  assert.equal(engine.world.shield, 2);
  assert.equal(engine.world.wings.length, 0);

  engine.world.twin = 1;
  engine.start();
  assert.equal(engine.world.twin, 0);
  assert.equal(engine.world.wingShots, 0);
});

test('player plasma keeps the original bullet box', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.twin = 1;
  engine.setKey('Space', true);
  engine.update(1 / 60);
  assert.equal(engine.world.bullets.length, 2);
  for (const bullet of engine.world.bullets) {
    assert.equal(bullet.width, BULLET_WIDTH);
    assert.equal(bullet.height, BULLET_HEIGHT);
    assert.equal(bullet.owner, 'player');
  }
});
