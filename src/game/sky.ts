import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';
import type { Sky, SkyBody, SkyGas, SkyMeteor, SkyPuff, SkyStar, SkyStarSheet } from './types';

export const SKY_THEME_COUNT = 4;

type StarPattern = 'field' | 'bands' | 'clusters' | 'lattice';

interface ThemeSpec {
  top: string;
  mid: string;
  low: string;
  pattern: StarPattern;
  star: readonly [string, string];
  planet: readonly [string, string, string];
  moon: readonly [string, string];
  rock: string;
  comet: readonly [string, string];
  /** RGB triples, body then bright core, three clouds. */
  gas: readonly (readonly [string, string])[];
  meteor: string;
  ring: boolean;
}

const THEMES: readonly ThemeSpec[] = [
  {
    top: '#02010c',
    mid: '#0a1438',
    low: '#061018',
    pattern: 'field',
    star: ['#9bb6ff', '#f8fafc'],
    planet: ['#1d4e89', '#071525', '#7dd3fc'],
    moon: ['#e2e8f0', '#64748b'],
    rock: '#94a3b8',
    comet: ['#e0f2fe', '#7dd3fc'],
    gas: [
      ['56, 189, 248', '224, 242, 254'],
      ['30, 64, 175', '125, 211, 252'],
      ['14, 165, 233', '240, 249, 255'],
    ],
    meteor: '#bae6fd',
    ring: false,
  },
  {
    top: '#1a0904',
    mid: '#3f1608',
    low: '#140804',
    pattern: 'bands',
    star: ['#fdba74', '#fff7ed'],
    planet: ['#9a3412', '#431407', '#fed7aa'],
    moon: ['#fecdd3', '#9f1239'],
    rock: '#d6d3d1',
    comet: ['#ffedd5', '#fb923c'],
    gas: [
      ['251, 146, 60', '255, 237, 213'],
      ['185, 28, 28', '254, 215, 170'],
      ['234, 88, 12', '255, 247, 237'],
    ],
    meteor: '#fdba74',
    ring: false,
  },
  {
    top: '#14061c',
    mid: '#3b0764',
    low: '#1e1033',
    pattern: 'clusters',
    star: ['#f0abfc', '#fae8ff'],
    planet: ['#6b21a8', '#2e1065', '#e9d5ff'],
    moon: ['#ddd6fe', '#5b21b6'],
    rock: '#c4b5fd',
    comet: ['#fae8ff', '#e879f9'],
    gas: [
      ['192, 38, 211', '250, 232, 255'],
      ['126, 34, 206', '243, 232, 255'],
      ['219, 39, 119', '253, 242, 248'],
    ],
    meteor: '#f0abfc',
    ring: true,
  },
  {
    top: '#022c22',
    mid: '#064e3b',
    low: '#042f2e',
    pattern: 'lattice',
    star: ['#6ee7b7', '#ecfdf5'],
    planet: ['#0f766e', '#042f2e', '#99f6e4'],
    moon: ['#ccfbf1', '#115e59'],
    rock: '#a8a29e',
    comet: ['#ecfdf5', '#5eead4'],
    gas: [
      ['16, 185, 129', '209, 250, 229'],
      ['15, 118, 110', '153, 246, 228'],
      ['52, 211, 153', '236, 253, 245'],
    ],
    meteor: '#5eead4',
    ring: false,
  },
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mix = Math.imul(state ^ (state >>> 15), 1 | state);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}

