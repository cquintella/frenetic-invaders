import assert from 'node:assert/strict';
import test from 'node:test';
import { PAUSE_CONTINUE, PAUSE_TITLE, frameStep, gameplayKeyAllowed, pauseKeyAccepted } from './pause.ts';
import { initialPlayback, reducePlayback } from '../services/music.ts';
import { GameEngine } from './engine.ts';

test('the pause screen says Press P to continue', () => {
  assert.equal(PAUSE_TITLE, 'PAUSED');
  assert.equal(PAUSE_CONTINUE, 'Press P to continue');
});

test('P toggles only during play and ignores repeats and text fields', () => {
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: 'BODY', screen: 'PLAYING' }), true);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: true, targetTag: 'BODY', screen: 'PLAYING' }), false);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: 'INPUT', screen: 'PLAYING' }), false);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: 'TEXTAREA', screen: 'START' }), false);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: null, screen: 'START' }), false);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: null, screen: 'GAME_OVER' }), false);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: false, targetTag: 'BODY', screen: 'LEVEL_UP' }), true);
  assert.equal(pauseKeyAccepted({ code: 'KeyP', repeat: true, targetTag: 'BODY', screen: 'LEVEL_UP' }), false);
  assert.equal(pauseKeyAccepted({ code: 'Space', repeat: false, targetTag: null, screen: 'PLAYING' }), false);
  assert.equal(pauseKeyAccepted({ code: 'Space', repeat: false, targetTag: null, screen: 'LEVEL_UP' }), false);
  assert.equal(gameplayKeyAllowed(true, 'BODY'), false);
  assert.equal(gameplayKeyAllowed(false, 'INPUT'), false);
  assert.equal(gameplayKeyAllowed(false, 'BODY'), true);
});

test('a paused clock does not feed the sim and resume drops the gap', () => {
  let last = 1_000;
  const held = frameStep(last, last + 5_000, true);
  assert.equal(held.dt, 0);
  assert.equal(held.last, 6_000);
  const again = frameStep(held.last, held.last + 4_000, true);
  assert.equal(again.dt, 0);
  const resumed = frameStep(again.last, again.last + 16, false);
  assert.ok(resumed.dt > 0);
  assert.ok(resumed.dt < 0.05);
  const burst = frameStep(1_000, 1_000 + 5_000, false);
  assert.equal(burst.dt, 0.1);
});

test('pause keeps the track, mute and volume and does not restart', () => {
  let state = reducePlayback(initialPlayback(), { type: 'level', level: 2, epoch: 3 }).state;
  state = reducePlayback(state, { type: 'mute', muted: true }).state;
  state = reducePlayback(state, { type: 'volume', volume: 0.35 }).state;
  const token = state.token;
  const paused = reducePlayback(state, { type: 'pause' });
  assert.equal(paused.restart, false);
  assert.equal(paused.state.paused, true);
  assert.equal(paused.state.track, state.track);
  assert.equal(paused.state.muted, true);
  assert.equal(paused.state.volume, 0.35);
  assert.equal(paused.state.token, token);
  const resumed = reducePlayback(paused.state, { type: 'resume' });
  assert.equal(resumed.restart, false);
  assert.equal(resumed.state.paused, false);
  assert.equal(resumed.state.muted, true);
  assert.equal(resumed.state.volume, 0.35);
  assert.equal(resumed.state.track, state.track);
});

test('the world does not advance while the caller withholds updates', () => {
  const engine = new GameEngine();
  engine.start();
  engine.setKey('Space', true);
  engine.setKey('ArrowRight', true);
  const before = JSON.stringify({
    x: engine.world.player.x,
    time: engine.world.time,
    score: engine.world.score,
    bullets: engine.world.bullets.length,
    bombs: engine.world.bombs.length,
  });
  engine.clearKeys();
  const after = JSON.stringify({
    x: engine.world.player.x,
    time: engine.world.time,
    score: engine.world.score,
    bullets: engine.world.bullets.length,
    bombs: engine.world.bombs.length,
  });
  assert.equal(after, before);
  assert.equal(engine.world.time, 0);
});
