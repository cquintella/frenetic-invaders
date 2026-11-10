/**
 * Per-level pressure. The numbers live in public/config/difficulty.json so a
 * player can edit them. This module is the fallback and the clamp.
 *
 * A value is base + (level-1) * perLevel up to `knee`, then a slower
 * perLevelAfterKnee. Optional `levels` replaces the result for one wave.
 */

export type DifficultyFile = {
  march: {
    intervalBase: number;
    intervalPerLevel: number;
    intervalMin: number;
    stepBase: number;
    stepPerLevel: number;
    stepMax: number;
    drop: number;
  };
  shots: {
    rateBase: number;
    ratePerLevel: number;
    ratePerLevelAfterKnee: number;
    knee: number;
    rateMax: number;
    speedBase: number;
    speedPerLevel: number;
    speedPerLevelAfterKnee: number;
    speedMax: number;
    maxAliveBase: number;
    maxAlivePerLevel: number;
    maxAliveMax: number;
    volley: number;
  };
  bombs: {
    ufoPerSecondBase: number;
    ufoPerSecondPerLevel: number;
    ufoPerSecondMax: number;
    ufoSpeedBase: number;
    ufoSpeedPerLevel: number;
    ufoSpeedMax: number;
  };
  dives: {
    intervalBase: number;
    intervalPerLevel: number;
    intervalMin: number;
    duration: number;
  };
  levels: Record<string, LevelOverride>;
};

export type LevelOverride = {
  shotRate?: number;
  shotSpeed?: number;
  maxAlive?: number;
  volley?: number;
  marchInterval?: number;
  marchStep?: number;
  marchDrop?: number;
  ufoBombPerSecond?: number;
  ufoSpeed?: number;
  diveInterval?: number;
  diveDuration?: number;
};

export type LevelTuning = {
  marchInterval: number;
  marchStep: number;
  marchDrop: number;
  shotRate: number;
  shotSpeed: number;
  maxAlive: number;
  volley: number;
  ufoBombPerSecond: number;
  ufoSpeed: number;
  diveInterval: number;
  diveDuration: number;
};

export const BUILTIN_DIFFICULTY: DifficultyFile = {
  march: {
    intervalBase: 0.78,
    intervalPerLevel: 0.12,
    intervalMin: 0.42,
    stepBase: 12,
    stepPerLevel: 0.05,
    stepMax: 16,
    drop: 25,
  },
  shots: {
    rateBase: 0.55,
    ratePerLevel: 0.85,
    ratePerLevelAfterKnee: 0.28,
    knee: 6,
    rateMax: 8,
    speedBase: 230,
    speedPerLevel: 22,
    speedPerLevelAfterKnee: 8,
    speedMax: 400,
    maxAliveBase: 3,
    maxAlivePerLevel: 0.25,
    maxAliveMax: 6,
    volley: 1,
  },
  bombs: {
    ufoPerSecondBase: 0.25,
    ufoPerSecondPerLevel: 0.04,
    ufoPerSecondMax: 0.7,
    ufoSpeedBase: 210,
    ufoSpeedPerLevel: 18,
    ufoSpeedMax: 380,
  },
  dives: {
    intervalBase: 5.2,
    intervalPerLevel: -0.08,
    intervalMin: 3.6,
    duration: 2.8,
  },
  levels: {},
};

const LIMITS = {
  rate: [0, 12],
  speed: [60, 720],
  alive: [1, 8],
  volley: [1, 2],
  marchInterval: [0.2, 3],
  marchStep: [4, 24],
  drop: [8, 48],
  ufoRate: [0, 2],
  diveInterval: [1.5, 12],
  diveDuration: [0.8, 8],
  knee: [1, 30],
} as const;

let installed: DifficultyFile = BUILTIN_DIFFICULTY;

export function installDifficulty(file: DifficultyFile): void {
  installed = file;
}

export function installedDifficulty(): DifficultyFile {
  return installed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function num(value: unknown, fallback: number, span: readonly [number, number], warnings: string[], label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (value !== undefined) {
      warnings.push(Number.isFinite(fallback) ? `${label} inválido; usando ${fallback}` : `${label} inválido; ignorado`);
    }
    return fallback;
  }
  const next = clamp(value, span[0], span[1]);
  if (next !== value) warnings.push(`${label} fora da faixa; limitado a ${next}`);
  return next;
}

