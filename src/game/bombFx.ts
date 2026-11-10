import { EXPLOSION_RADIUS, EXPLOSION_TIME } from './constants';

/** Enemy bomb radius. Unchanged: grows from 0 to EXPLOSION_RADIUS across EXPLOSION_TIME. */
export function bombBlastRadius(timer: number): number {
  return (1 - timer / EXPLOSION_TIME) * EXPLOSION_RADIUS;
}
