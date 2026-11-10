/**
 * Six cuts from the approved board. Chosen for silhouette and color,
 * not the whole 5×5 sheet. C3 and D5 stay out.
 * Crab, grub, jellyfish, horned brute, urchin, armored figure.
 */
export const ALIEN_IDS: readonly string[] = ['A1', 'B1', 'D1', 'E2', 'C4', 'E3'];

export const ALIEN_FRAME_COUNT = 8;

/**
 * One cut per formation row. The level rotates which of the six is on top,
 * so a later wave is not a copy of the first. Points and the hit box stay on `type`.
 */
export function alienLook(level: number, row: number, _col = 0): number {
  const wave = Math.max(1, level) - 1;
  const line = Math.max(0, Math.floor(row));
  return (wave + line) % ALIEN_IDS.length;
}

/**
 * Frame index from simulation time. The same time always returns the same
 * frame, so a pause (time frozen) holds the pose and resume does not skip.
 */
export function alienFrame(time: number, look: number, slot: number): number {
  const phase = ((look * 3 + slot) % 17) / 17;
  const ticks = time * 1.6 + phase * ALIEN_FRAME_COUNT;
  const frame = Math.floor(ticks) % ALIEN_FRAME_COUNT;
  return frame < 0 ? frame + ALIEN_FRAME_COUNT : frame;
}

/** -1 banks left, 1 banks right, 0 is the neutral hull. Opposed keys cancel. */
export function shipLean(left: boolean, right: boolean): -1 | 0 | 1 {
  if (left === right) return 0;
  return left ? -1 : 1;
}
