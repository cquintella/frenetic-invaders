/** Approved board ids, row-major: A1 B1 C1 D1 E1 … E5. */
export const ALIEN_IDS: readonly string[] = Array.from({ length: 25 }, (_, index) => {
  const column = index % 5;
  const row = Math.floor(index / 5) + 1;
  return `${'ABCDE'[column]}${row}`;
});

export const ALIEN_FRAME_COUNT = 8;

/**
 * Which approved sprite a formation slot shows.
 * Behavior, points and hit box stay on `type`. Level shifts the set so
 * later waves are not a copy of the first, and every id appears in a wave.
 */
export function alienLook(level: number, row: number, col: number): number {
  const wave = Math.max(1, level) - 1;
  const slot = row * 10 + col;
  return (wave * 5 + slot) % ALIEN_IDS.length;
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
