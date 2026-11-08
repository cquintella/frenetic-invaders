import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LASER_MAX,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  SHIELD_MAX,
  WING_SHOTS,
} from './constants';
import { prefersReducedMotion } from './motion';
import {
  ALIEN_FRAMES,
  ALIEN_PALETTES,
  celShade,
  PLAYER_COLORS,
  PLAYER_COLS,
  PLAYER_MAP,
  PLAYER_ROWS,
  SHIP_INK_PX,
  WING_COLORS,
  WING_MAP,
} from './sprites';
import { drawSky } from './sky';
import type { World } from './types';

type Edge = 'light' | 'body' | 'dark';

function edgeOf(map: readonly number[], cols: number, index: number): Edge {
  const row = Math.floor(index / cols);
  const rows = map.length / cols;
  const above = row > 0 ? map[index - cols] : 0;
  const below = row < rows - 1 ? map[index + cols] : 0;
  if (!above) return 'light';
  if (!below) return 'dark';
  return 'body';
}

function drawBitmap(
  ctx: CanvasRenderingContext2D,
  map: readonly number[],
  cols: number,
  x: number,
  y: number,
  pixelW: number,
  pixelH: number,
  colorOf: (value: number, edge: Edge) => string | null
): void {
  const rows = map.length / cols;
  const ink = SHIP_INK_PX;
  ctx.fillStyle = '#000';
  for (let index = 0; index < map.length; index++) {
    if (!map[index]) continue;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const left = col > 0 ? map[index - 1] : 0;
    const right = col < cols - 1 ? map[index + 1] : 0;
    const above = row > 0 ? map[index - cols] : 0;
    const below = row < rows - 1 ? map[index + cols] : 0;
    const x0 = x + col * pixelW;
    const y0 = y + row * pixelH;
    if (!left) ctx.fillRect(x0 - ink, y0, ink, pixelH);
    if (!right) ctx.fillRect(x0 + pixelW, y0, ink, pixelH);
    if (!above) ctx.fillRect(x0, y0 - ink, pixelW, ink);
    if (!below) ctx.fillRect(x0, y0 + pixelH, pixelW, ink);
    if (!left && !above) ctx.fillRect(x0 - ink, y0 - ink, ink, ink);
    if (!right && !above) ctx.fillRect(x0 + pixelW, y0 - ink, ink, ink);
    if (!left && !below) ctx.fillRect(x0 - ink, y0 + pixelH, ink, ink);
    if (!right && !below) ctx.fillRect(x0 + pixelW, y0 + pixelH, ink, ink);
  }
  for (let index = 0; index < map.length; index++) {
    const value = map[index] ?? 0;
    if (value === 0) continue;
    const color = colorOf(value, edgeOf(map, cols, index));
    if (!color) continue;
    const row = Math.floor(index / cols);
    const col = index % cols;
    ctx.fillStyle = color;
    ctx.fillRect(x + col * pixelW, y + row * pixelH, pixelW, pixelH);
  }
}

function paintInvader(ctx: CanvasRenderingContext2D, world: World, inv: World['invaders'][number], x: number, y: number): void {
  const frames = ALIEN_FRAMES[inv.type % ALIEN_FRAMES.length];
  const map = frames?.[world.anim] ?? frames?.[0];
  const palette = ALIEN_PALETTES[inv.type % ALIEN_PALETTES.length];
  if (!map || !palette) return;
  const pw = inv.width / 8;
  const ph = inv.height / 8;
  const shaded = celShade(map, 8);
  drawBitmap(ctx, shaded, 8, x, y, pw, ph, (value, edge) => {
    if (value === 3) return palette.light;
    if (value === 2) return palette.dark;
    return palette[edge];
  });
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x + 2 * pw, y + 3 * ph, pw, ph);
  ctx.fillRect(x + 5 * pw, y + 3 * ph, pw, ph);
  ctx.fillStyle = '#000';
  const pupil = Math.max(1, Math.min(pw, ph) * 0.4);
  ctx.fillRect(x + 3 * pw - pupil, y + 3 * ph, pupil, pupil);
  ctx.fillRect(x + 6 * pw - pupil, y + 3 * ph, pupil, pupil);
}

function drawInvaders(ctx: CanvasRenderingContext2D, world: World): void {
  const settled = [];
  const divers = [];
  for (const inv of world.invaders) {
    if (!inv.alive) continue;
    if (inv.dive) divers.push(inv);
    else settled.push(inv);
  }
  for (const inv of settled) paintInvader(ctx, world, inv, Math.round(inv.x), Math.round(inv.y));
  for (const inv of divers) {
    const dive = inv.dive;
    if (dive) {
      ctx.globalAlpha = 0.35;
      paintInvader(ctx, world, inv, Math.round(inv.x - dive.side * 8), Math.round(inv.y - 6));
      ctx.globalAlpha = 1;
    }
    paintInvader(ctx, world, inv, Math.round(inv.x), Math.round(inv.y));
  }
}

