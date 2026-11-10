export interface Palette {
  body: string;
  light: string;
  dark: string;
  burst: string;
}

export const ALIEN_PALETTES: readonly Palette[] = [
  { body: '#ff4fd8', light: '#ffe4f7', dark: '#6b123f', burst: '#ff4fd8' },
  { body: '#3ee0ff', light: '#e7fbff', dark: '#08556c', burst: '#3ee0ff' },
  { body: '#ffd23a', light: '#fff6d0', dark: '#7c4a00', burst: '#ffd23a' },
];

/** Screen pixels. Kept thin so the 8×8 aliens stay readable. */
export const SHIP_INK_PX = 1;

/** Highlight caps and shadow blocks. Empty cells stay empty, so the silhouette holds. */
export function celShade(map: readonly number[], cols = 8): number[] {
  const out = map.slice();
  const rows = Math.floor(map.length / cols);
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) continue;
    const row = Math.floor(i / cols);
    const above = row > 0 ? map[i - cols] : 0;
    if (!above) out[i] = 3;
    else if (row >= rows - 3) out[i] = 2;
  }
  return out;
}

const SQUID_A = [
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 1, 0, 1, 1, 0, 1, 0,
  1, 0, 1, 0, 0, 1, 0, 1,
];

const SQUID_B = [
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 0, 0, 0, 0, 1, 0,
  1, 0, 1, 0, 0, 1, 0, 1,
  0, 1, 0, 1, 1, 0, 1, 0,
];

const CRAB_A = [
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  0, 1, 0, 0, 0, 0, 1, 0,
  1, 0, 0, 0, 0, 0, 0, 1,
];

const CRAB_B = [
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 0, 1, 0, 0, 1, 0, 1,
  0, 1, 0, 0, 0, 0, 1, 0,
];

const OCTOPUS_A = [
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 0, 1, 1, 0, 1, 0,
  0, 1, 0, 1, 1, 0, 1, 0,
  1, 0, 0, 0, 0, 0, 0, 1,
];

const OCTOPUS_B = [
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 1, 0, 0, 1, 0, 1,
  1, 0, 1, 0, 0, 1, 0, 1,
  0, 1, 0, 0, 0, 0, 1, 0,
];

export const ALIEN_FRAMES: readonly (readonly (readonly number[])[])[] = [
  [SQUID_A, SQUID_B],
  [CRAB_A, CRAB_B],
  [OCTOPUS_A, OCTOPUS_B],
];

/**
 * 16×14, nose toward the top of the screen.
 * Front view of a twin-pod gunship: spine, canopy, pod cannons, intakes, skids.
 * 1 hull, 2 canopy, 3 muzzle, 4 intake and gear.
 */
export const PLAYER_MAP = [
  0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0,
  0, 3, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 3, 0,
  3, 1, 3, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 3, 1, 3,
  4, 1, 4, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 4, 1, 4,
  4, 1, 4, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 4, 1, 4,
  4, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 4,
  4, 4, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 4, 4,
  0, 4, 4, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 4, 4, 0,
  0, 4, 0, 4, 0, 0, 1, 4, 4, 1, 0, 0, 4, 0, 4, 0,
  4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4,
];

export const PLAYER_COLS = 16;
export const PLAYER_ROWS = 14;

export const PLAYER_COLORS: Record<number, { light: string; body: string; dark: string }> = {
  1: { light: '#f8fafc', body: '#d5dde4', dark: '#5c6b78' },
  2: { light: '#e0f2fe', body: '#38bdf8', dark: '#0369a1' },
  3: { light: '#ffffff', body: '#f8fafc', dark: '#cbd5e1' },
  4: { light: '#334155', body: '#0f172a', dark: '#020617' },
  5: { light: '#ffedd5', body: '#f97316', dark: '#c2410c' },
};

/** 8×6. 1 body, 2 core, 3 muzzle. */
export const WING_MAP = [
  0, 0, 0, 3, 3, 0, 0, 0,
  0, 0, 1, 3, 3, 1, 0, 0,
  0, 1, 1, 2, 2, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 0, 1, 1, 0, 1, 1,
  0, 1, 0, 0, 0, 0, 1, 0,
];

export const WING_COLORS: Record<number, { light: string; body: string; dark: string }> = {
  1: { light: '#cffafe', body: '#22d3ee', dark: '#0e7490' },
  2: { light: '#ffffff', body: '#e0f2fe', dark: '#7dd3fc' },
  3: { light: '#ecfeff', body: '#a5f3fc', dark: '#67e8f9' },
};

function assertMaps(): void {
  for (const frames of ALIEN_FRAMES) {
    for (const map of frames) {
      if (map.length !== 64) throw new Error('alien sprite must be 8x8');
    }
  }
  if (PLAYER_MAP.length !== PLAYER_COLS * PLAYER_ROWS) throw new Error('player sprite must be 16x14');
  if (WING_MAP.length !== 48) throw new Error('wing sprite must be 8x6');
}

assertMaps();
