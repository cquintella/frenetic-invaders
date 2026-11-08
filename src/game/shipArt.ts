import type { Palette } from './sprites';

const INK = '#000';

function stroke(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function paintCel(
  ctx: CanvasRenderingContext2D,
  trace: () => void,
  light: string,
  body: string,
  dark: string,
  width: number,
  w: number,
  h: number
): void {
  trace();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.2, w * 0.42, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.96, w * 0.5, h * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  trace();
  stroke(ctx, width);
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  stroke(ctx, 1);
  ctx.beginPath();
  ctx.arc(x + r * 0.25, y, r * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#020617';
  ctx.fill();
}

function squid(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number): void {
  const swing = frame ? 1.8 : -1.8;
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 1);
  ctx.bezierCurveTo(w * 0.78, h * 0.02, w * 0.98, h * 0.28, w * 0.88, h * 0.5);
  ctx.quadraticCurveTo(w * 0.78, h * 0.66, w * 0.66, h * 0.7);
  ctx.quadraticCurveTo(w * 0.8, h * 0.84, w * 0.72 + swing, h - 1);
  ctx.quadraticCurveTo(w * 0.58, h * 0.78, cx, h * 0.74);
  ctx.quadraticCurveTo(w * 0.42, h * 0.78, w * 0.28 - swing, h - 1);
  ctx.quadraticCurveTo(w * 0.2, h * 0.84, w * 0.34, h * 0.7);
  ctx.quadraticCurveTo(w * 0.22, h * 0.66, w * 0.12, h * 0.5);
  ctx.bezierCurveTo(w * 0.02, h * 0.28, w * 0.22, h * 0.02, cx, 1);
  ctx.closePath();
}

function crab(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number): void {
  const open = frame ? 0.16 : 0.04;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.34);
  ctx.bezierCurveTo(w * 0.08, h * 0.16, w * open, h * 0.42, w * 0.06, h * 0.58);
  ctx.bezierCurveTo(w * 0.14, h * 0.7, w * 0.24, h * 0.62, w * 0.3, h * 0.5);
  ctx.bezierCurveTo(w * 0.18, h * 0.62, w * 0.22, h * 0.86, w * 0.34, h * 0.9);
  ctx.bezierCurveTo(w * 0.42, h * 0.78, w * 0.4, h * 0.58, w * 0.36, h * 0.42);
  ctx.bezierCurveTo(w * 0.42, h * 0.22, w * 0.58, h * 0.22, w * 0.64, h * 0.42);
  ctx.bezierCurveTo(w * 0.6, h * 0.58, w * 0.58, h * 0.78, w * 0.66, h * 0.9);
  ctx.bezierCurveTo(w * 0.78, h * 0.86, w * 0.82, h * 0.62, w * 0.7, h * 0.5);
  ctx.bezierCurveTo(w * 0.76, h * 0.62, w * 0.86, h * 0.7, w * 0.94, h * 0.58);
  ctx.bezierCurveTo(w * (1 - open), h * 0.42, w * 0.92, h * 0.16, w * 0.72, h * 0.34);
  ctx.bezierCurveTo(w * 0.64, h * 0.16, w * 0.36, h * 0.16, w * 0.28, h * 0.34);
  ctx.closePath();
}

function octopus(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number): void {
  const swing = frame ? 2.2 : -2.2;
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 1.5);
  ctx.bezierCurveTo(w * 0.86, h * 0.02, w * 0.98, h * 0.36, w * 0.84, h * 0.52);
  ctx.quadraticCurveTo(w * 0.9, h * 0.78, w * 0.78 + swing, h - 1);
  ctx.quadraticCurveTo(w * 0.68, h * 0.72, w * 0.62, h * 0.62);
  ctx.quadraticCurveTo(w * 0.66, h * 0.9, cx + swing * 0.3, h - 1);
  ctx.quadraticCurveTo(w * 0.42, h * 0.72, w * 0.38, h * 0.62);
  ctx.quadraticCurveTo(w * 0.32, h * 0.9, w * 0.22 - swing, h - 1);
  ctx.quadraticCurveTo(w * 0.1, h * 0.78, w * 0.16, h * 0.52);
  ctx.bezierCurveTo(w * 0.02, h * 0.36, w * 0.14, h * 0.02, cx, 1.5);
  ctx.closePath();
}