function strokeInk(ctx: CanvasRenderingContext2D, width = 1.5): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = '#000';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawUfo(ctx: CanvasRenderingContext2D, world: World): void {
  const ufo = world.ufo;
  if (!ufo || !ufo.active) return;
  for (const bit of ufo.trail) {
    ctx.globalAlpha = Math.max(0, bit.life / 0.4) * 0.45;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.ellipse(bit.x, bit.y, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const x = ufo.x;
  const y = ufo.y;
  const w = ufo.width;
  const h = ufo.height;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 1, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9aa4b2';
  ctx.fill();
  strokeInk(ctx, 1.5);
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 - 1, w / 2 - 8, h / 3.2, 0, Math.PI, 0);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 4, w / 2 - 10, h / 5, 0, 0, Math.PI);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, h / 2 + 1);
  ctx.lineTo(w - 6, h / 2 + 1);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 10, Math.PI, 0);
  ctx.fillStyle = '#7dd3fc';
  ctx.fill();
  strokeInk(ctx, 1.25);
  ctx.beginPath();
  ctx.arc(w / 2 + 2, h / 2 - 1, 6, Math.PI * 1.15, Math.PI * 1.85);
  ctx.fillStyle = '#0369a1';
  ctx.fill();
  const lights = ['#fdba74', '#fb7185', '#67e8f9'];
  const blink = Math.floor(world.time * 6);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = lights[(blink + i) % lights.length] ?? '#fff';
    ctx.fillRect(12 + i * 14, h / 2 + 1, 5, 4);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(12 + i * 14, h / 2 + 1, 5, 4);
  }
  ctx.restore();
}

function drawPickups(ctx: CanvasRenderingContext2D, world: World): void {
  for (const pickup of world.pickups) {
    if (!pickup.active) continue;
    const color = pickup.kind === 'wing' ? '#22d3ee' : pickup.kind === 'twin' ? '#fbbf24' : '#4ade80';
    const bob = Math.sin(world.time * 8 + pickup.x) * 2;
    const x = pickup.x;
    const y = pickup.y + bob;
    const cx = x + pickup.width / 2;
    const cy = y + pickup.height / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + pickup.width, cy);
    ctx.lineTo(cx, y + pickup.height);
    ctx.lineTo(x, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#041018';
    if (pickup.kind === 'wing') {
      ctx.fillRect(cx - 2, cy - 6, 4, 10);
      ctx.fillRect(cx - 6, cy - 1, 12, 3);
    } else if (pickup.kind === 'twin') {
      ctx.fillRect(cx - 5, cy - 6, 3, 12);
      ctx.fillRect(cx + 2, cy - 6, 3, 12);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#041018';
      ctx.stroke();
    }
  }
}

function drawPlasma(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  pointUp: boolean,
  core: string,
  mid: string
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pulse = 0.86 + 0.14 * Math.sin(time * 14 + cx * 0.37);
  // Drawn larger than the 4×12 hit box. Collision stays on the rect.
  const reach = 26 * pulse;
  const girth = 7.2 * pulse;
  ctx.save();
  ctx.translate(cx, cy);
  if (!pointUp) ctx.rotate(Math.PI);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 1.15);
  glow.addColorStop(0, core);
  glow.addColorStop(0.35, mid);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, girth * 2.1, reach * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(0, -reach);
  ctx.bezierCurveTo(girth, -reach * 0.15, girth * 0.8, reach * 0.35, 0, reach * 0.62);
  ctx.bezierCurveTo(-girth * 0.8, reach * 0.35, -girth, -reach * 0.15, 0, -reach);
  ctx.fillStyle = mid;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, reach * 0.02, Math.max(1.2, girth * 0.28), reach * 0.34, 0, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
  ctx.restore();
}

function drawFriendlyBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const bullet of world.bullets) {
    if (!bullet.active) continue;
    drawPlasma(ctx, bullet.x, bullet.y, bullet.width, bullet.height, world.time, true, '#ffffff', '#67e8f9');
  }
}

function drawEnemyBullets(ctx: CanvasRenderingContext2D, world: World): void {
  for (const bullet of world.enemyBullets) {
    if (!bullet.active) continue;
    drawPlasma(ctx, bullet.x, bullet.y, bullet.width, bullet.height, world.time, false, '#fff7ed', '#ef4444');
  }
}

