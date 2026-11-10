import { scheduleBombGraph } from './bombSound';
import {
  initialPlayback,
  musicAssetUrl,
  reducePlayback,
  type MusicAction,
  type Playback,
} from './music';

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private media: HTMLAudioElement | null = null;
  private mediaNode: MediaElementAudioSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private playback: Playback = initialPlayback();
  private transportPaused = false;
  private gestureArmed = false;
  private pending = false;
  /** Game asked for the boom, even if the context could not start. */
  bombCues = 0;
  /** Nodes were actually scheduled on a live context. */
  bombPlays = 0;
  musicStarts = 0;
  private meter: AnalyserNode | null = null;
  private ufo: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;

  private ensure(): boolean {
    if (this.ctx && this.master) return true;
    if (typeof window === 'undefined') return false;
    const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
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
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.master = master;
    this.noise = noise;
    this.applyMasterGain();
    return true;
  }

  private ensureMedia(): HTMLAudioElement | null {
    if (this.media) return this.media;
    if (!this.ensure() || !this.ctx || !this.master || typeof window === 'undefined') return null;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    const node = this.ctx.createMediaElementSource(audio);
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    node.connect(gain);
    gain.connect(this.master);
    this.media = audio;
    this.mediaNode = node;
    this.musicGain = gain;
    return audio;
  }

  private applyMasterGain(): void {
    if (!this.master || !this.ctx) return;
    const vol = this.playback.muted ? 0 : 0.28 * this.playback.volume;
    this.master.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  unlock(): void {
    if (!this.ensure() || !this.ctx) return;
    if (this.ctx.state === 'suspended' && !this.transportPaused) void this.ctx.resume();
    if (this.pending) this.kick();
  }

  private armGesture(): void {
    if (this.gestureArmed || typeof window === 'undefined') return;
    this.gestureArmed = true;
    this.pending = true;
    const retry = () => {
      this.gestureArmed = false;
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
      this.unlock();
    };
    window.addEventListener('pointerdown', retry);
    window.addEventListener('keydown', retry);
  }

  private kick(): void {
    const audio = this.media;
    if (!audio || this.transportPaused || this.playback.paused || this.playback.mode === 'off') return;
    void audio.play().then(() => {
      this.pending = false;
    }).catch(() => this.armGesture());
  }

  private startElement(track: string | null): void {
    if (!track) return;
    this.musicStarts += 1;
    const audio = this.ensureMedia();
    if (!audio) {
      this.armGesture();
      return;
    }
    const url = musicAssetUrl(track, import.meta.env.BASE_URL || '/');
    const abs = new URL(url, window.location.href).href;
    if (audio.src !== abs) audio.src = url;
    audio.loop = true;
    try {
      audio.currentTime = 0;
    } catch {
      /* metadata may not be ready yet */
    }
    if (this.transportPaused || this.playback.paused) return;
    void audio.play().then(() => {
      this.pending = false;
    }).catch(() => this.armGesture());
  }

  private stopElement(): void {
    if (!this.media) return;
    this.media.pause();
    try {
      this.media.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  private apply(action: MusicAction): void {
    const next = reducePlayback(this.playback, action);
    this.playback = next.state;
    this.applyMasterGain();
    if (action.type === 'stop') {
      this.stopElement();
      return;
    }
    if (next.restart) this.startElement(next.state.track);
    else if (!this.transportPaused && !this.playback.paused && this.playback.mode !== 'off') this.kick();
  }

  playMenu(): void {
    this.apply({ type: 'menu' });
  }

  playLevel(level: number, epoch: number): void {
    this.apply({ type: 'level', level, epoch });
  }

  stopMusic(): void {
    this.apply({ type: 'stop' });
  }

  setMuted(muted: boolean): void {
    this.apply({ type: 'mute', muted });
  }

  toggleMuted(): boolean {
    this.setMuted(!this.playback.muted);
    return this.playback.muted;
  }

  setVolume(volume: number): void {
    this.apply({ type: 'volume', volume });
  }

  /** Freezes the soundtrack and the effect graph together. */
  setTransportPaused(paused: boolean): void {
    this.transportPaused = paused;
    this.playback = reducePlayback(this.playback, paused ? { type: 'pause' } : { type: 'resume' }).state;
    if (!this.ensure() || !this.ctx) return;
    if (paused) {
      this.media?.pause();
      void this.ctx.suspend();
      return;
    }
    void this.ctx.resume().then(() => this.kick());
  }

  audioSnapshot(): {
    mode: Playback['mode'];
    track: string | null;
    loop: boolean;
    paused: boolean;
    muted: boolean;
    volume: number;
    players: number;
    bombPlays: number;
    bombCues: number;
    musicStarts: number;
    contextState: string | null;
    transportPaused: boolean;
  } {
    return {
      mode: this.playback.mode,
      track: this.playback.track,
      loop: this.media?.loop ?? false,
      paused: this.media ? this.media.paused : true,
      muted: this.playback.muted,
      volume: this.playback.volume,
      players: this.media ? 1 : 0,
      bombPlays: this.bombPlays,
      bombCues: this.bombCues,
      musicStarts: this.musicStarts,
      contextState: this.ctx?.state ?? null,
      transportPaused: this.transportPaused,
    };
  }

  private tone(
    time: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    amount: number,
    slideTo?: number,
    dest?: AudioNode
  ): void {
    const out = dest ?? this.master;
    if (!this.ctx || !out || freq <= 0 || dur <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo && slideTo > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), time + dur);
    }
    gain.gain.setValueAtTime(amount, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  /** Peak of the master bus. Zero when the context is silent or suspended. */
  outputPeak(): number {
    if (!this.ensure() || !this.ctx || !this.master) return 0;
    if (!this.meter) {
      const node = this.ctx.createAnalyser();
      node.fftSize = 2048;
      this.master.connect(node);
      this.meter = node;
    }
    const data = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] ?? 0));
    return peak;
  }

  startUfo(): void {
    if (this.ufo || !this.ensure() || !this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 480;
    lfo.frequency.value = 7;
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.ufo = { osc, lfo, gain };
  }

  stopUfo(): void {
    if (!this.ufo || !this.ctx) {
      this.ufo = null;
      return;
    }
    const { osc, lfo, gain } = this.ufo;
    this.ufo = null;
    const time = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    osc.stop(time + 0.1);
    lfo.stop(time + 0.1);
  }

  playShoot(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    this.tone(this.ctx.currentTime, 520, 0.09, 'square', 0.22, 140);
  }

  /** Launch thunk for a side-cannon bomb. The blast itself uses playBomb. */
  playWingShot(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    this.tone(time, 180, 0.12, 'sine', 0.16, 70);
    this.tone(time, 96, 0.16, 'triangle', 0.09, 42);
  }

  playTwin(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    this.tone(time, 520, 0.08, 'square', 0.16, 150);
    this.tone(time, 545, 0.08, 'square', 0.14, 160);
  }

  playLaser(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    this.tone(this.ctx.currentTime, 90, 0.45, 'sawtooth', 0.2, 720);
  }

  playExplosion(): void {
    if (!this.ensure() || !this.ctx || !this.master || !this.noise || this.transportPaused) return;
    const time = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + 0.22);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(time, Math.random() * 0.5, 0.24);
  }

  playBomb(): void {
    this.bombCues += 1;
    if (this.playback.muted || this.transportPaused) return;
    if (!this.ensure() || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    const start = () => {
      if (this.playback.muted || this.transportPaused) return;
      this.bombPlays += 1;
      scheduleBombGraph(ctx, master, ctx.currentTime, noise);
    };
    if (ctx.state === 'suspended') {
      void ctx.resume().then(start);
      return;
    }
    start();
  }

  playDive(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    this.tone(time, 360, 0.18, 'square', 0.1, 180);
    this.tone(time + 0.16, 180, 0.22, 'triangle', 0.08, 420);
  }

  playShieldHit(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    this.tone(this.ctx.currentTime, 880, 0.18, 'triangle', 0.24, 220);
  }

  playShieldUp(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    this.tone(time, 440, 0.12, 'triangle', 0.18, 660);
    this.tone(time + 0.1, 660, 0.14, 'triangle', 0.18, 990);
  }

  playPickup(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      this.tone(time + index * 0.06, freq, 0.1, 'square', 0.14);
    });
  }

  playLevelUp(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    const time = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      this.tone(time + index * 0.08, freq, 0.12, 'sine', 0.16);
    });
  }

  playGameOver(): void {
    if (!this.ensure() || !this.ctx || this.transportPaused) return;
    this.tone(this.ctx.currentTime, 220, 0.9, 'sawtooth', 0.22, 55);
  }
}

export const soundService = new SoundService();
