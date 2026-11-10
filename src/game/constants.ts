export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 40;
/** Sits above the 30px HUD bar, with room for the engine flame. */
export const PLAYER_Y = CANVAS_HEIGHT - 78;
/** 4.8 px per 60 Hz frame. */
export const PLAYER_SPEED = 288;
/** Portrait enemy ships. Taller than the old 40×30 monster box so the hull reads. */
export const INVADER_WIDTH = 36;
export const INVADER_HEIGHT = 52;
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 12;
/** 8 px per 60 Hz frame. */
export const BULLET_SPEED = 480;
export const UFO_WIDTH = 60;
export const UFO_HEIGHT = 25;
export const EXPLOSION_RADIUS = CANVAS_WIDTH / 12;
export const EXPLOSION_TIME = 40 / 60;
export const STEP = 1 / 60;
export const PICKUP_SPEED = 140;
export const PICKUP_SIZE = 22;
export const WING_WIDTH = 24;
export const WING_HEIGHT = 18;
/** Left escort sits 12 px outside the hull, which is an offset of -36. */
export const WING_LEFT = -(WING_WIDTH + 12);
/** Right escort mirrors the gap. +36 would draw the cannon inside the hull. */
export const WING_RIGHT = PLAYER_WIDTH + 12;
/** Retired timer. Side cannons now last WING_SHOTS volleys. */
export const WING_LIFE = 20;
export const WING_COOLDOWN = 0.52;
/** One shared pool. A paired volley still spends a single charge. */
export const WING_SHOTS = 6;
/** Teardrop width is 40% of the previous girth. The length stays 26px at rest. */
export const PLASMA_WIDTH_SCALE = 0.4;
export const PLASMA_GIRTH = 7.2 * PLASMA_WIDTH_SCALE;
export const TWIN_LIFE = 18;
export const TWIN_SPREAD = 16;
export const SHIELD_MAX = 5;
export const SHIELD_OVERFLOW_POINTS = 250;
export const LASER_MAX = 3;
export const SHOT_COOLDOWN = 0.35;
export const LASER_COOLDOWN = 1;
export const LASER_DURATION = 0.5;
export const LASER_WIDTH = 30;
/** One random invader peels off on this period. */
export const DIVE_INTERVAL = 5;
/** Full ellipse back to the slot. Stays under the 5s roll. */
export const DIVE_DURATION = 2.8;
