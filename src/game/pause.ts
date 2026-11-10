/** Shown above the pause instruction. */
export const PAUSE_TITLE = 'PAUSED';

/** The only instruction on the pause screen. */
export const PAUSE_CONTINUE = 'Press P to continue';

/** P toggles during play and the wave interval, once per press, never from a text field. */
export function pauseKeyAccepted(input: {
  code: string;
  repeat: boolean;
  targetTag: string | null;
  screen: string;
}): boolean {
  if (input.repeat) return false;
  if (input.code !== 'KeyP') return false;
  const tag = (input.targetTag ?? '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  return input.screen === 'PLAYING' || input.screen === 'LEVEL_UP';
}

/** Gameplay keys are ignored while the sim is frozen, including in a text field. */
export function gameplayKeyAllowed(paused: boolean, targetTag: string | null): boolean {
  if (paused) return false;
  const tag = (targetTag ?? '').toUpperCase();
  return tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT';
}

/**
 * While paused the clock sticks to the latest timestamp and contributes no
 * step, so the first frame after resume is one refresh and not the whole gap.
 */
export function frameStep(last: number, now: number, paused: boolean): { last: number; dt: number } {
  if (paused) return { last: now, dt: 0 };
  const elapsed = Number.isFinite(now - last) ? (now - last) / 1000 : 0;
  return { last: now, dt: Math.min(0.1, Math.max(0, elapsed)) };
}
