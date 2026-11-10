import { ALIEN_FRAME_COUNT, ALIEN_IDS, alienFrame } from './alienMotion';
import { prefersReducedMotion } from './motion';
import { ALIEN_PALETTES, type Palette } from './sprites';

/**
 * Sprites are painted once at 8× and blitted into the hit box.
 *
 * Player: front gunship on the two dedicated sheets (nose cap, canopy,
 * shoulder balls, vent spine, twin pods, bronze bells). No logos or letters.
 * Escort: that sheet's side pod, reduced into the wing box.
 * Saucer: the ring craft, flattened into 60×25. Legs do not fit. The wedge
 * beside it and the orthographic racer are a different craft and are not
 * used as the gameplay silhouette.
 * Aliens are the 25 cuts from the approved board (A1–E5). The live path
 * blits those cuts. It does not draw a stand-in if a cut has not loaded.
 */

const SCALE = 8;
const cache = new Map<string, HTMLCanvasElement>();

function ink(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = '#111';
  ctx.stroke();
}

function fillInk(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, width);
}

function raster(
  key: string,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): HTMLCanvasElement | null {
  const found = cache.get(key);
  if (found) return found;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * SCALE));
  canvas.height = Math.max(1, Math.round(h * SCALE));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  paint(ctx, w, h);
  cache.set(key, canvas);
  return canvas;
}

function blit(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): void {
  const src = raster(key, w, h, paint);
  if (!src) {
    paint(ctx, w, h);
    return;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, x, y, w, h);
}

/** Side pod from the front sheet: intake, vents, outer plate, bronze bell. */
function pod(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, side: -1 | 1): void {
  ctx.beginPath();
  ctx.moveTo(x + w * 0.38, y + h * 0.1);
  ctx.bezierCurveTo(x + w * 0.78, y + h * 0.02, x + w * 0.98, y + h * 0.16, x + w * 0.94, y + h * 0.36);
  ctx.lineTo(x + w * 0.9, y + h * 0.66);
  ctx.quadraticCurveTo(x + w * 0.72, y + h * 0.76, x + w * 0.5, y + h * 0.74);
  ctx.quadraticCurveTo(x + w * 0.26, y + h * 0.76, x + w * 0.1, y + h * 0.66);
  ctx.lineTo(x + w * 0.06, y + h * 0.36);
  ctx.bezierCurveTo(x + w * 0.02, y + h * 0.16, x + w * 0.16, y + h * 0.02, x + w * 0.38, y + h * 0.1);
  ctx.closePath();
  fillInk(ctx, '#e7eef4', 0.65);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = side < 0 ? '#f8fafc' : '#9aa8b8';
  ctx.fillRect(x, y, w * 0.42, h);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.46, y + h * 0.16, w * 0.16, h * 0.075, 0, 0, Math.PI * 2);
  fillInk(ctx, '#c6a36a', 0.45);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.46, y + h * 0.16, w * 0.07, h * 0.032, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1917';
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + w * 0.26, y + h * 0.36, w * 0.16, h * 0.18);
  ctx.fillRect(x + w * 0.48, y + h * 0.36, w * 0.16, h * 0.18);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 0.35;
  ctx.strokeRect(x + w * 0.26, y + h * 0.36, w * 0.16, h * 0.18);
  ctx.strokeRect(x + w * 0.48, y + h * 0.36, w * 0.16, h * 0.18);
  const plateX = side < 0 ? x + w * 0.08 : x + w * 0.7;
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(plateX, y + h * 0.38, w * 0.2, h * 0.2);
  ctx.strokeRect(plateX, y + h * 0.38, w * 0.2, h * 0.2);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.84, w * 0.24, h * 0.09, 0, 0, Math.PI * 2);
  fillInk(ctx, '#8d6b34', 0.5);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.84, w * 0.1, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3f2a12';
  ctx.fill();
}

function hullPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, h * 0.015);
  ctx.bezierCurveTo(cx + w * 0.05, h * 0.05, cx + w * 0.09, h * 0.14, cx + w * 0.12, h * 0.3);
  ctx.lineTo(cx + w * 0.14, h * 0.7);
  ctx.quadraticCurveTo(cx + w * 0.08, h * 0.8, cx, h * 0.76);
  ctx.quadraticCurveTo(cx - w * 0.08, h * 0.8, cx - w * 0.14, h * 0.7);
  ctx.lineTo(cx - w * 0.12, h * 0.3);
  ctx.bezierCurveTo(cx - w * 0.09, h * 0.14, cx - w * 0.05, h * 0.05, cx, h * 0.015);
  ctx.closePath();
}