function wrapPeriod(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function starTint(rand: () => number): string {
  const roll = rand();
  if (roll < 0.7) return '#f8fafc';
  if (roll < 0.82) return '#bfdbfe';
  if (roll < 0.91) return '#fde68a';
  if (roll < 0.97) return '#fecaca';
  return '#a5f3fc';
}

function placeStar(
  sheet: SkyStarSheet,
  x: number,
  y: number,
  size: number,
  alpha: number,
  kind: number,
  color: string
): void {
  sheet.stars.push({
    x: wrapPeriod(x, CANVAS_WIDTH),
    y: wrapPeriod(y, CANVAS_HEIGHT),
    size,
    alpha,
    kind,
    color,
  });
}

function dust(rand: () => number, sheet: SkyStarSheet, count: number, size: number): void {
  for (let i = 0; i < count; i++) {
    const bright = rand() > 0.92;
    placeStar(
      sheet,
      rand() * CANVAS_WIDTH,
      rand() * CANVAS_HEIGHT,
      bright ? size * 1.7 : size,
      bright ? 0.75 + rand() * 0.25 : 0.18 + rand() * 0.55,
      bright ? 1 : 0,
      starTint(rand)
    );
  }
}

function spikes(rand: () => number, sheet: SkyStarSheet, count: number, spread: number, cx: number, cy: number): void {
  for (let i = 0; i < count; i++) {
    placeStar(
      sheet,
      cx + (rand() - 0.5) * spread,
      cy + (rand() - 0.5) * spread,
      1.6 + rand() * 1.2,
      0.85 + rand() * 0.15,
      2,
      rand() < 0.75 ? '#ffffff' : starTint(rand)
    );
  }
}

function paintPattern(pattern: StarPattern, rand: () => number, sheet: SkyStarSheet, count: number, size: number): void {
  dust(rand, sheet, count, size);
  if (pattern === 'field') {
    spikes(rand, sheet, 8, CANVAS_WIDTH, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return;
  }
  if (pattern === 'bands') {
    for (let i = 0; i < Math.round(count * 0.7); i++) {
      const along = rand() * CANVAS_WIDTH * 1.4;
      const across = (rand() - 0.5) * 150;
      placeStar(sheet, along + across * 0.4, along * 0.55 + across, size, 0.25 + rand() * 0.6, 0, starTint(rand));
    }
    spikes(rand, sheet, 6, CANVAS_WIDTH, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return;
  }
  if (pattern === 'clusters') {
    const cx = 180 + rand() * (CANVAS_WIDTH - 360);
    const cy = 80 + rand() * 220;
    for (let i = 0; i < 160; i++) {
      const reach = Math.pow(rand(), 0.45) * 150;
      const angle = rand() * Math.PI * 2;
      placeStar(
        sheet,
        cx + Math.cos(angle) * reach,
        cy + Math.sin(angle) * reach,
        size * (i < 24 ? 1.8 : 1),
        0.35 + (1 - reach / 150) * 0.6,
        i < 10 ? 2 : 1,
        i < 10 ? '#ffffff' : starTint(rand)
      );
    }
    return;
  }
  const marks: ReadonlyArray<readonly [number, number]> = [
    [0.28, 0.22],
    [0.36, 0.3],
    [0.42, 0.4],
    [0.4, 0.52],
    [0.48, 0.58],
    [0.62, 0.34],
    [0.7, 0.46],
  ];
  for (const mark of marks) {
    placeStar(sheet, mark[0] * CANVAS_WIDTH, mark[1] * CANVAS_HEIGHT, 2.2, 0.95, 2, '#ffffff');
  }
  spikes(rand, sheet, 4, 220, CANVAS_WIDTH * 0.75, CANVAS_HEIGHT * 0.72);
}

function makeGas(rand: () => number, color: string, core: string, speed: number, drift: number): SkyGas {
  const reach = 150 + rand() * 80;
  const lobes: SkyPuff[] = [{ ox: 0, oy: 0, r: reach * 0.55, alpha: 0.22 }];
  for (let i = 0; i < 6; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * reach * 0.5;
    lobes.push({
      ox: Math.cos(angle) * dist,
      oy: Math.sin(angle) * dist * 0.75,
      r: reach * (0.38 + rand() * 0.5),
      alpha: 0.1 + rand() * 0.12,
    });
  }
  const knots: SkyPuff[] = [];
  for (let i = 0; i < 4; i++) {
    knots.push({
      ox: (rand() - 0.5) * reach * 0.85,
      oy: (rand() - 0.5) * reach * 0.6,
      r: reach * (0.16 + rand() * 0.22),
      alpha: 0.28 + rand() * 0.25,
    });
  }
  return {
    x: rand() * CANVAS_WIDTH,
    y: rand() * CANVAS_HEIGHT,
    speed,
    drift,
    color,
    core,
    reach,
    tilt: (rand() - 0.5) * 0.9,
    lobes,
    knots,
  };
}

function shuffle(items: number[]): number[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i] ?? 0;
    copy[i] = copy[j] ?? 0;
    copy[j] = swap;
  }
  return copy;
}

function moonPaint(face: number): { fill: string; shade: string; accent: string } {
  if (face === 1) return { fill: '#e7b56a', shade: '#9a3412', accent: '#fde8c8' };
  if (face === 2) return { fill: '#f4efe6', shade: '#a8a29e', accent: '#fffaf3' };
  if (face === 3) return { fill: '#e7c27a', shade: '#92400e', accent: '#f6e7c1' };
  return { fill: '#d6d3d1', shade: '#3f3f46', accent: '#f5f5f4' };
}

function sheet(pattern: StarPattern, rand: () => number, color: string, count: number, size: number, speed: number, drift: number): SkyStarSheet {
  const layer: SkyStarSheet = { speed, drift, color, stars: [] };
  paintPattern(pattern, rand, layer, count, size);
  return layer;
}

/** Theme for this wave. Four skies, then the cycle repeats. */
export function createSky(level: number): Sky {
  const theme = ((Math.max(1, level) - 1) % SKY_THEME_COUNT + SKY_THEME_COUNT) % SKY_THEME_COUNT;
  const spec = THEMES[theme] ?? THEMES[0];
  const rand = mulberry32(0x51e0 + theme * 997);
  const farCount = spec.pattern === 'clusters' ? 180 : spec.pattern === 'bands' ? 340 : 480;
  const stars = [
    sheet(spec.pattern, rand, spec.star[0], farCount, 1, 6, 4),
    sheet('field', rand, spec.star[1], 70, 1.4, 8, 7),
  ];
  const bodies: SkyBody[] = [];
  const planetX = 90 + rand() * (CANVAS_WIDTH - 180);
  const planetY = 70 + rand() * 120;
  bodies.push({
    kind: 'planet',
    x: planetX,
    y: planetY,
    radius: 48 + rand() * 18,
    speed: 10,
    vx: 0,
    vy: 0,
    drift: 14,
    spin: rand() * Math.PI,
    face: 0,
    fill: spec.planet[0],
    shade: spec.planet[1],
    accent: spec.planet[2],
  });
  const moonCount = 1 + Math.floor(Math.random() * 4);
  const moonFaces = shuffle([0, 1, 2, 3]);
  const moonRadii = shuffle([36, 24, 15, 9]);
  for (let i = 0; i < moonCount; i++) {
    const face = moonFaces[i] ?? 0;
    const paint = moonPaint(face);
    bodies.push({
      kind: 'moon',
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT - 40),
      radius: (moonRadii[i] ?? 12) + Math.random() * 4,
      speed: 13 + i * 4,
      vx: 0,
      vy: 0,
      drift: 16 + i * 3,
      spin: Math.random() * Math.PI * 2,
      face,
      fill: paint.fill,
      shade: paint.shade,
      accent: paint.accent,
    });
  }
  for (let i = 0; i < 4; i++) {
    const gray = rand() < 0.5;
    bodies.push({
      kind: 'asteroid',
      x: rand() * CANVAS_WIDTH,
      y: 30 + rand() * (CANVAS_HEIGHT - 160),
      radius: 11 + rand() * 14,
      speed: 18 + i * 1.6,
      vx: 0,
      vy: 0,
      drift: 20 + i,
      spin: rand() * Math.PI * 2,
      face: 0,
      fill: gray ? '#c4bbb2' : '#8f877e',
      shade: '#2a2622',
      accent: '#f5f5f4',
    });
  }
  const cometCount = Math.random() < 0.3 ? 2 : 1;
  for (let i = 0; i < cometCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const pace = 48 + Math.random() * 56;
    bodies.push({
      kind: 'comet',
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      radius: i === 0 ? 16 + Math.random() * 8 : 12 + Math.random() * 3,
      speed: pace,
      vx: Math.cos(angle) * pace,
      vy: Math.sin(angle) * pace,
      drift: 27 + i,
      spin: 0,
      face: 0,
      fill: '#f8fafc',
      shade: '#292524',
      accent: spec.comet[1],
    });
  }
  const gases: SkyGas[] = spec.gas.map((pair, index) =>
    makeGas(rand, pair[0], pair[1], 48 + index * 22, 36 + index * 12)
  );
  const meteors: SkyMeteor[] = [];
  for (let i = 0; i < 1; i++) {
    const sign = i % 2 === 0 ? -1 : 1;
    meteors.push({
      x: 70 + i * 170,
      y: 40 + rand() * (CANVAS_HEIGHT - 80),
      vx: sign * (14 + rand() * 26),
      vy: 130 + i * 48,
      length: 18 + i * 10,
      drift: 64 + i * 12,
      color: spec.meteor,
    });
  }
  const laneAlpha = spec.pattern === 'bands' ? 0.22 : spec.pattern === 'field' ? 0.14 : 0;
  return {
    theme,
    top: spec.top,
    mid: spec.mid,
    low: spec.low,
    ring: spec.ring,
    laneAngle: spec.pattern === 'bands' ? 0.7 : 0.35,
    laneAlpha,
    laneColor: spec.pattern === 'bands' ? '180, 150, 120' : '186, 200, 230',
    laneY: rand() * CANVAS_HEIGHT,
    stars,
    bodies,
    gases,
    meteors,
  };
}

