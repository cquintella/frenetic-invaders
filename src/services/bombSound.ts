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

/** Cinematic bomb: crack, low body, sub, and a rumble tail. */
export function bombSoundLayers(): SoundLayer[] {
  return [
    {
      id: 'crack',
      kind: 'noise',
      dur: 0.08,
      gain: 0.2,
      freq: 0,
      slideTo: 0,
      filter: 'bandpass',
      filterHz: 1600,
      filterEndHz: 900,
    },
    {
      id: 'body',
      kind: 'tone',
      dur: 0.5,
      gain: 0.16,
      freq: 74,
      slideTo: 34,
      filter: 'lowpass',
      filterHz: 200,
      filterEndHz: 90,
    },
    {
      id: 'sub',
      kind: 'tone',
      dur: 0.85,
      gain: 0.1,
      freq: 46,
      slideTo: 26,
      filter: 'lowpass',
      filterHz: 110,
      filterEndHz: 60,
    },
    {
      id: 'rumble',
      kind: 'noise',
      dur: 1.05,
      gain: 0.11,
      freq: 0,
      slideTo: 0,
      filter: 'lowpass',
      filterHz: 380,
      filterEndHz: 70,
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