function paintPlayer(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cone = (x: number, dir: number) => {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.28);
    ctx.lineTo(x + dir * w * 0.035, h * 0.34);
    ctx.lineTo(x + dir * w * 0.012, h * 0.52);
    ctx.lineTo(x - dir * w * 0.03, h * 0.4);
    ctx.closePath();
    fillInk(ctx, '#8d7344', 0.4);
  };
  cone(cx - w * 0.2, -1);
  cone(cx + w * 0.2, 1);

  hullPath(ctx, w, h);
  fillInk(ctx, '#d5dee8', 0.75);
  ctx.save();
  hullPath(ctx, w, h);
  ctx.clip();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, cx - w * 0.01, h);
  ctx.fillStyle = '#8b99a8';
  ctx.fillRect(cx + w * 0.04, h * 0.28, w * 0.16, h * 0.5);
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, h * 0.07, w * 0.05, h * 0.055, 0, 0, Math.PI * 2);
  fillInk(ctx, '#667484', 0.45);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, h * 0.16);
  ctx.quadraticCurveTo(cx, h * 0.12, cx + w * 0.04, h * 0.16);
  ctx.lineTo(cx + w * 0.03, h * 0.27);
  ctx.quadraticCurveTo(cx, h * 0.3, cx - w * 0.03, h * 0.27);
  ctx.closePath();
  fillInk(ctx, '#5ec8f0', 0.4);
  ctx.fillStyle = '#e0f7ff';
  ctx.fillRect(cx - w * 0.02, h * 0.17, w * 0.012, h * 0.07);

  ctx.beginPath();
  ctx.arc(cx - w * 0.15, h * 0.32, w * 0.048, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.15, h * 0.32, w * 0.048, 0, Math.PI * 2);
  fillInk(ctx, '#242b33', 0.45);
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(cx - w * 0.16, h * 0.3, w * 0.012, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.14, h * 0.3, w * 0.012, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.fillRect(cx - w * 0.03, h * 0.36, w * 0.06, h * 0.34);
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(cx - w * 0.02, h * (0.4 + i * 0.07), w * 0.04, h * 0.028);
  }

  pod(ctx, w * 0.0, h * 0.32, w * 0.32, h * 0.66, -1);
  pod(ctx, w * 0.68, h * 0.32, w * 0.32, h * 0.66, 1);
}

function paintSlit(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number, pal: Palette): void {
  const bite = frame ? 1.4 : -0.6;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.06);
  ctx.bezierCurveTo(w * 0.7, h * 0.0, w * 0.96, h * 0.22, w * 0.9, h * 0.48);
  ctx.quadraticCurveTo(w * 0.84, h * 0.62, w * 0.72, h * 0.58);
  ctx.quadraticCurveTo(w * 0.86, h * 0.78, w * 0.7 + bite, h * 0.96);
  ctx.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.4, h * 0.66);
  ctx.quadraticCurveTo(w * 0.22, h * 0.92, w * 0.16 - bite * 0.4, h * 0.98);
  ctx.quadraticCurveTo(w * 0.08, h * 0.7, w * 0.16, h * 0.42);
  ctx.bezierCurveTo(w * 0.02, h * 0.28, w * 0.08, h * 0.08, w * 0.28, h * 0.06);
  ctx.closePath();
  fillInk(ctx, pal.body, 0.9);
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.16);
  ctx.quadraticCurveTo(w * 0.08, h * 0.02, w * 0.04, h * 0.14);
  ctx.quadraticCurveTo(w * 0.12, h * 0.22, w * 0.22, h * 0.24);
  ctx.closePath();
  fillInk(ctx, pal.dark, 0.6);
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.ellipse(w * 0.62, h * 0.28, w * 0.16, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.36);
  ctx.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.78, h * 0.4);
  ctx.lineTo(w * 0.74, h * 0.48);
  ctx.quadraticCurveTo(w * 0.48, h * 0.4, w * 0.24, h * 0.44);
  ctx.closePath();
  fillInk(ctx, '#d9f99d', 0.55);
  ctx.fillStyle = '#1a2e05';
  ctx.fillRect(w * 0.46, h * 0.36, w * 0.035, h * 0.1);
  ctx.fillStyle = '#f5edd6';
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.7);
  ctx.lineTo(w * 0.36, h * 0.86);
  ctx.lineTo(w * 0.42, h * 0.7);
  ctx.moveTo(w * 0.62, h * 0.64);
  ctx.lineTo(w * 0.7, h * 0.9);
  ctx.lineTo(w * 0.56, h * 0.66);
  ctx.fill();
}