export function updateSky(sky: Sky, dt: number): void {
  sky.laneY += 6 * dt;
  if (sky.laneY >= CANVAS_HEIGHT) sky.laneY -= CANVAS_HEIGHT;
  for (const layer of sky.stars) {
    for (const star of layer.stars) {
      star.y += layer.speed * dt;
      if (star.y >= CANVAS_HEIGHT) star.y -= CANVAS_HEIGHT;
    }
  }
  for (const body of sky.bodies) {
    if (body.kind === 'comet') {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      const margin = body.radius * 18;
      if (body.x < -margin) body.x += CANVAS_WIDTH + margin * 2;
      else if (body.x > CANVAS_WIDTH + margin) body.x -= CANVAS_WIDTH + margin * 2;
      if (body.y < -margin) body.y += CANVAS_HEIGHT + margin * 2;
      else if (body.y > CANVAS_HEIGHT + margin) body.y -= CANVAS_HEIGHT + margin * 2;
      continue;
    }
    body.y += body.speed * dt;
    body.spin += dt * (body.kind === 'asteroid' ? 0.8 : 0.15);
    const limit = body.radius + 24;
    const span = CANVAS_HEIGHT + limit * 2;
    if (body.y > CANVAS_HEIGHT + limit) body.y -= span;
  }
  for (const gas of sky.gases) {
    gas.y += gas.speed * dt;
    const span = CANVAS_HEIGHT + gas.reach * 2;
    if (gas.y > CANVAS_HEIGHT + gas.reach) gas.y -= span;
  }
  for (const meteor of sky.meteors) {
    meteor.x += meteor.vx * dt;
    meteor.y += meteor.vy * dt;
    if (meteor.y > CANVAS_HEIGHT + 36) {
      meteor.y = -28;
      meteor.x = Math.random() * CANVAS_WIDTH;
    }
    if (meteor.x < -40) meteor.x += CANVAS_WIDTH + 80;
    if (meteor.x > CANVAS_WIDTH + 40) meteor.x -= CANVAS_WIDTH + 80;
  }
}