function drawBeams(ctx: CanvasRenderingContext2D, world: World): void {
  for (const beam of world.beams) {
    if (!beam.active) continue;
    const gradient = ctx.createLinearGradient(beam.x, 0, beam.x + beam.width, 0);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0)');
    gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.75)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(beam.x, 0, beam.width, world.player.y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(beam.x + beam.width / 2 - 2, 0, 4, world.player.y);
  }
}

function drawBombs(ctx: CanvasRenderingContext2D, world: World): void {
  for (const bomb of world.bombs) {
    if (!bomb.active) continue;
    if (!bomb.exploding) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(bomb.x + bomb.width * 0.3, bomb.y + bomb.height * 0.2, bomb.width * 0.4, bomb.height * 0.5);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(bomb.x + bomb.width * 0.3, bomb.y + bomb.height * 0.7);
      ctx.lineTo(bomb.x + bomb.width * 0.7, bomb.y + bomb.height * 0.7);
      ctx.lineTo(bomb.x + bomb.width * 0.5, bomb.y + bomb.height);
      ctx.fill();
      const flame = 6 + Math.sin(world.time * 40) * 4;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(bomb.x + bomb.width * 0.4, bomb.y + bomb.height * 0.2);
      ctx.lineTo(bomb.x + bomb.width * 0.6, bomb.y + bomb.height * 0.2);
      ctx.lineTo(bomb.x + bomb.width * 0.5, bomb.y + bomb.height * 0.2 - flame);
      ctx.fill();
      continue;
    }
  }
}

function drawWingBombs(ctx: CanvasRenderingContext2D, world: World): void {
  for (const bomb of world.wingBombs) {
    if (!bomb.active) continue;
    const x = bomb.x;
    const y = bomb.y;
    const w = bomb.width;
    const h = bomb.height;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 - 12);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.85, h * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-w * 0.22, -h * 0.2, w * 0.44, h * 0.46);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w * 0.22, -h * 0.2, w * 0.44, h * 0.46);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -h * 0.2);
    ctx.lineTo(w * 0.22, -h * 0.2);
    ctx.lineTo(0, -h * 0.55);
    ctx.fill();
    ctx.stroke();
    const flame = 4 + Math.sin(world.time * 30 + x) * 2;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, h * 0.26);
    ctx.lineTo(w * 0.12, h * 0.26);
    ctx.lineTo(0, h * 0.26 + flame);
    ctx.fill();
    ctx.restore();
  }
}

