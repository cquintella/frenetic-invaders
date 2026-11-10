export const MENU_TRACK = '01_menu_starfield.mp3';

/** Level 1 plays 02, then 03, then 04, then 02 again. All three are level music. */
export const LEVEL_TRACKS = [
  '02_voo_hiperespaco.mp3',
  '03_combate_enxame.mp3',
  '04_chefe_nave_mae.mp3',
] as const;

export function trackForLevel(level: number): string {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return LEVEL_TRACKS[(safe - 1) % LEVEL_TRACKS.length] ?? LEVEL_TRACKS[0];
}

export function musicAssetUrl(file: string, base = '/'): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}musica/${file}`;
}

export type MusicMode = 'off' | 'menu' | 'level';

export interface Playback {
  mode: MusicMode;
  track: string | null;
  level: number | null;
  epoch: number | null;
  paused: boolean;
  muted: boolean;
  volume: number;
  /** Changes only when the single player must restart. */
  token: number;
}

export type MusicAction =
  | { type: 'menu' }
  | { type: 'level'; level: number; epoch: number }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'mute'; muted: boolean }
  | { type: 'volume'; volume: number };

export function initialPlayback(): Playback {
  return {
    mode: 'off',
    track: null,
    level: null,
    epoch: null,
    paused: false,
    muted: false,
    volume: 1,
    token: 0,
  };
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function reducePlayback(state: Playback, action: MusicAction): { state: Playback; restart: boolean } {
  if (action.type === 'mute') return { state: { ...state, muted: action.muted }, restart: false };
  if (action.type === 'volume') return { state: { ...state, volume: clampVolume(action.volume) }, restart: false };
  if (action.type === 'pause') return { state: { ...state, paused: true }, restart: false };
  if (action.type === 'resume') return { state: { ...state, paused: false }, restart: false };
  if (action.type === 'stop') {
    if (state.mode === 'off') return { state, restart: false };
    return {
      state: { ...state, mode: 'off', track: null, level: null, epoch: null },
      restart: false,
    };
  }
  if (action.type === 'menu') {
    if (state.mode === 'menu' && state.track === MENU_TRACK) return { state, restart: false };
    return {
      state: {
        ...state,
        mode: 'menu',
        track: MENU_TRACK,
        level: null,
        epoch: null,
        paused: false,
        token: state.token + 1,
      },
      restart: true,
    };
  }
  const track = trackForLevel(action.level);
  if (
    state.mode === 'level' &&
    state.track === track &&
    state.level === action.level &&
    state.epoch === action.epoch
  ) {
    return { state, restart: false };
  }
  return {
    state: {
      ...state,
      mode: 'level',
      track,
      level: action.level,
      epoch: action.epoch,
      paused: false,
      token: state.token + 1,
    },
    restart: true,
  };
}