/** Smooth alien inside the 40×30 hit box. The two march frames only move the limbs. */
export function drawAlienCraft(
  ctx: CanvasRenderingContext2D,
  type: number,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette
): void {
  ctx.save();
  ctx.translate(x, y);
  const trace = () => {
    if (type % 3 === 1) crab(ctx, w, h, frame);
    else if (type % 3 === 2) octopus(ctx, w, h, frame);
    else squid(ctx, w, h, frame);
  };
  paintCel(ctx, trace, palette.light, palette.body, palette.dark, 1.25, w, h);
  if (type % 3 === 1) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h * 0.2);
    ctx.quadraticCurveTo(w * 0.34, 0, w * 0.28, 1);
    ctx.moveTo(w * 0.62, h * 0.2);
    ctx.quadraticCurveTo(w * 0.66, 0, w * 0.72, 1);
    ctx.stroke();
  }
  const eyeY = h * 0.4;
  const eyeR = Math.max(1.6, w * 0.07);
  eye(ctx, w * 0.38, eyeY, eyeR);
  eye(ctx, w * 0.62, eyeY, eyeR);
  ctx.restore();
}

/** Escort pod. Curves, not the 8×6 block map. */
export function drawWingCraft(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 1);
    ctx.bezierCurveTo(w * 0.78, 1, w * 0.92, h * 0.28, w * 0.86, h * 0.48);
    ctx.bezierCurveTo(w * 0.96, h * 0.7, w * 0.78, h - 1, w * 0.5, h - 1);
    ctx.bezierCurveTo(w * 0.22, h - 1, w * 0.04, h * 0.7, w * 0.14, h * 0.48);
    ctx.bezierCurveTo(w * 0.08, h * 0.28, w * 0.22, 1, w * 0.5, 1);
    ctx.closePath();
  };
  paintCel(ctx, trace, '#ecfeff', '#22d3ee', '#0e7490', 1.2, w, h);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.22, w * 0.1, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 1);
  ctx.restore();
}

/** Player gunship inside the 50×40 hit box. Nose points up. */
export function drawPlayerCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  twin: boolean
): void {
  ctx.save();
  ctx.translate(x, y);
  const trace = () => {
    const cx = w / 2;
    ctx.beginPath();
    ctx.moveTo(cx, 1);
    ctx.bezierCurveTo(cx + w * 0.1, h * 0.16, cx + w * 0.16, h * 0.24, cx + w * 0.2, h * 0.4);
    ctx.lineTo(w - 1, h * 0.58);
    ctx.bezierCurveTo(w + 1, h * 0.74, w * 0.82, h * 0.9, w * 0.68, h * 0.78);
    ctx.lineTo(cx + w * 0.1, h * 0.7);
    ctx.quadraticCurveTo(cx + w * 0.08, h - 1, cx, h * 0.86);
    ctx.quadraticCurveTo(cx - w * 0.08, h - 1, cx - w * 0.1, h * 0.7);
    ctx.lineTo(w * 0.32, h * 0.78);
    ctx.bezierCurveTo(w * 0.18, h * 0.9, -1, h * 0.74, 1, h * 0.58);
    ctx.lineTo(cx - w * 0.2, h * 0.4);
    ctx.bezierCurveTo(cx - w * 0.16, h * 0.24, cx - w * 0.1, h * 0.16, cx, 1);
    ctx.closePath();
  };
  paintCel(ctx, trace, '#f8fafc', '#d5dde4', '#5c6b78', 1.4, w, h);
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.48);
  ctx.lineTo(w * 0.68, h * 0.48);
  ctx.lineTo(w * 0.6, h * 0.58);
  ctx.lineTo(w * 0.4, h * 0.58);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 1);
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.32, w * 0.11, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  stroke(ctx, 1.1);
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.ellipse(w / 2 - 1, h * 0.28, w * 0.045, h * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fill();
  const glow = 0.55 + 0.45 * Math.sin(time * 28);
  ctx.fillStyle = glow > 0.5 ? '#fdba74' : '#fb923c';
  ctx.beginPath();
  ctx.ellipse(w * 0.22, h * 0.7, 2.2, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.78, h * 0.7, 2.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (twin) {
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(w * 0.08, h * 0.52, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.92, h * 0.52, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    stroke(ctx, 1);
  }
  ctx.restore();
}
