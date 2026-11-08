import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEVEL_TRACKS,
  MENU_TRACK,
  initialPlayback,
  musicAssetUrl,
  reducePlayback,
  trackForLevel,
} from './music.ts';

test('level tracks cycle 02, 03, 04 and never use the menu theme', () => {
  assert.equal(trackForLevel(1), '02_voo_hiperespaco.mp3');
  assert.equal(trackForLevel(2), '03_combate_enxame.mp3');
  assert.equal(trackForLevel(3), '04_chefe_nave_mae.mp3');
  assert.equal(trackForLevel(4), '02_voo_hiperespaco.mp3');
  assert.equal(trackForLevel(6), '04_chefe_nave_mae.mp3');
  for (let level = 1; level <= 12; level += 1) {
    assert.equal(trackForLevel(level), LEVEL_TRACKS[(level - 1) % 3]);
    assert.notEqual(trackForLevel(level), MENU_TRACK);
  }
});

test('music urls survive a deployment base path', () => {
  assert.equal(musicAssetUrl(MENU_TRACK, '/'), '/musica/01_menu_starfield.mp3');
  assert.equal(musicAssetUrl(LEVEL_TRACKS[0], '/game/'), '/game/musica/02_voo_hiperespaco.mp3');
});

test('one player restarts only when the track or the run changes', () => {
  let state = initialPlayback();
  let step = reducePlayback(state, { type: 'menu' });
  state = step.state;
  assert.equal(step.restart, true);
  assert.equal(state.token, 1);
  step = reducePlayback(state, { type: 'menu' });
  assert.equal(step.restart, false);
  assert.equal(step.state.token, 1);

  step = reducePlayback(step.state, { type: 'level', level: 1, epoch: 1 });
  state = step.state;
  assert.equal(step.restart, true);
  assert.equal(state.track, '02_voo_hiperespaco.mp3');
  const held = reducePlayback(state, { type: 'level', level: 1, epoch: 1 });
  assert.equal(held.restart, false);
  assert.equal(held.state.token, state.token);

  const next = reducePlayback(state, { type: 'level', level: 2, epoch: 1 });
  assert.equal(next.restart, true);
  assert.equal(next.state.track, '03_combate_enxame.mp3');
  const retry = reducePlayback(state, { type: 'level', level: 1, epoch: 2 });
  assert.equal(retry.restart, true);
  assert.equal(retry.state.track, state.track);

  const muted = reducePlayback(next.state, { type: 'mute', muted: true });
  assert.equal(muted.restart, false);
  assert.equal(muted.state.muted, true);
  const quieter = reducePlayback(muted.state, { type: 'volume', volume: 0.4 });
  assert.equal(quieter.restart, false);
  assert.equal(quieter.state.volume, 0.4);
  const paused = reducePlayback(quieter.state, { type: 'pause' });
  assert.equal(paused.state.paused, true);
  assert.equal(paused.restart, false);
  const stopped = reducePlayback(paused.state, { type: 'stop' });
  assert.equal(stopped.state.mode, 'off');
  assert.equal(stopped.state.track, null);
});
