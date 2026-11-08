import type { PickupKind } from './types';

export const UFO_POINT_TABLE = [100, 150, 200, 300, 500] as const;

/** `roll` is in [0, 1). */
export function ufoPoints(roll: number): number {
  const clamped = Math.min(0.999999, Math.max(0, roll));
  const index = Math.floor(clamped * UFO_POINT_TABLE.length);
  return UFO_POINT_TABLE[index] ?? UFO_POINT_TABLE[0];
}

/** Weights: wing 40%, twin 35%, shield 25%. */
export function rollPickup(roll: number): PickupKind {
  if (roll < 0.4) return 'wing';
  if (roll < 0.75) return 'twin';
  return 'shield';
}