function read(source: unknown, key: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  return (source as Record<string, unknown>)[key];
}

export function difficultyFromUnknown(value: unknown): { file: DifficultyFile; warnings: string[] } {
  const warnings: string[] = [];
  if (!value || typeof value !== 'object') {
    warnings.push('difficulty.json não é um objeto; padrões embutidos');
    return { file: structuredClone(BUILTIN_DIFFICULTY), warnings };
  }
  const base = BUILTIN_DIFFICULTY;
  const march = read(value, 'march');
  const shots = read(value, 'shots');
  const bombs = read(value, 'bombs');
  const dives = read(value, 'dives');
  const file: DifficultyFile = {
    march: {
      intervalBase: num(read(march, 'intervalBase'), base.march.intervalBase, LIMITS.marchInterval, warnings, 'march.intervalBase'),
      intervalPerLevel: num(read(march, 'intervalPerLevel'), base.march.intervalPerLevel, [0, 1], warnings, 'march.intervalPerLevel'),
      intervalMin: num(read(march, 'intervalMin'), base.march.intervalMin, LIMITS.marchInterval, warnings, 'march.intervalMin'),
      stepBase: num(read(march, 'stepBase'), base.march.stepBase, LIMITS.marchStep, warnings, 'march.stepBase'),
      stepPerLevel: num(read(march, 'stepPerLevel'), base.march.stepPerLevel, [0, 1], warnings, 'march.stepPerLevel'),
      stepMax: num(read(march, 'stepMax'), base.march.stepMax, LIMITS.marchStep, warnings, 'march.stepMax'),
      drop: num(read(march, 'drop'), base.march.drop, LIMITS.drop, warnings, 'march.drop'),
    },
    shots: {
      rateBase: num(read(shots, 'rateBase'), base.shots.rateBase, LIMITS.rate, warnings, 'shots.rateBase'),
      ratePerLevel: num(read(shots, 'ratePerLevel'), base.shots.ratePerLevel, [0, 4], warnings, 'shots.ratePerLevel'),
      ratePerLevelAfterKnee: num(read(shots, 'ratePerLevelAfterKnee'), base.shots.ratePerLevelAfterKnee, [0, 4], warnings, 'shots.ratePerLevelAfterKnee'),
      knee: num(read(shots, 'knee'), base.shots.knee, LIMITS.knee, warnings, 'shots.knee'),
      rateMax: num(read(shots, 'rateMax'), base.shots.rateMax, LIMITS.rate, warnings, 'shots.rateMax'),
      speedBase: num(read(shots, 'speedBase'), base.shots.speedBase, LIMITS.speed, warnings, 'shots.speedBase'),
      speedPerLevel: num(read(shots, 'speedPerLevel'), base.shots.speedPerLevel, [0, 80], warnings, 'shots.speedPerLevel'),
      speedPerLevelAfterKnee: num(read(shots, 'speedPerLevelAfterKnee'), base.shots.speedPerLevelAfterKnee, [0, 80], warnings, 'shots.speedPerLevelAfterKnee'),
      speedMax: num(read(shots, 'speedMax'), base.shots.speedMax, LIMITS.speed, warnings, 'shots.speedMax'),
      maxAliveBase: num(read(shots, 'maxAliveBase'), base.shots.maxAliveBase, LIMITS.alive, warnings, 'shots.maxAliveBase'),
      maxAlivePerLevel: num(read(shots, 'maxAlivePerLevel'), base.shots.maxAlivePerLevel, [0, 2], warnings, 'shots.maxAlivePerLevel'),
      maxAliveMax: num(read(shots, 'maxAliveMax'), base.shots.maxAliveMax, LIMITS.alive, warnings, 'shots.maxAliveMax'),
      volley: num(read(shots, 'volley'), base.shots.volley, LIMITS.volley, warnings, 'shots.volley'),
    },
    bombs: {
      ufoPerSecondBase: num(read(bombs, 'ufoPerSecondBase'), base.bombs.ufoPerSecondBase, LIMITS.ufoRate, warnings, 'bombs.ufoPerSecondBase'),
      ufoPerSecondPerLevel: num(read(bombs, 'ufoPerSecondPerLevel'), base.bombs.ufoPerSecondPerLevel, [0, 1], warnings, 'bombs.ufoPerSecondPerLevel'),
      ufoPerSecondMax: num(read(bombs, 'ufoPerSecondMax'), base.bombs.ufoPerSecondMax, LIMITS.ufoRate, warnings, 'bombs.ufoPerSecondMax'),
      ufoSpeedBase: num(read(bombs, 'ufoSpeedBase'), base.bombs.ufoSpeedBase, LIMITS.speed, warnings, 'bombs.ufoSpeedBase'),
      ufoSpeedPerLevel: num(read(bombs, 'ufoSpeedPerLevel'), base.bombs.ufoSpeedPerLevel, [0, 80], warnings, 'bombs.ufoSpeedPerLevel'),
      ufoSpeedMax: num(read(bombs, 'ufoSpeedMax'), base.bombs.ufoSpeedMax, LIMITS.speed, warnings, 'bombs.ufoSpeedMax'),
    },
    dives: {
      intervalBase: num(read(dives, 'intervalBase'), base.dives.intervalBase, LIMITS.diveInterval, warnings, 'dives.intervalBase'),
      intervalPerLevel: num(read(dives, 'intervalPerLevel'), base.dives.intervalPerLevel, [-2, 2], warnings, 'dives.intervalPerLevel'),
      intervalMin: num(read(dives, 'intervalMin'), base.dives.intervalMin, LIMITS.diveInterval, warnings, 'dives.intervalMin'),
      duration: num(read(dives, 'duration'), base.dives.duration, LIMITS.diveDuration, warnings, 'dives.duration'),
    },
    levels: {},
  };
  const levels = read(value, 'levels');
  if (levels && typeof levels === 'object') {
    for (const [key, raw] of Object.entries(levels as Record<string, unknown>)) {
      if (!/^\d+$/.test(key) || !raw || typeof raw !== 'object') {
        warnings.push(`levels.${key} ignorado`);
        continue;
      }
      const over: LevelOverride = {};
      const take = (field: keyof LevelOverride, span: readonly [number, number]) => {
        const got = read(raw, field);
        if (got === undefined) return;
        over[field] = num(got, NaN, span, warnings, `levels.${key}.${field}`);
        if (!Number.isFinite(over[field])) delete over[field];
      };
      take('shotRate', LIMITS.rate);
      take('shotSpeed', LIMITS.speed);
      take('maxAlive', LIMITS.alive);
      take('volley', LIMITS.volley);
      take('marchInterval', LIMITS.marchInterval);
      take('marchStep', LIMITS.marchStep);
      take('marchDrop', LIMITS.drop);
      take('ufoBombPerSecond', LIMITS.ufoRate);
      take('ufoSpeed', LIMITS.speed);
      take('diveInterval', LIMITS.diveInterval);
      take('diveDuration', LIMITS.diveDuration);
      file.levels[key] = over;
    }
  }
  return { file, warnings };
}