function paintBlind(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number, pal: Palette): void {
  const gape = frame ? h * 0.08 : 0;
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.08);
  ctx.bezierCurveTo(w * 0.55, h * 0.0, w * 0.92, h * 0.12, w * 0.88, h * 0.4);
  ctx.quadraticCurveTo(w * 0.96, h * 0.7, w * 0.7, h * 0.78);
  ctx.quadraticCurveTo(w * 0.55, h * 0.95, w * 0.4, h * 0.76);
  ctx.quadraticCurveTo(w * 0.18, h * 0.92, w * 0.1, h * 0.55);
  ctx.bezierCurveTo(w * 0.02, h * 0.3, w * 0.08, h * 0.1, w * 0.2, h * 0.08);
  ctx.closePath();
  fillInk(ctx, pal.body, 0.9);
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h * (0.48 + gape / h), w * 0.22, h * (0.16 + gape / h), 0.1, 0, Math.PI * 2);
  fillInk(ctx, '#14080c', 0.6);
  ctx.fillStyle = '#f3e6c4';
  for (let i = 0; i < 5; i += 1) {
    const tx = w * (0.32 + i * 0.07);
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.4);
    ctx.lineTo(tx + w * 0.03, h * (0.5 + (i % 2) * 0.04));
    ctx.lineTo(tx + w * 0.055, h * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.62);
    ctx.lineTo(tx + w * 0.025, h * (0.52 - (i % 2) * 0.03));
    ctx.lineTo(tx + w * 0.05, h * 0.62);
    ctx.fill();
  }
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.ellipse(w * 0.22, h * 0.3, w * 0.05, h * 0.035, 0.4, 0, Math.PI * 2);
  ctx.ellipse(w * 0.78, h * 0.26, w * 0.045, h * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 0.45;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.42);
  ctx.quadraticCurveTo(w * 0.0, h * (0.2 - gape / h), w * 0.14, h * 0.16);
  ctx.moveTo(w * 0.86, h * 0.48);
  ctx.quadraticCurveTo(w * 0.98, h * 0.7, w * 0.78, h * 0.62);
  ctx.stroke();
}

function paintMaw(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number, pal: Palette): void {
  const swing = frame ? 1.5 : -1.5;
  const arms = [
    [0.12, 0.34, 0.08, 0.95],
    [0.28, 0.42, 0.22, 0.98],
    [0.7, 0.4, 0.78 + swing * 0.02, 0.9],
    [0.86, 0.3, 0.96, 0.72],
  ];
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  for (const arm of arms) {
    ctx.beginPath();
    ctx.moveTo(w * arm[0], h * arm[1]);
    ctx.quadraticCurveTo(w * ((arm[0] + arm[2]) / 2 + swing * 0.02), h * 0.7, w * arm[2], h * arm[3]);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.4, w * 0.28, h * 0.32, 0.15, 0, Math.PI * 2);
  fillInk(ctx, pal.body, 0.85);
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.42, w * 0.16, h * 0.18, 0.1, 0, Math.PI * 2);
  fillInk(ctx, '#1c0a0e', 0.55);
  ctx.strokeStyle = '#f6edd4';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.42, w * 0.11, h * 0.12, 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

function paintUfo(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h * 0.58;
  const vane = (x: number, dir: number) => {
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.02);
    ctx.lineTo(x + dir * w * 0.02, h * 0.02);
    ctx.lineTo(x + dir * w * 0.07, h * 0.1);
    ctx.lineTo(x + dir * w * 0.015, cy + h * 0.02);
    ctx.closePath();
    fillInk(ctx, '#f59e0b', 0.4);
  };
  vane(w * 0.14, -1);
  vane(w * 0.86, 1);
  ctx.beginPath();
  ctx.ellipse(w * 0.05, cy, w * 0.045, h * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.95, cy, w * 0.045, h * 0.16, 0, 0, Math.PI * 2);
  fillInk(ctx, '#4b5568', 0.4);

  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.38, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7f97b0';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#d5e2ee';
  ctx.fillRect(cx - w * 0.4, cy - h * 0.42, w * 0.26, h * 0.84);
  ctx.fillStyle = '#4e647c';
  ctx.fillRect(cx + w * 0.06, cy - h * 0.2, w * 0.32, h * 0.62);
  ctx.restore();
  ink(ctx, 0.75);

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.02, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.02, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
  ink(ctx, 0.65);

  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.06, w * 0.055, h * 0.16, 0, 0, Math.PI * 2);
  fillInk(ctx, '#1e3a5f', 0.4);
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.012, cy + h * 0.02, w * 0.016, h * 0.04, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(cx - w * 0.035, cy - h * 0.28, w * 0.012, h * 0.12);
  ctx.fillRect(cx + w * 0.02, cy - h * 0.28, w * 0.012, h * 0.12);
}