function shiftedX(x: number, drift: number, camera: number): number {
  return x - camera * drift;
}

function drawDisc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, shade: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x + radius * 0.58, y - radius * 0.08, radius * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function axisSpots(value: number, span: number, edge: number, pad: number): number[] {
  const base = wrapPeriod(value, span);
  const spots = base > edge ? [base - span] : [base];
  if (spots[0] < pad) spots.push(spots[0] + span);
  return spots;
}

function drawBody(ctx: CanvasRenderingContext2D, sky: Sky, body: SkyBody, camera: number): void {
  const pad = body.kind === 'comet' ? body.radius * 18 : body.radius * 2;
  const spanX = CANVAS_WIDTH + pad;
  const spanY = CANVAS_HEIGHT + pad;
  const xs = axisSpots(shiftedX(body.x, body.drift, camera), spanX, CANVAS_WIDTH, pad);
  const ys = axisSpots(body.y, spanY, CANVAS_HEIGHT, pad);
  for (const x of xs) {
    for (const y of ys) drawBodyAt(ctx, sky, body, x, y);
  }
}

function drawBodyAt(ctx: CanvasRenderingContext2D, sky: Sky, body: SkyBody, x: number, y: number): void {
  if (body.kind === 'planet' && sky.ring) {
    ctx.strokeStyle = body.accent;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, body.radius * 1.75, body.radius * 0.42, -0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (body.kind === 'planet') {
    drawDisc(ctx, x, y, body.radius, body.fill, body.shade);
    return;
  }
  if (body.kind === 'moon') {
    drawMoon(ctx, body, x, y);
    return;
  }
  if (body.kind === 'asteroid') {
    drawAsteroid(ctx, body, x, y);
    return;
  }
  drawComet(ctx, body, x, y);
}

function drawMoon(ctx: CanvasRenderingContext2D, body: SkyBody, x: number, y: number): void {
  const radius = body.radius;
  ctx.save();
  ctx.translate(x, y);
  if (body.face === 3) {
    ctx.globalCompositeOperation = 'lighter';
    const haze = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius * 1.7);
    haze.addColorStop(0, 'rgba(232, 184, 109, 0)');
    haze.addColorStop(0.55, 'rgba(232, 184, 109, 0.28)');
    haze.addColorStop(1, 'rgba(232, 184, 109, 0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
  const ground = ctx.createRadialGradient(-radius * 0.32, -radius * 0.38, radius * 0.1, 0, 0, radius * 1.05);
  ground.addColorStop(0, body.accent);
  ground.addColorStop(0.55, body.fill);
  ground.addColorStop(1, body.shade);
  ctx.fillStyle = ground;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.rotate(body.spin);
  if (body.face === 0 || body.face === 1) {
    const patches = body.face === 0 ? 3 : 4;
    ctx.fillStyle = body.face === 0 ? 'rgba(75, 85, 99, 0.55)' : 'rgba(154, 52, 18, 0.45)';
    for (let i = 0; i < patches; i++) {
      const angle = i * 2.4;
      const dist = radius * (0.15 + (i % 2) * 0.28);
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * dist, Math.sin(angle) * dist, radius * 0.28, radius * 0.18, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (body.face === 2) {
    ctx.strokeStyle = 'rgba(168, 162, 158, 0.85)';
    ctx.lineWidth = Math.max(1, radius * 0.035);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.7, -radius * 0.35 + i * radius * 0.22);
      ctx.quadraticCurveTo(0, -radius * 0.15 + i * radius * 0.2, radius * 0.72, -radius * 0.05 + i * radius * 0.16);
      ctx.stroke();
    }
  }
  if (body.face === 3) {
    ctx.fillStyle = 'rgba(146, 64, 14, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.15, radius * 0.85, radius * 0.22, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const craters = body.face === 2 || body.face === 3 ? 2 : radius > 16 ? 7 : 3;
  for (let i = 0; i < craters; i++) {
    const angle = i * 2.399;
    const dist = radius * (0.1 + (i % 4) * 0.16);
    const cr = radius * (body.face === 1 ? 0.07 : 0.09 + (i % 3) * 0.025);
    const cx = Math.cos(angle) * dist;
    const cy = Math.sin(angle) * dist;
    ctx.fillStyle = 'rgba(24, 24, 27, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(cx - cr * 0.25, cy - cr * 0.25, cr * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const night = ctx.createRadialGradient(radius * 0.65, radius * 0.25, radius * 0.2, radius * 0.45, radius * 0.15, radius * 1.15);
  night.addColorStop(0, 'rgba(8, 8, 12, 0.72)');
  night.addColorStop(0.45, 'rgba(8, 8, 12, 0.15)');
  night.addColorStop(1, 'rgba(8, 8, 12, 0)');
  ctx.fillStyle = night;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function traceRock(ctx: CanvasRenderingContext2D, radius: number): void {
  const points = 11;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const lump = 0.86 + ((i * 5) % 4) * 0.045;
    const px = Math.cos(angle) * radius * lump;
    const py = Math.sin(angle) * radius * lump * 0.92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, body: SkyBody, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.spin);
  traceRock(ctx, body.radius);
  ctx.fillStyle = body.fill;
  ctx.fill();
  ctx.save();
  traceRock(ctx, body.radius);
  ctx.clip();
  const light = ctx.createRadialGradient(-body.radius * 0.35, -body.radius * 0.4, 2, 0, 0, body.radius);
  light.addColorStop(0, body.accent);
  light.addColorStop(0.45, body.fill);
  light.addColorStop(1, body.shade);
  ctx.fillStyle = light;
  ctx.fillRect(-body.radius, -body.radius, body.radius * 2, body.radius * 2);
  ctx.fillStyle = body.shade;
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4 + body.radius;
    const dist = body.radius * (0.12 + (i % 3) * 0.16);
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, body.radius * (0.1 + (i % 3) * 0.04), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawComet(ctx: CanvasRenderingContext2D, body: SkyBody, x: number, y: number): void {
  const tail = body.radius * 14;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(-body.vx, body.vy));
  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.scale(0.42, 1);
  const haze = ctx.createRadialGradient(0, -tail * 0.42, 0, 0, -tail * 0.42, tail * 0.72);
  haze.addColorStop(0, body.accent);
  haze.addColorStop(0.35, body.accent);
  haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(0, -tail * 0.42, tail * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const coma = ctx.createRadialGradient(0, 0, 0, 0, 0, body.radius * 3.2);
  coma.addColorStop(0, '#ffffff');
  coma.addColorStop(0.18, body.fill);
  coma.addColorStop(0.5, body.accent);
  coma.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coma;
  ctx.beginPath();
  ctx.arc(0, 0, body.radius * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(-body.vx, body.vy));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = body.shade;
  ctx.beginPath();
  ctx.arc(body.radius * 0.15, body.radius * 0.1, body.radius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

function drawGas(ctx: CanvasRenderingContext2D, gas: SkyGas, camera: number): void {
  const spanX = CANVAS_WIDTH + gas.reach * 2;
  const spanY = CANVAS_HEIGHT + gas.reach * 2;
  const xs = axisSpots(shiftedX(gas.x, gas.drift, camera), spanX, CANVAS_WIDTH, gas.reach);
  const ys = axisSpots(gas.y, spanY, CANVAS_HEIGHT, gas.reach);
  for (const x of xs) {
    for (const y of ys) drawGasAt(ctx, gas, x, y);
  }
}

function drawGasAt(ctx: CanvasRenderingContext2D, gas: SkyGas, x: number, y: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lobe of gas.lobes) {
    const glow = ctx.createRadialGradient(x + lobe.ox, y + lobe.oy, lobe.r * 0.05, x + lobe.ox, y + lobe.oy, lobe.r);
    glow.addColorStop(0, rgba(gas.core, lobe.alpha * 0.85));
    glow.addColorStop(0.28, rgba(gas.color, lobe.alpha));
    glow.addColorStop(0.62, rgba(gas.color, lobe.alpha * 0.28));
    glow.addColorStop(1, rgba(gas.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + lobe.ox, y + lobe.oy, lobe.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(x, y);
  ctx.rotate(gas.tilt);
  ctx.scale(1.7, 0.38);
  const band = ctx.createRadialGradient(0, 0, 0, 0, 0, gas.reach * 0.55);
  band.addColorStop(0, rgba(gas.core, 0.32));
  band.addColorStop(0.45, rgba(gas.color, 0.12));
  band.addColorStop(1, rgba(gas.color, 0));
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.arc(0, 0, gas.reach * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  for (const knot of gas.knots) {
    const hole = ctx.createRadialGradient(x + knot.ox, y + knot.oy, 0, x + knot.ox, y + knot.oy, knot.r);
    hole.addColorStop(0, `rgba(2, 4, 10, ${knot.alpha})`);
    hole.addColorStop(1, 'rgba(2, 4, 10, 0)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(x + knot.ox, y + knot.oy, knot.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMeteor(ctx: CanvasRenderingContext2D, meteor: SkyMeteor, camera: number): void {
  const x = shiftedX(meteor.x, meteor.drift, camera);
  const y = meteor.y;
  const mag = Math.hypot(meteor.vx, meteor.vy) || 1;
  const tx = -meteor.vx / mag;
  const ty = -meteor.vy / mag;
  ctx.fillStyle = meteor.color;
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.9 - i * 0.16;
    const step = (meteor.length / 5) * i;
    ctx.fillRect(x + tx * step, y + ty * step, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 1, y - 1, 3, 3);
}

function drawLane(ctx: CanvasRenderingContext2D, sky: Sky): void {
  for (const offset of [-CANVAS_HEIGHT, 0, CANVAS_HEIGHT]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(CANVAS_WIDTH / 2, sky.laneY + offset);
    ctx.rotate(sky.laneAngle);
    ctx.scale(1.35, 0.28);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, CANVAS_HEIGHT * 0.75);
    glow.addColorStop(0, `rgba(${sky.laneColor}, ${sky.laneAlpha})`);
    glow.addColorStop(0.5, `rgba(${sky.laneColor}, ${sky.laneAlpha * 0.3})`);
    glow.addColorStop(1, `rgba(${sky.laneColor}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, CANVAS_HEIGHT * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, star: SkyStar, x: number, y: number): void {
  ctx.globalAlpha = star.alpha;
  ctx.fillStyle = star.color;
  ctx.fillRect(x, y, star.size, star.size);
  if (star.kind !== 2) return;
  const arm = 4 + star.size * 2;
  ctx.globalAlpha = star.alpha * 0.75;
  ctx.fillRect(x + star.size / 2 - 0.5, y - arm, 1, arm * 2 + star.size);
  ctx.fillRect(x - arm, y + star.size / 2 - 0.5, arm * 2 + star.size, 1);
}

export function drawSky(ctx: CanvasRenderingContext2D, sky: Sky, camera: number): void {
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, sky.top);
  bg.addColorStop(0.55, sky.mid);
  bg.addColorStop(1, sky.low);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (sky.laneAlpha > 0) drawLane(ctx, sky);
  for (const layer of sky.stars) {
    for (const star of layer.stars) {
      const x = wrapPeriod(shiftedX(star.x, layer.drift, camera), CANVAS_WIDTH);
      const y = wrapPeriod(star.y, CANVAS_HEIGHT);
      drawStar(ctx, star, x, y);
    }
  }
  ctx.globalAlpha = 1;

  const bodies = sky.bodies.slice().sort((a, b) => a.drift - b.drift);
  for (const body of bodies) drawBody(ctx, sky, body, camera);

  const gases = sky.gases.slice().sort((a, b) => a.drift - b.drift);
  for (const gas of gases) drawGas(ctx, gas, camera);

  const meteors = sky.meteors.slice().sort((a, b) => a.drift - b.drift);
  for (const meteor of meteors) drawMeteor(ctx, meteor, camera);
  ctx.globalAlpha = 1;
}
