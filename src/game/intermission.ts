/**
 * The interval between waves starts only on a fresh Space press.
 * The shot that cleared the wave, a key that is still down, and the
 * browser's auto-repeat do not count. Pause swallows the key.
 */
export function intermissionAdvanceKey(input: {
  code: string;
  repeat: boolean;
  paused: boolean;
  /** False while Space was already down when the interval opened. */
  armed: boolean;
}): boolean {
  if (input.paused || input.repeat || !input.armed) return false;
  return input.code === 'Space';
}
