import type { PickupKind } from './types';

export const UFO_POINT_TABLE = [100, 150, 200, 300, 500] as const;

/** `roll` is in [0, 1). */
export function ufoPoints(roll: number): number {
  const clamped = Math.min(0.999999, Math.max(0, roll));
  const index = Math.floor(clamped * UFO_POINT_TABLE.length);
  return UFO_POINT_TABLE[index] ?? UFO_POINT_TABLE[0];
}

/** Weights among the full set: wing 40%, twin 35%, shield 25%. */
export const PICKUP_WEIGHTS: Record<PickupKind, number> = {
  wing: 0.4,
  twin: 0.35,
  shield: 0.25,
};

export const PICKUP_KINDS: readonly PickupKind[] = ['wing', 'twin', 'shield'];

/**
 * Next UFO drop. `previous` is skipped when another kind remains, and the
 * weights of the kinds that remain are kept in proportion. A catalog of one
 * kind returns that kind.
 */
export function rollPickup(
  roll: number,
  previous: PickupKind | null = null,
  kinds: readonly PickupKind[] = PICKUP_KINDS
): PickupKind {
  const available = kinds.filter((kind) => kind !== previous);
  const pool = available.length > 0 ? available : kinds;
  const fallback = pool[0] ?? 'wing';
  if (pool.length <= 1) return fallback;
  const weights = pool.map((kind) => PICKUP_WEIGHTS[kind] ?? 0);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return fallback;
  let cursor = Math.min(0.999999, Math.max(0, roll)) * total;
  for (let index = 0; index < pool.length; index += 1) {
    cursor -= weights[index] ?? 0;
    if (cursor < 0) return pool[index] ?? fallback;
  }
  return pool[pool.length - 1] ?? fallback;
}
