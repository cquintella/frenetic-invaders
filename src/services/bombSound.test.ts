import assert from 'node:assert/strict';
import test from 'node:test';
import { SMALL_EXPLOSION, bombSoundLayers } from './bombSound.ts';

test('bomb sound has a short attack, a low body and a longer tail than a small explosion', () => {
  const layers = bombSoundLayers();
  const crack = layers.find((layer) => layer.id === 'crack');
  const body = layers.find((layer) => layer.id === 'body');
  const rumble = layers.find((layer) => layer.id === 'rumble');
  assert.ok(crack && crack.kind === 'noise' && crack.dur < 0.12);
  assert.ok(body && body.kind === 'tone' && body.slideTo < 40);
  assert.ok(rumble && rumble.dur > SMALL_EXPLOSION.dur);
  const peak = Math.max(...layers.map((layer) => layer.gain));
  assert.ok(peak <= 0.22);
  assert.ok(layers.reduce((sum, layer) => sum + layer.gain, 0) < 0.7);
});