function paintWing(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  pod(ctx, w * 0.08, h * 0.02, w * 0.84, h * 0.96, 1);
}

const bakedAliens = new Map<number, HTMLCanvasElement[]>();

/**
 * Eight poses baked once from a cut sprite. The upper body breathes.
 * The lower body sways by about a pixel, which reads as limbs when the
 * crop has them, without inventing joints. Runtime only blits.
 */
export function bakeAlienFrames(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const split = Math.round(height * 0.58);
  for (let index = 0; index < ALIEN_FRAME_COUNT; index += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width + 4;
    canvas.height = height + 4;
    const pen = canvas.getContext('2d');
    if (!pen) continue;
    const cycle = (index / ALIEN_FRAME_COUNT) * Math.PI * 2;
    const breath = 1 + 0.018 * Math.sin(cycle);
    pen.save();
    pen.translate(2 + width / 2, 2 + split / 2);
    pen.scale(1 + (breath - 1) * 0.35, breath);
    pen.translate(-width / 2, -split / 2);
    pen.drawImage(source, 0, 0, width, split, 0, 0, width, split);
    pen.restore();
    const sway = Math.sin(cycle);
    const slices = 6;
    for (let slice = 0; slice < slices; slice += 1) {
      const sy = split + Math.floor(((height - split) * slice) / slices);
      const sh = Math.ceil((height - split) / slices) + 1;
      const shift = sway * (slice / slices) * 1.2;
      pen.drawImage(source, 0, sy, width, sh, 2 + shift, 2 + sy, width, sh);
    }
    frames.push(canvas);
  }
  return frames;
}

export function setBakedAlien(look: number, frames: HTMLCanvasElement[]): void {
  bakedAliens.set(look, frames);
}

const alienCutsStarted = { current: false };

function alienAsset(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}sprites/aliens/${file}`;
}

/** Loads each approved cut once and bakes its eight poses. */
function ensureAlienCuts(): void {
  if (alienCutsStarted.current || typeof Image === 'undefined' || typeof document === 'undefined') return;
  alienCutsStarted.current = true;
  ALIEN_IDS.forEach((id, look) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (image.naturalWidth < 1) return;
      const frames = bakeAlienFrames(image, image.naturalWidth, image.naturalHeight);
      if (frames.length === ALIEN_FRAME_COUNT) setBakedAlien(look, frames);
    };
    image.src = alienAsset(`${id}.png`);
  });
}

export function alienCutsReady(): boolean {
  if (bakedAliens.size !== ALIEN_IDS.length) return false;
  for (const frames of bakedAliens.values()) {
    if (frames.length !== ALIEN_FRAME_COUNT) return false;
  }
  return true;
}

/** Approved A1–E5 cut, contain-fit in the existing box. No stand-in. */
export function drawAlienCraft(
  ctx: CanvasRenderingContext2D,
  type: number,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  time = 0,
  look = 0,
  slot = 0
): void {
  ensureAlienCuts();
  const baked = bakedAliens.get(look);
  if (!baked || baked.length !== ALIEN_FRAME_COUNT) return;
  const index = prefersReducedMotion() ? 0 : alienFrame(time, look, slot);
  const sprite = baked[index] ?? baked[0];
  if (!sprite) return;
  const scale = Math.min(w / sprite.width, h / sprite.height);
  const dw = sprite.width * scale;
  const dh = sprite.height * scale;
  ctx.drawImage(sprite, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Side pod from the front gunship, not a separate cartoon. */
export function drawWingCraft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  blit(ctx, `wing-${Math.round(w)}-${Math.round(h)}`, x, y, w, h, paintWing);
}

/** Ring craft pressed into the saucer box: ring, cockpit, orange vanes. */
export function drawUfoCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  blit(ctx, `ufo-${Math.round(w)}-${Math.round(h)}`, x, y, w, h, paintUfo);
}

/** Nose point, as a fraction of the extracted sheet. Shared by every pose. */
const SHIP_NOSE = { x: 299 / 598, y: 7 / 656 };
const shipPoses: Partial<Record<-1 | 0 | 1, HTMLImageElement>> = {};
let shipPosesStarted = false;

function shipAsset(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}sprites/ship/${file}`;
}