function drawBlasts(ctx: CanvasRenderingContext2D, world: World): void {
  for (const blast of world.blasts) {
    const age = blast.age;
    const flashWindow = blast.reduced ? 0.22 : 0.14;
    const flash = Math.max(0, 1 - age / flashWindow);
    const flashAlpha = flash * flash * (blast.reduced ? 0.26 : 0.48);
    if (flashAlpha > 0.02) {
      const radius = 8 + age * 80;
      const glow = ctx.createRadialGradient(blast.x, blast.y, 0, blast.x, blast.y, radius);
      glow.addColorStop(0, `rgba(255, 252, 240, ${flashAlpha})`);
      glow.addColorStop(0.45, `rgba(255, 170, 40, ${flashAlpha * 0.65})`);
      glow.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    const core = Math.max(0, 1 - age / 0.42);
    if (core > 0) {
      const radius = 6 + age * 34;
      const glow = ctx.createRadialGradient(blast.x, blast.y, 0, blast.x, blast.y, radius);
      glow.addColorStop(0, `rgba(255, 244, 214, ${core * 0.8})`);
      glow.addColorStop(0.55, `rgba(255, 110, 20, ${core * 0.4})`);
      glow.addColorStop(1, 'rgba(80, 16, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    const waveLife = blast.reduced ? 0.7 : 0.55;
    const wave = Math.max(0, 1 - age / waveLife);
    if (wave > 0) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 228, 180, ${wave * 0.72})`;
      ctx.lineWidth = 2;
      ctx.arc(blast.x, blast.y, 8 + age * (blast.reduced ? 110 : 190), 0, Math.PI * 2);
      ctx.stroke();
      if (!blast.reduced && age > 0.05) {
        const second = Math.max(0, 1 - (age - 0.05) / 0.5);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 120, 40, ${second * 0.4})`;
        ctx.lineWidth = 1.25;
        ctx.arc(blast.x, blast.y, 4 + (age - 0.05) * 140, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function drawWings(ctx: CanvasRenderingContext2D, world: World): void {
  for (const wing of world.wings) {
    const x = Math.round(wing.x);
    const y = Math.round(wing.y);
    drawBitmap(ctx, WING_MAP, 8, x, y, 3, 3, (value, edge) => WING_COLORS[value]?.[edge] ?? null);
    const ratio = WING_SHOTS <= 0 ? 0 : world.wingShots / WING_SHOTS;
    ctx.fillStyle = 'rgba(8, 47, 73, 0.8)';
    ctx.fillRect(x, y + wing.height + 2, wing.width, 2);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(x, y + wing.height + 2, wing.width * Math.max(0, Math.min(1, ratio)), 2);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: World): void {
  const x = Math.round(world.player.x);
  const y = Math.round(world.player.y);
  const cx = x + PLAYER_WIDTH / 2;
  const cy = y + PLAYER_HEIGHT / 2;

  if (world.shield > 0) {
    ctx.beginPath();
    ctx.strokeStyle = world.shield > 1 ? 'rgba(34, 211, 238, 0.65)' : 'rgba(248, 113, 113, 0.8)';
    ctx.lineWidth = 2;
    ctx.arc(cx, cy, 32, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(34, 211, 238, ${world.flash * 0.35})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  const hidden = world.iframe > 0 && Math.floor(world.time * 14) % 2 === 0;
  if (!hidden) {
    const pixel = 3;
    const spriteW = PLAYER_COLS * pixel;
    const spriteH = PLAYER_ROWS * pixel;
    const sx = x + Math.round((PLAYER_WIDTH - spriteW) / 2);
    const sy = y + PLAYER_HEIGHT - spriteH;
    drawBitmap(ctx, PLAYER_MAP, PLAYER_COLS, sx, sy, pixel, pixel, (value, edge) => PLAYER_COLORS[value]?.[edge] ?? null);
    ctx.fillStyle = Math.sin(world.time * 28) > 0 ? '#fdba74' : '#fb923c';
    ctx.fillRect(sx + 2 * pixel, sy + 7 * pixel, pixel, pixel * 2);
    ctx.fillRect(sx + 13 * pixel, sy + 7 * pixel, pixel, pixel * 2);
    if (world.twin > 0) {
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(sx, sy + 6 * pixel, pixel, pixel * 2);
      ctx.fillRect(sx + 15 * pixel, sy + 6 * pixel, pixel, pixel * 2);
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, world: World): void {
  for (const particle of world.particles) {
    const alpha = Math.max(0, particle.life / particle.max);
    const kind = particle.kind ?? 'pixel';
    ctx.globalAlpha = kind === 'smoke' ? alpha * 0.4 : alpha;
    ctx.fillStyle = particle.color;
    if (kind === 'smoke') {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (kind === 'debris') {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rot ?? 0);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.62);
      ctx.restore();
      continue;
    }
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  for (const floater of world.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life / floater.max);
    ctx.fillStyle = floater.color;
    ctx.fillText(`+${floater.value}`, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

function drawPips(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  max: number,
  on: string,
  off: string
): void {
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < count ? on : off;
    ctx.fillRect(x + i * 14, y, 10, 10);
  }
}

function drawHud(ctx: CanvasRenderingContext2D, world: World): void {
  const barY = CANVAS_HEIGHT - 30;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, barY, CANVAS_WIDTH, 30);
  ctx.font = 'bold 12px monospace';
  ctx.textBaseline = 'middle';
  const mid = barY + 15;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('LAS', 12, mid);
  drawPips(ctx, 48, barY + 10, world.lasers, LASER_MAX, '#22d3ee', '#134e4a');

  const bits: string[] = [];
  if (world.wings.length > 0) bits.push(`SIDE ${world.wingShots}`);
  if (world.twin > 0) bits.push('TWIN');
  if (bits.length > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(bits.join('   '), CANVAS_WIDTH / 2, mid);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = world.shield > 1 ? '#67e8f9' : '#fca5a5';
  ctx.fillText('SHD', CANVAS_WIDTH - 12, mid);
  const shieldOn = world.shield > 1 ? '#22d3ee' : '#f87171';
  drawPips(ctx, CANVAS_WIDTH - 118, barY + 10, world.shield, SHIELD_MAX, shieldOn, '#3f1d1d');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (!prefersReducedMotion() && world.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * world.shake * 2, (Math.random() - 0.5) * world.shake * 2);
  }
  drawSky(ctx, world.sky, world.camera);
  drawInvaders(ctx, world);
  drawUfo(ctx, world);
  drawPickups(ctx, world);
  drawBombs(ctx, world);
  drawEnemyBullets(ctx, world);
  drawBeams(ctx, world);
  drawFriendlyBullets(ctx, world);
  drawWings(ctx, world);
  drawPlayer(ctx, world);
  drawWingBombs(ctx, world);
  drawBlasts(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
}
