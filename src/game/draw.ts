import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LASER_MAX,
  PLASMA_GIRTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  SHIELD_MAX,
  WING_SHOTS,
} from './constants';
import { prefersReducedMotion } from './motion';
import { ALIEN_PALETTES } from './sprites';
import { drawAlienCraft, drawPlayerCraft, drawWingCraft } from './shipArt';
import { drawSky } from './sky';
import type { World } from './types';

function paintInvader(ctx: CanvasRenderingContext2D, world: World, inv: World['invaders'][number], x: number, y: number): void {
  const palette = ALIEN_PALETTES[inv.type % ALIEN_PALETTES.length];
  if (!palette) return;
  drawAlienCraft(ctx, inv.type, world.anim, x, y, inv.width, inv.height, palette);
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
    ctx.beginPath();
    ctx.arc(15 + i * 14, h / 2 + 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
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
  // Length stays. Width, core and glow are 40% of the previous teardrop.
  const reach = 26 * pulse;
  const girth = PLASMA_GIRTH * pulse;
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
  ctx.ellipse(0, reach * 0.02, Math.max(0.48, girth * 0.28), reach * 0.34, 0, 0, Math.PI * 2);
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
    if (!bomb.active || bomb.exploding) continue;
    const w = bomb.width;
    const h = bomb.height;
    ctx.save();
    ctx.translate(bomb.x + w / 2, bomb.y + h / 2);
    if (bomb.speed < 0) ctx.scale(1, -1);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-w * 0.2, -h * 0.3, w * 0.4, h * 0.5);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w * 0.2, -h * 0.3, w * 0.4, h * 0.5);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, h * 0.2);
    ctx.lineTo(w * 0.2, h * 0.2);
    ctx.lineTo(0, h * 0.5);
    ctx.fill();
    ctx.stroke();
    const flame = 6 + Math.sin(world.time * 40 + bomb.x) * 4;
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, -h * 0.3);
    ctx.lineTo(w * 0.1, -h * 0.3);
    ctx.lineTo(0, -h * 0.3 - flame);
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
    drawWingCraft(ctx, x, y, wing.width, wing.height);
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
    drawPlayerCraft(ctx, x, y, PLAYER_WIDTH, PLAYER_HEIGHT, world.time, world.twin > 0);
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
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
  drawBlasts(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
}
