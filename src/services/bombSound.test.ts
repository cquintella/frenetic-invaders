import assert from 'node:assert/strict';
import test from 'node:test';
import { SMALL_EXPLOSION, bombSoundLayers } from './bombSound.ts';

test('bomb sound has a short attack, a midrange body and a longer tail than a small explosion', () => {
  const layers = bombSoundLayers();
  const crack = layers.find((layer) => layer.id === 'crack');
  const punch = layers.find((layer) => layer.id === 'punch');
  const body = layers.find((layer) => layer.id === 'body');
  const sub = layers.find((layer) => layer.id === 'sub');
  const rumble = layers.find((layer) => layer.id === 'rumble');
  assert.ok(crack && crack.kind === 'noise' && crack.dur < 0.12);
  assert.ok(punch && punch.kind === 'noise' && punch.filterHz >= 500);
  assert.ok(body && body.kind === 'tone' && body.freq >= 120 && body.slideTo < body.freq);
  assert.ok(sub && sub.freq < 80);
  assert.ok(rumble && rumble.dur > SMALL_EXPLOSION.dur);
  assert.ok(Math.max(...layers.map((layer) => layer.gain)) <= 0.7);
});