/** A centered block for `count` aliens. Prefer a full rectangle near a 2:1 width. */
function kneeGrow(level: number, base: number, perLevel: number, afterKnee: number, knee: number, min: number, max: number): number {
  const wave = Math.max(1, level);
  const early = base + (Math.min(wave, knee) - 1) * perLevel;
  const late = Math.max(0, wave - knee) * afterKnee;
  return clamp(early + late, min, max);
}

export function resolveLevel(file: DifficultyFile, level: number): LevelTuning {
  const wave = Math.max(1, Math.floor(level) || 1);
  const shots = file.shots;
  const marchScale = 1 + (wave - 1) * file.march.intervalPerLevel;
  const tuning: LevelTuning = {
    marchInterval: clamp(file.march.intervalBase / Math.max(0.2, marchScale), file.march.intervalMin, LIMITS.marchInterval[1]),
    marchStep: clamp(file.march.stepBase * (1 + (wave - 1) * file.march.stepPerLevel), LIMITS.marchStep[0], file.march.stepMax),
    marchDrop: file.march.drop,
    shotRate: kneeGrow(wave, shots.rateBase, shots.ratePerLevel, shots.ratePerLevelAfterKnee, shots.knee, 0, shots.rateMax),
    shotSpeed: kneeGrow(wave, shots.speedBase, shots.speedPerLevel, shots.speedPerLevelAfterKnee, shots.knee, LIMITS.speed[0], shots.speedMax),
    maxAlive: Math.round(clamp(shots.maxAliveBase + (wave - 1) * shots.maxAlivePerLevel, LIMITS.alive[0], shots.maxAliveMax)),
    volley: Math.round(clamp(shots.volley, LIMITS.volley[0], LIMITS.volley[1])),
    ufoBombPerSecond: clamp(file.bombs.ufoPerSecondBase + (wave - 1) * file.bombs.ufoPerSecondPerLevel, 0, file.bombs.ufoPerSecondMax),
    ufoSpeed: clamp(file.bombs.ufoSpeedBase + (wave - 1) * file.bombs.ufoSpeedPerLevel, LIMITS.speed[0], file.bombs.ufoSpeedMax),
    diveInterval: clamp(file.dives.intervalBase + (wave - 1) * file.dives.intervalPerLevel, file.dives.intervalMin, LIMITS.diveInterval[1]),
    diveDuration: file.dives.duration,
  };
  const over = file.levels[String(wave)];
  if (!over) return tuning;
  if (over.shotRate !== undefined) tuning.shotRate = clamp(over.shotRate, 0, LIMITS.rate[1]);
  if (over.shotSpeed !== undefined) tuning.shotSpeed = clamp(over.shotSpeed, LIMITS.speed[0], LIMITS.speed[1]);
  if (over.maxAlive !== undefined) tuning.maxAlive = Math.round(clamp(over.maxAlive, LIMITS.alive[0], LIMITS.alive[1]));
  if (over.volley !== undefined) tuning.volley = Math.round(clamp(over.volley, LIMITS.volley[0], LIMITS.volley[1]));
  if (over.marchInterval !== undefined) tuning.marchInterval = clamp(over.marchInterval, LIMITS.marchInterval[0], LIMITS.marchInterval[1]);
  if (over.marchStep !== undefined) tuning.marchStep = clamp(over.marchStep, LIMITS.marchStep[0], LIMITS.marchStep[1]);
  if (over.marchDrop !== undefined) tuning.marchDrop = clamp(over.marchDrop, LIMITS.drop[0], LIMITS.drop[1]);
  if (over.ufoBombPerSecond !== undefined) tuning.ufoBombPerSecond = clamp(over.ufoBombPerSecond, 0, LIMITS.ufoRate[1]);
  if (over.ufoSpeed !== undefined) tuning.ufoSpeed = clamp(over.ufoSpeed, LIMITS.speed[0], LIMITS.speed[1]);
  if (over.diveInterval !== undefined) tuning.diveInterval = clamp(over.diveInterval, LIMITS.diveInterval[0], LIMITS.diveInterval[1]);
  if (over.diveDuration !== undefined) tuning.diveDuration = clamp(over.diveDuration, LIMITS.diveDuration[0], LIMITS.diveDuration[1]);
  return tuning;
}

export function levelTuning(level: number): LevelTuning {
  return resolveLevel(installed, level);
}

export function difficultyUrl(): string {
  const env = import.meta.env as { BASE_URL?: string } | undefined;
  const base = env && typeof env.BASE_URL === 'string' ? env.BASE_URL : '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}config/difficulty.json`;
}

/** Missing or broken file: built-in numbers, and a warning the caller prints. */
export async function loadDifficultyConfig(fetchImpl: typeof fetch = fetch): Promise<{ file: DifficultyFile; warnings: string[] }> {
  try {
    const response = await fetchImpl(difficultyUrl());
    if (!response.ok) {
      return { file: structuredClone(BUILTIN_DIFFICULTY), warnings: [`difficulty.json respondeu ${response.status}; padrões embutidos`] };
    }
    const data: unknown = await response.json();
    return difficultyFromUnknown(data);
  } catch {
    return { file: structuredClone(BUILTIN_DIFFICULTY), warnings: ['difficulty.json ilegível; padrões embutidos'] };
  }
}
