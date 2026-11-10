import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  EXPLOSION_RADIUS,
  PLASMA_GIRTH,
  PLASMA_WIDTH_SCALE,
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
  const speed = (4 + engine.world.level * 0.3) * 60;
  const launched = engine.world.bombs.filter((bomb) => bomb.owner === 'player');
  assert.equal(engine.world.wingShots, 5);
  assert.equal(launched.length, 2);
  assert.equal(launched[0]?.width, 20);
  assert.equal(launched[0]?.height, 20);
  assert.equal(launched[0]?.speed, -speed);
  assert.equal(engine.world.wings.length, 2);
  for (let i = 0; i < 5; i += 1) engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingShots, 0);
  assert.equal(engine.world.wings.length, 0);
  engine.world.bombs = [];
  engine.update(WING_COOLDOWN);
  assert.equal(engine.world.bombs.length, 0);
});

test('a single side cannon also spends one charge and does not fire plasma', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.wings = [wing(WING_LEFT)];
  engine.world.wingShots = WING_SHOTS;
  engine.update(WING_COOLDOWN);
  assert.equal(engine.world.wingShots, 5);
  assert.equal(engine.world.bombs.filter((bomb) => bomb.owner === 'player').length, 1);
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

test('side cannon bomb is the saucer bomb and does not hurt the ship', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  const origin = { x: 300, y: 200, width: 40, height: 30, type: 1, points: 20, alive: true, homeX: 300, homeY: 200, dive: null };
  const neighbor = { ...origin, x: 330, homeX: 330 };
  const outside = { ...origin, x: 300 + EXPLOSION_RADIUS + 80, homeX: 500 };
  engine.world.invaders = [origin, neighbor, outside];
  engine.world.shield = 3;
  engine.world.bombs.push({
    x: origin.x,
    y: origin.y,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    exploding: false,
    explosionTimer: 0,
    owner: 'player',
  });
  engine.update(1 / 60);
  const bomb = engine.world.bombs[0];
  assert.equal(bomb?.exploding, true);
  assert.equal(bomb?.owner, 'player');
  for (let i = 0; i < 50; i += 1) engine.update(1 / 60);
  assert.equal(origin.alive, false);
  assert.equal(neighbor.alive, false);
  assert.equal(outside.alive, true);
  assert.equal(engine.world.shield, 3);
  assert.equal(engine.world.over, false);
});

test('a cannon bomb below the ship does not detonate just for passing the hull', () => {
  const engine = new GameEngine();
  engine.start();
  quiet(engine);
  engine.world.bombs.push({
    x: engine.world.player.x,
    y: engine.world.player.y + 8,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    exploding: false,
    explosionTimer: 0,
    owner: 'player',
  });
  engine.world.bullets.push({
    x: engine.world.player.x,
    y: engine.world.player.y + 8,
    width: 20,
    height: 20,
    active: true,
    speed: 0,
    owner: 'player',
  });
  engine.update(1 / 60);
  assert.equal(engine.world.bombs[0]?.exploding, false);
  assert.equal(engine.world.bullets[0]?.active, true);
  const armed = engine.world.bombs[0];
  if (armed) {
    armed.exploding = true;
    armed.explosionTimer = 0.05;
  }
  engine.update(1 / 60);
  assert.equal(engine.world.shield, 3);
  assert.equal(engine.world.over, false);
});

test('plasma visual width is 40 percent of the previous girth', () => {
  assert.equal(PLASMA_WIDTH_SCALE, 0.4);
  assert.ok(Math.abs(PLASMA_GIRTH - 7.2 * 0.4) < 1e-9);
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