function ensureShipPoses(): void {
  if (shipPosesStarted || typeof Image === 'undefined') return;
  shipPosesStarted = true;
  const files: Array<[-1 | 0 | 1, string]> = [
    [-1, 'lean-left.png'],
    [0, 'neutral.png'],
    [1, 'lean-right.png'],
  ];
  for (const [lean, file] of files) {
    const image = new Image();
    image.decoding = 'async';
    image.src = shipAsset(file);
    shipPoses[lean] = image;
  }
}

function containShip(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = h / image.height;
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = x + w / 2 - image.width * SHIP_NOSE.x * scale;
  const dy = y - image.height * SHIP_NOSE.y * scale;
  ctx.drawImage(image, dx, dy, dw, dh);
}

/**
 * Clean plume under the two bells. It is not a crop of the checkerboard
 * sheet. The same simulation time drives it, so pause holds the flicker.
 */
function drawEngineFlame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number
): void {
  const scale = h / image.height;
  const dx = x + w / 2 - image.width * SHIP_NOSE.x * scale;
  const dy = y - image.height * SHIP_NOSE.y * scale;
  const flicker = prefersReducedMotion() ? 0.7 : 0.55 + 0.45 * Math.abs(Math.sin(time * 16));
  ctx.save();
  for (const fx of [0.225, 0.75]) {
    const cx = dx + image.width * fx * scale;
    const cy = dy + image.height * 0.97 * scale;
    const len = h * (0.16 + 0.07 * flicker);
    const grad = ctx.createLinearGradient(cx, cy, cx, cy + len);
    grad.addColorStop(0, `rgba(255, 236, 200, ${0.85 * flicker})`);
    grad.addColorStop(0.4, `rgba(251, 146, 60, ${0.7 * flicker})`);
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + len * 0.42, Math.max(1.1, w * 0.045), len * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function shipPosesReady(): boolean {
  return ([-1, 0, 1] as const).every((lean) => {
    const image = shipPoses[lean];
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
}

/** Front gunship cut from the approved sheet. The blue-shot panel is not used. */
export function drawPlayerCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  twin: boolean,
  lean: -1 | 0 | 1 = 0
): void {
  ensureShipPoses();
  const image = shipPoses[lean] ?? shipPoses[0];
  if (image && image.complete && image.naturalWidth > 0) {
    drawEngineFlame(ctx, image, x, y, w, h, time);
    containShip(ctx, image, x, y, w, h);
    return;
  }
  blit(ctx, `player-${Math.round(w)}-${Math.round(h)}`, x, y, w, h, paintPlayer);
  const glow = 0.45 + 0.55 * Math.abs(Math.sin(time * 22));
  ctx.save();
  ctx.globalAlpha = 0.35 + glow * 0.55;
  ctx.fillStyle = glow > 0.7 ? '#fdba74' : '#fb923c';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.16, y + h * 0.96, 2.2, 3.1 + glow, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.84, y + h * 0.96, 2.2, 3.1 + glow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!twin) return;
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.1, y + h * 0.4, 1.3, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.9, y + h * 0.4, 1.3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, 0.55);
}

export const SHIP_PANEL_W = 1200;
export const SHIP_PANEL_H = 600;

/** Comparison sheet: gameplay size, twice that, and four times, without overlap. */
export function drawShipPanel(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, SHIP_PANEL_W, SHIP_PANEL_H);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px sans-serif';
  ctx.fillText('1×, 2× e 4×. A nave usa as três poses. Os aliens são os recortes A1–E5.', 16, 22);
  const place = (scale: number, top: number) => {
    const aw = 40 * scale;
    const ah = 30 * scale;
    const gap = 18;
    ALIEN_PALETTES.forEach((palette, index) => {
      const x = 16 + index * (aw + gap);
      drawAlienCraft(ctx, index, 0, x, top, aw, ah, palette);
      drawAlienCraft(ctx, index, 1, x, top + ah + 6, aw, ah, palette);
    });
    const ax = 16 + 3 * (aw + gap) + 28;
    drawPlayerCraft(ctx, ax, top, 50 * scale, 40 * scale, 0.4, true);
    drawUfoCraft(ctx, ax + 50 * scale + 28, top + 8 * scale, 60 * scale, 25 * scale);
    drawWingCraft(ctx, ax + 50 * scale + 60 * scale + 56, top + 4 * scale, 24 * scale, 18 * scale);
  };
  place(1, 36);
  place(2, 130);
  place(4, 310);
}
