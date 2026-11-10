import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

/**
 * Photos behind the playfield. Level 1 uses the first file, then the list
 * repeats. A file that fails to load leaves the painted sky in place.
 */
export const BUILTIN_BACKGROUNDS = [
  'backgrounds/bg1-nebula-purple.webp',
  'backgrounds/bg2-golden-galaxy.webp',
  'backgrounds/bg3-blue-nebula.webp',
] as const;

/** Darkens a bright plate so the sprites and shots stay readable. */
export const BACKGROUND_VEIL = 'rgba(2, 6, 16, 0.32)';

export function backgroundIndex(level: number, count: number): number {
  if (!Number.isFinite(count) || count < 1) return -1;
  const wave = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return (wave - 1) % Math.floor(count);
}

export function backgroundForLevel(level: number, files: readonly string[] = BUILTIN_BACKGROUNDS): string | null {
  const index = backgroundIndex(level, files.length);
  if (index < 0) return null;
  return files[index] ?? null;
}

/** Uniform scale that covers the canvas. The rect may start outside the frame. */
export function coverRect(
  imageWidth: number,
  imageHeight: number,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT
): { x: number; y: number; w: number; h: number } {
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const w = imageWidth * scale;
  const h = imageHeight * scale;
  return { x: (canvasWidth - w) / 2, y: (canvasHeight - h) / 2, w, h };
}

export function normalizeBackgroundPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.includes('..') || trimmed.includes('\\')) return null;
  const path = trimmed.replace(/^\/+/, '');
  if (!/^[\w./-]+$/.test(path)) return null;
  return path;
}

/** Missing or unusable list keeps the three shipped plates. */
export function parseBackgroundList(value: unknown, warnings: string[]): string[] {
  if (value === undefined) return [...BUILTIN_BACKGROUNDS];
  if (!Array.isArray(value)) {
    warnings.push('backgrounds inválido; usando a lista embutida');
    return [...BUILTIN_BACKGROUNDS];
  }
  const list: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      warnings.push('backgrounds tem um item que não é texto; ignorado');
      continue;
    }
    const path = normalizeBackgroundPath(entry);
    if (!path) {
      warnings.push('backgrounds tem um caminho inválido; ignorado');
      continue;
    }
    list.push(path);
  }
  if (list.length === 0) {
    warnings.push('backgrounds vazio; usando a lista embutida');
    return [...BUILTIN_BACKGROUNDS];
  }
  return list;
}

export function backgroundAssetUrl(file: string, base = '/'): string {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${file.replace(/^\/+/, '')}`;
}

function assetBase(): string {
  const env = import.meta.env as { BASE_URL?: string } | undefined;
  return env && typeof env.BASE_URL === 'string' ? env.BASE_URL : '/';
}

type Plate = { image: HTMLImageElement; ready: boolean; failed: boolean };

const plates = new Map<string, Plate>();

function loadPlate(url: string): Promise<void> {
  const existing = plates.get(url);
  if (existing) {
    if (existing.ready || existing.failed) return Promise.resolve();
    return new Promise((resolve) => {
      existing.image.addEventListener('load', () => resolve(), { once: true });
      existing.image.addEventListener('error', () => resolve(), { once: true });
    });
  }
  if (typeof Image === 'undefined') return Promise.resolve();
  const image = new Image();
  const plate: Plate = { image, ready: false, failed: false };
  plates.set(url, plate);
  return new Promise((resolve) => {
    image.onload = () => {
      plate.ready = image.naturalWidth > 0 && image.naturalHeight > 0;
      plate.failed = !plate.ready;
      resolve();
    };
    image.onerror = () => {
      plate.failed = true;
      resolve();
    };
    image.src = url;
  });
}

/** Decode every plate before the first wave so the level change does not pop. */
export function preloadBackgrounds(files: readonly string[], base = assetBase()): Promise<void> {
  return Promise.all(files.map((file) => loadPlate(backgroundAssetUrl(file, base)))).then(() => undefined);
}

export function readyBackground(level: number, files: readonly string[], base = assetBase()): HTMLImageElement | null {
  const file = backgroundForLevel(level, files);
  if (!file) return null;
  const plate = plates.get(backgroundAssetUrl(file, base));
  if (!plate?.ready) return null;
  return plate.image;
}

export function backgroundsReady(files: readonly string[], base = assetBase()): boolean {
  if (files.length === 0) return true;
  return files.every((file) => {
    const plate = plates.get(backgroundAssetUrl(file, base));
    return Boolean(plate && (plate.ready || plate.failed));
  });
}

/** Paints the plate for this level. Returns false when the painted sky should show. */
export function drawLevelBackground(
  ctx: CanvasRenderingContext2D,
  level: number,
  files: readonly string[]
): boolean {
  const image = readyBackground(level, files);
  if (!image) return false;
  const rect = coverRect(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = BACKGROUND_VEIL;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  return true;
}
