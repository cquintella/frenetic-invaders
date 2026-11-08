export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InvaderDive {
  t: number;
  duration: number;
  /** Horizontal radius. Positive. The sign of the bulge is `side`. */
  rx: number;
  ry: number;
  side: number;
  /** Center travel, from the slot, at which the bomb is released. */
  dropOffset: number;
  prevDy: number;
  dropped: boolean;
  hitPlayer: boolean;
}

export interface Invader extends Entity {
  type: number;
  points: number;
  alive: boolean;
  /** Formation slot. `x`/`y` leave this slot only during a dive. */
  homeX: number;
  homeY: number;
  dive: InvaderDive | null;
}

export type BulletOwner = 'player' | 'wing' | 'enemy';

export interface Bullet extends Entity {
  active: boolean;
  /** Pixels per second. */
  speed: number;
  owner: BulletOwner;
}

export interface Bomb extends Entity {
  active: boolean;
  speed: number;
  exploding: boolean;
  /** Seconds left in the blast. */
  explosionTimer: number;
}

export interface LaserBeam {
  x: number;
  width: number;
  life: number;
  active: boolean;
}

export interface UfoTrail {
  x: number;
  y: number;
  life: number;
}

export interface Ufo extends Entity {
  active: boolean;
  /** Base speed in px/s. The live speed multiplies this by a wave. */
  speed: number;
  points: number;
  trail: UfoTrail[];
  phase: number;
  bob: number;
  age: number;
}

export type PickupKind = 'wing' | 'twin' | 'shield';

export interface Pickup extends Entity {
  active: boolean;
  kind: PickupKind;
  vy: number;
}

export interface WingCannon {
  offsetX: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Player bomb from the side cannons. Damage is applied once, not per frame. */
export interface WingBomb extends Entity {
  active: boolean;
  speed: number;
}

export interface Blast {
  x: number;
  y: number;
  age: number;
  life: number;
  reduced: boolean;
}

export type ParticleKind = 'pixel' | 'ember' | 'debris' | 'smoke';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  kind?: ParticleKind;
  rot?: number;
  vr?: number;
  drag?: number;
  gravity?: number;
}

export interface Floater {
  x: number;
  y: number;
  value: number;
  life: number;
  max: number;
  color: string;
}

export interface SkyStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  /** 0 dust, 1 tinted point, 2 bright star with spikes. */
  kind: number;
  color: string;
}

/** Far sheet. `speed` is downward px/s. `drift` is the strafe parallax. */
export interface SkyStarSheet {
  speed: number;
  drift: number;
  color: string;
  stars: SkyStar[];
}

export type SkyBodyKind = 'planet' | 'moon' | 'asteroid' | 'comet';

/** Middle depth: planets, moons, asteroids, comets. */
export interface SkyBody {
  kind: SkyBodyKind;
  x: number;
  y: number;
  radius: number;
  /** Downward px/s for planet, moon and asteroid. Comets ignore this and use vx, vy. */
  speed: number;
  /** Straight-line velocity in px/s. Zero except on comets. */
  vx: number;
  vy: number;
  drift: number;
  spin: number;
  /** Moon surface. 0 cratered, 1 sulfur, 2 ice, 3 haze. Ignored on other bodies. */
  face: number;
  fill: string;
  shade: string;
  accent: string;
}

export interface SkyPuff {
  ox: number;
  oy: number;
  r: number;
  alpha: number;
}

/** Near nebula. Soft lobes, not a flat ellipse. Scrolls downward. */
export interface SkyGas {
  x: number;
  y: number;
  /** Downward speed in px/s. */
  speed: number;
  drift: number;
  /** `r, g, b` without alpha. */
  color: string;
  core: string;
  /** How far the cloud reaches, used to wrap it. */
  reach: number;
  tilt: number;
  lobes: SkyPuff[];
  knots: SkyPuff[];
}

/** Near meteor. Falls down the screen, ahead of the ship. */
export interface SkyMeteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  drift: number;
  color: string;
}

export interface Sky {
  /** Index into the four themes. Level 1 is 0. */
  theme: number;
  top: string;
  mid: string;
  low: string;
  ring: boolean;
  /** Soft dust lane. Alpha 0 skips it. Scrolls down with the far stars. */
  laneAngle: number;
  laneAlpha: number;
  laneColor: string;
  laneY: number;
  stars: SkyStarSheet[];
  bodies: SkyBody[];
  gases: SkyGas[];
  meteors: SkyMeteor[];
}

export interface World {
  player: { x: number; y: number };
  invaders: Invader[];
  bullets: Bullet[];
  enemyBullets: Bullet[];
  bombs: Bomb[];
  wingBombs: WingBomb[];
  beams: LaserBeam[];
  ufo: Ufo | null;
  pickups: Pickup[];
  wings: WingCannon[];
  particles: Particle[];
  blasts: Blast[];
  floaters: Floater[];
  sky: Sky;
  score: number;
  level: number;
  lasers: number;
  shield: number;
  /** 1 while double plasma is armed. It does not count down. */
  twin: number;
  /** Shared volleys left for every side cannon currently mounted. */
  wingShots: number;
  flash: number;
  shake: number;
  time: number;
  anim: number;
  camera: number;
  iframe: number;
  over: boolean;
  /** Level just cleared, waiting on the splash. Null during play. */
  bannerLevel: number | null;
}

export interface HudSnapshot {
  score: number;
  level: number;
  lasers: number;
  shield: number;
  twin: boolean;
  wings: number;
  wingShots: number;
  over: boolean;
  bannerLevel: number | null;
}
