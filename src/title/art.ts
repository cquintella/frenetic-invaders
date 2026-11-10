export const OPENING_FILE = 'title/frenetic-invaders-opening.webp';
export const LOGO_FILE = 'title/frenetic-invaders-logo.png';

export function publicAsset(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${file}`;
}

export const OPENING_SRC = publicAsset(OPENING_FILE);
export const LOGO_SRC = publicAsset(LOGO_FILE);
