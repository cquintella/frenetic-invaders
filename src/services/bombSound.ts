export interface SoundLayer {
  id: string;
  kind: 'noise' | 'tone';
  dur: number;
  gain: number;
  freq: number;
  slideTo: number;
  filter: 'lowpass' | 'bandpass' | 'highpass';
  filterHz: number;
  filterEndHz: number;
}

/**
 * Cinematic bomb that a laptop speaker can actually play.
 * The crack and the punch sit in the mid band. The sub and the rumble
 * are the tail, not the only energy.
 */
export function bombSoundLayers(): SoundLayer[] {
  return [
    {
      id: 'crack',
      kind: 'noise',
      dur: 0.07,
      gain: 0.48,
      freq: 0,
      slideTo: 0,
      filter: 'bandpass',
      filterHz: 2200,
      filterEndHz: 980,
    },
    {
      id: 'punch',
      kind: 'noise',
      dur: 0.32,
      gain: 0.62,
      freq: 0,
      slideTo: 0,
      filter: 'lowpass',
      filterHz: 880,
      filterEndHz: 180,
    },
    {
      id: 'body',
      kind: 'tone',
      dur: 0.42,
      gain: 0.36,
      freq: 168,
      slideTo: 72,
      filter: 'lowpass',
      filterHz: 420,
      filterEndHz: 140,
    },
    {
      id: 'sub',
      kind: 'tone',
      dur: 0.9,
      gain: 0.16,
      freq: 58,
      slideTo: 30,
      filter: 'lowpass',
      filterHz: 120,
      filterEndHz: 70,
    },
    {
      id: 'rumble',
      kind: 'noise',
      dur: 1.05,
      gain: 0.26,
      freq: 0,
      slideTo: 0,
      filter: 'lowpass',
      filterHz: 340,
      filterEndHz: 90,
    },
  ];
}

/** Alien pop. Shorter and brighter than a bomb. */
export const SMALL_EXPLOSION = {
  dur: 0.22,
  lowpassStart: 1400,
  lowpassEnd: 80,
  gain: 0.4,
};

/** Same graph the live context and the offline probe both schedule. */
export function scheduleBombGraph(
  ctx: BaseAudioContext,
  destination: AudioNode,
  time: number,
  noise: AudioBuffer
): void {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(2.2, time);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 4;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.16;
  bus.connect(limiter);
  limiter.connect(destination);
  for (const layer of bombSoundLayers()) scheduleLayer(ctx, layer, time, noise, bus);
}

function scheduleLayer(
  ctx: BaseAudioContext,
  layer: SoundLayer,
  time: number,
  noise: AudioBuffer,
  dest: AudioNode
): void {
  const filter = ctx.createBiquadFilter();
  filter.type = layer.filter;
  filter.frequency.setValueAtTime(Math.max(20, layer.filterHz), time);
  if (layer.filterEndHz > 0) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, layer.filterEndHz), time + layer.dur);
  }
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.gain), time + Math.min(0.02, layer.dur * 0.35));
  gain.gain.exponentialRampToValueAtTime(0.0001, time + layer.dur);
  filter.connect(gain);
  gain.connect(dest);
  if (layer.kind === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.connect(filter);
    const offset = Math.min(0.15, Math.max(0, noise.duration - layer.dur - 0.05));
    src.start(time, offset * 0.2, layer.dur + 0.02);
    src.stop(time + layer.dur + 0.03);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = layer.id === 'sub' ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(Math.max(1, layer.freq), time);
  if (layer.slideTo > 0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.slideTo), time + layer.dur);
  }
  osc.connect(filter);
  osc.start(time);
  osc.stop(time + layer.dur + 0.02);
}

export interface BombMeasure {
  peak: number;
  rms: number;
  /** Energy above ~150 Hz, the band a laptop speaker can reproduce. */
  midRms: number;
  samples: number;
  sampleRate: number;
  wav?: string;
}

/** Renders the bomb through the same master gain and compressor the game uses. */
export async function measureBombRender(withWav = false): Promise<BombMeasure> {
  const sampleRate = 44100;
  const seconds = 1.15;
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * seconds), sampleRate);
  const noise = ctx.createBuffer(1, sampleRate * 2, sampleRate);
  const noiseData = noise.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) noiseData[i] = Math.random() * 2 - 1;
  const master = ctx.createGain();
  master.gain.value = 0.28;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 18;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.18;
  master.connect(comp);
  comp.connect(ctx.destination);
  scheduleBombGraph(ctx, master, 0.02, noise);
  const rendered = await ctx.startRendering();
  const data = rendered.getChannelData(0);
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const value = data[i] ?? 0;
    peak = Math.max(peak, Math.abs(value));
    sum += value * value;
  }
  const rms = Math.sqrt(sum / data.length);
  const midRms = highpassRms(data, sampleRate, 150);
  return {
    peak,
    rms,
    midRms,
    samples: data.length,
    sampleRate,
    wav: withWav ? encodeWav(data, sampleRate) : undefined,
  };
}

function highpassRms(data: Float32Array, sampleRate: number, cutoff: number): number {
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = rc / (rc + 1 / sampleRate);
  let prevIn = 0;
  let prevOut = 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const input = data[i] ?? 0;
    const out = alpha * (prevOut + input - prevIn);
    prevIn = input;
    prevOut = out;
    sum += out * out;
  }
  return Math.sqrt(sum / data.length);
}

function encodeWav(samples: Float32Array, sampleRate: number): string {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
