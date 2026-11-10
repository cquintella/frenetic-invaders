import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, ChevronRight, User, BookOpen } from 'lucide-react';
import { GameState, Score } from './types';
import { soundService } from './services/soundService';
import { rankScores } from './scores/topScores';
import { CANVAS_HEIGHT, CANVAS_WIDTH, STEP } from './game/constants';
import { intermissionAdvanceKey } from './game/intermission';
import { frameStep, gameplayKeyAllowed, pauseKeyAccepted } from './game/pause';
import { GameEngine } from './game/engine';
import { alienCutsReady, shipPosesReady } from './game/shipArt';
import { installDifficulty, loadDifficultyConfig } from './game/difficulty';
import type { HudSnapshot } from './game/types';
import { GameLogo, OpeningBackdrop } from './title/Opening';

interface UpgradeHud {
  lasers: number;
  shield: number;
  twin: boolean;
  wings: number;
  wingShots: number;
}

const EMPTY_UPGRADES: UpgradeHud = {
  lasers: 1,
  shield: 3,
  twin: false,
  wings: 0,
  wingShots: 0,
};

function openManualWindow(): boolean {
  const opened = window.open(
    '/manual.html',
    'frenetic-manual',
    'popup=yes,width=880,height=940,left=80,top=40,resizable=yes,scrollbars=yes'
  );
  if (!opened) return false;
  opened.focus();
  return true;
}

function BrandMark() {
  return (
    <svg viewBox="0 0 96 96" className="logo-mark h-20 w-20" aria-hidden>
      <defs>
        <linearGradient id="fi-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <polygon points="48,4 88,27 88,69 48,92 8,69 8,27" fill="#02140c" stroke="#4ade80" strokeWidth="1.6" />
      <polygon points="48,16 76,32 76,64 48,80 20,64 20,32" fill="none" stroke="#86efac" strokeWidth="0.8" opacity="0.7" />
      <path d="M46 22 H50 L52 34 H44 Z" fill="url(#fi-hull)" />
      <path d="M42 34 H54 L56 48 H40 Z" fill="#d7e7ee" />
      <path d="M40 46 H56 L54 78 H42 Z" fill="url(#fi-hull)" />
      <rect x="18" y="40" width="16" height="28" fill="url(#fi-hull)" />
      <rect x="62" y="40" width="16" height="28" fill="url(#fi-hull)" />
      <rect x="22" y="48" width="6" height="8" fill="#fb923c" />
      <rect x="68" y="48" width="6" height="8" fill="#fb923c" />
      <rect x="24" y="68" width="4" height="10" fill="#334155" />
      <rect x="68" y="68" width="4" height="10" fill="#334155" />
      <circle cx="30" cy="36" r="2.4" fill="#e2e8f0" />
      <circle cx="66" cy="36" r="2.4" fill="#e2e8f0" />
    </svg>
  );
}

function hudKey(snap: HudSnapshot): string {
  return [
    snap.score,
    snap.level,
    snap.lasers,
    snap.shield,
    snap.wings,
    snap.wingShots,
    snap.twin ? 1 : 0,
  ].join('|');
}

function rankLabel(index: number): string {
  return String(index + 1).padStart(index >= 99 ? 3 : 2, '0');
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new GameEngine();

  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [upgrades, setUpgrades] = useState<UpgradeHud>(EMPTY_UPGRADES);
  const [highScores, setHighScores] = useState<Score[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [clearedWave, setClearedWave] = useState(1);
  const [manualBlocked, setManualBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [paused, setPaused] = useState(false);
  const [musicEpoch, setMusicEpoch] = useState(0);

  const nameRef = useRef(playerName);
  nameRef.current = playerName;
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const pausedRef = useRef(false);
  const submittedRef = useRef(false);
  const submitRef = useRef<(snap: HudSnapshot) => void>(() => {});
  const muteRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const volumeRef = useRef<(delta: number) => void>(() => {});

  const ranked = rankScores<Score>(highScores);
  const showMenu = gameState === 'START' || gameState === 'LEADERBOARD';

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/scores');
      const data = (await res.json()) as Score[];
      setHighScores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch scores', err);
    }
  };

  submitRef.current = (snap: HudSnapshot) => {
    void (async () => {
      try {
        await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameRef.current,
            score: snap.score,
            level: snap.level,
          }),
        });
        await fetchScores();
      } catch (err) {
        console.error('Failed to submit score', err);
      }
    })();
  };

  useEffect(() => {
    void fetchScores();
  }, []);

  useEffect(() => {
    let cancel = false;
    void loadDifficultyConfig().then((result) => {
      if (cancel) return;
      for (const warning of result.warnings) console.warn(warning);
      installDifficulty(result.file);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (gameState === 'LEADERBOARD') void fetchScores();
  }, [gameState]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__frenetic = {
      sound: soundService,
      getEngine: () => engineRef.current,
      alienCutsReady: () => alienCutsReady(),
      shipPosesReady: () => shipPosesReady(),
    };
  }, []);

  useEffect(() => {
    return () => {
      soundService.stopMusic();
      soundService.stopUfo();
    };
  }, []);

  useEffect(() => {
    const playing = gameState === 'PLAYING' || gameState === 'LEVEL_UP';
    if (playing) soundService.playLevel(level, musicEpoch);
    else if (gameState === 'START') soundService.playMenu();
    else soundService.stopMusic();
  }, [gameState, level, musicEpoch]);

  useEffect(() => {
    if (gameState === 'PLAYING') return;
    pausedRef.current = false;
    setPaused(false);
    soundService.setTransportPaused(false);
  }, [gameState]);

  const applyHud = (snap: HudSnapshot) => {
    setScore(snap.score);
    setLevel(snap.level);
    setUpgrades({
      lasers: snap.lasers,
      shield: snap.shield,
      twin: snap.twin,
      wings: snap.wings,
      wingShots: snap.wingShots,
    });
  };

  const startGame = () => {
    const engine = engineRef.current;
    if (!engine || !playerName.trim()) return;
    submittedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    soundService.unlock();
    soundService.setTransportPaused(false);
    engine.start();
    applyHud(engine.snapshot());
    setMusicEpoch((epoch) => epoch + 1);
    setGameState('PLAYING');
  };

  muteRef.current = () => {
    soundService.unlock();
    setMuted(soundService.toggleMuted());
  };
  pauseRef.current = () => {
    const screen = stateRef.current;
    if (screen !== 'PLAYING' && screen !== 'LEVEL_UP') return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) engineRef.current?.clearKeys();
    soundService.unlock();
    soundService.setTransportPaused(next);
  };
  volumeRef.current = (delta: number) => {
    soundService.unlock();
    setVolume((current) => {
      const next = Math.min(1, Math.max(0, Math.round((current + delta) * 20) / 20));
      soundService.setVolume(next);
      if (next > 0 && muted) {
        soundService.setMuted(false);
        setMuted(false);
      }
      return next;
    });
  };

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const down = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName ?? null;
      if (pauseKeyAccepted({ code: event.code, repeat: event.repeat, targetTag: tag, screen: stateRef.current })) {
        event.preventDefault();
        pauseRef.current();
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.code === 'KeyM') {
        muteRef.current();
        return;
      }
      if (event.code === 'KeyP') return;
      if (event.code === 'BracketLeft') {
        volumeRef.current(-0.1);
        return;
      }
      if (event.code === 'BracketRight') {
        volumeRef.current(0.1);
        return;
      }
      if (!gameplayKeyAllowed(pausedRef.current, tag)) return;
      engine.setKey(event.code, true);
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => engine.setKey(event.code, false);
    const blur = () => engine.clearKeys();
    const gesture = () => soundService.unlock();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', gesture);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', gesture);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let seen = '';

    const publish = (snap: HudSnapshot) => {
      const key = hudKey(snap);
      if (key === seen) return;
      seen = key;
      applyHud(snap);
    };

    const loop = (now: number) => {
      const step = frameStep(last, now, pausedRef.current);
      last = step.last;
      if (step.dt === 0) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = step.dt;
      acc += dt;
      let steps = 0;
      let snap = engine.snapshot();
      while (acc >= STEP && steps < 3) {
        snap = engine.update(STEP);
        acc -= STEP;
        steps += 1;
        if (snap.over || snap.bannerLevel !== null) break;
      }
      if (steps === 3) acc = 0;
      engine.draw(ctx);
      publish(snap);
      if (snap.over) {
        if (!submittedRef.current) {
          submittedRef.current = true;
          submitRef.current(snap);
        }
        setGameState('GAME_OVER');
        return;
      }
      if (snap.bannerLevel !== null) {
        setClearedWave(snap.bannerLevel);
        setGameState('LEVEL_UP');
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'LEVEL_UP') return;
    const engine = engineRef.current;
    if (!engine) return;
    let done = false;
    let armed = !engine.isKeyDown('Space');
    const go = () => {
      if (done || pausedRef.current) return;
      done = true;
      engine.clearKeys();
      engine.advance();
      applyHud(engine.snapshot());
      setGameState('PLAYING');
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.type === 'keyup') {
        if (event.code === 'Space') armed = true;
        return;
      }
      if (!intermissionAdvanceKey({ code: event.code, repeat: event.repeat, paused: pausedRef.current, armed })) return;
      event.preventDefault();
      go();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [gameState]);

  const shieldTone = upgrades.shield > 1 ? 'text-cyan-300' : 'text-red-300';
  const crawlSeconds = Math.max(16, ranked.length * 0.85);

  return (
    <div className={`app-shell ${showMenu ? 'menu-mode' : 'crt-overlay'}`} data-screen={gameState}>
      {showMenu && <OpeningBackdrop />}
      <div className={showMenu ? 'playfield playfield-parked' : 'playfield'}>
        {gameState === 'PLAYING' && (
          <div className="absolute top-[-80px] w-full flex justify-between items-start px-4 font-mono text-green-500">
            <div className="flex flex-col">
              <span className="text-[10px] text-green-800 font-bold uppercase tracking-widest">Score</span>
              <span className="text-4xl font-black drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="flex flex-col items-center gap-1 pt-2 text-[11px] tracking-widest">
              <span className="text-cyan-300">LAS {upgrades.lasers}</span>
              <span className={shieldTone}>SHD {upgrades.shield}</span>
              {upgrades.wings > 0 && <span className="text-orange-300">SIDE {upgrades.wingShots}</span>}
              {upgrades.twin && <span className="text-amber-300">TWIN</span>}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-green-800 font-bold uppercase tracking-widest">Wave</span>
              <span className="text-4xl font-black">{level}</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="game-canvas"
        />

        <AnimatePresence>
          {gameState === 'LEVEL_UP' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              data-intermission={clearedWave}
              className="title-screen absolute inset-0 z-10 flex flex-col items-center justify-center"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.45em] text-green-400">Intervalo</div>
              <div className="logo-word mt-3 text-center">NÍVEL {clearedWave}</div>
              <div className="logo-sub">COMPLETO</div>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.35em] text-green-700">Placar</div>
              <div className="font-mono text-5xl font-black text-green-300 drop-shadow-[0_0_16px_rgba(74,222,128,0.45)]">
                {score.toString().padStart(6, '0')}
              </div>
              <div className="mt-6 flex gap-6 font-mono text-[11px] uppercase tracking-widest">
                <span className={shieldTone}>SHD {upgrades.shield}</span>
                {upgrades.wings > 0 && <span className="text-orange-300">SIDE {upgrades.wingShots}</span>}
                {upgrades.twin && <span className="text-amber-300">TWIN</span>}
              </div>
              <p className="mt-8 font-mono text-sm uppercase tracking-[0.18em] text-green-100">
                Pressione ESPAÇO para começar o nível {clearedWave + 1}
              </p>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 rounded-lg overflow-hidden"
            >
              <h2 className="text-7xl font-black text-red-500 mb-2 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">MISSION FAILED</h2>
              <div className="text-2xl font-mono mb-2 text-white/60">FINAL SCORE: {score.toLocaleString()}</div>
              <div className="text-sm font-mono mb-12 text-white/40 tracking-widest">WAVE {level}</div>
              <div className="flex flex-col items-center gap-4 z-10">
                <button
                  onClick={startGame}
                  className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  RETRY MISSION
                </button>
                <button
                  onClick={() => setGameState('LEADERBOARD')}
                  className="px-12 py-4 border border-white/20 hover:bg-white/10 text-white font-bold rounded-full transition-all"
                >
                  VIEW RECORDS
                </button>
              </div>
            </motion.div>
          )}

          {paused && (gameState === 'PLAYING' || gameState === 'LEVEL_UP') && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/55">
              <div className="font-mono text-4xl font-black tracking-[0.35em] text-white">PAUSADO</div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-green-200">P retoma</div>
              <button
                type="button"
                onClick={() => pauseRef.current()}
                className="mt-6 border border-green-400 px-8 py-3 font-bold text-green-100"
              >
                RETOMA
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {gameState === 'START' && (
        <div className="menu-column">
          <GameLogo fallback={<BrandMark />} />
          <div className="w-full space-y-3">
            <div className="title-panel title-cut px-5 py-4">
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-green-400">
                Pilot Callsign
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700" size={16} />
                <input
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value.toUpperCase().slice(0, 10))}
                  placeholder="PILOT-01"
                  className="w-full border border-green-900/80 bg-black/50 py-3 pl-9 pr-3 font-mono text-white outline-none transition-colors focus:border-green-400"
                />
              </div>
            </div>
            <button
              onClick={startGame}
              disabled={!playerName.trim()}
              className="title-cut flex w-full items-center justify-center gap-2 bg-green-500 py-3.5 font-bold tracking-wide text-black transition-colors hover:bg-green-400 disabled:opacity-40"
            >
              <Play className="fill-current" size={18} />
              INITIATE MISSION
            </button>
            <button
              onClick={() => setGameState('LEADERBOARD')}
              className="title-cut flex w-full items-center justify-center gap-2 border border-green-800/70 py-3 font-bold tracking-wide text-green-100 transition-colors hover:bg-green-950"
            >
              <Trophy size={16} />
              HALL OF FAME
            </button>
            <button
              type="button"
              onClick={() => setManualBlocked(!openManualWindow())}
              className="title-cut flex w-full items-center justify-center gap-2 border border-green-900 py-2.5 font-mono text-[11px] font-bold tracking-[0.22em] text-green-300 transition-colors hover:bg-green-950"
            >
              <BookOpen size={14} />
              MANUAL
            </button>
            {manualBlocked && (
              <p className="text-center font-mono text-[10px] uppercase tracking-widest text-amber-300">
                O navegador bloqueou a janela. Permita popups deste site.
              </p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 font-mono text-[10px] uppercase tracking-widest text-green-200">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-6 items-center border border-green-900 px-2 text-green-300">A D</div>
              MOVE
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-6 w-16 items-center justify-center border border-green-900 text-green-300">SPACE</div>
              FIRE
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-6 w-10 items-center justify-center border border-green-900 text-green-300">X</div>
              LASER
            </div>
          </div>
          <p className="mt-4 max-w-md text-center font-mono text-[10px] uppercase leading-relaxed tracking-widest text-green-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            M mute · P pausa · [ ] volume. Side cannons fire the saucer bomb, six volleys. Twin plasma stays until a real hit.
          </p>
        </div>
      )}

      {gameState === 'LEADERBOARD' && (
        <div className="hof">
          <div className="hof-head">
            <Trophy className="text-yellow-400" size={36} />
            <h2>TOP PILOTS</h2>
          </div>
          <div className="hof-stage" aria-label="100 maiores pontuações">
            {ranked.length === 0 ? (
              <p className="hof-empty">No data recorded in the archives...</p>
            ) : (
              <div className="hof-crawl" style={{ animationDuration: `${crawlSeconds}s` }}>
                {ranked.map((entry, index) => (
                  <div className="hof-row" key={entry.id}>
                    <span className="hof-rank">{rankLabel(index)}</span>
                    <span className="hof-name">{entry.name}</span>
                    <span className="hof-wave">WAVE {entry.level}</span>
                    <span className="hof-score">{Number(entry.score).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setGameState('START')}
            className="hof-back"
          >
            RETURN TO BASE
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <div className="audio-dock">
        <button type="button" aria-pressed={muted} onClick={() => muteRef.current()}>
          {muted ? 'UNMUTE' : 'MUTE'}
        </button>
        <label>
          VOL
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              soundService.unlock();
              soundService.setVolume(next);
            }}
          />
        </label>
        {gameState === 'PLAYING' && (
          <button type="button" onClick={() => pauseRef.current()}>
            {paused ? 'P · RETOMA' : 'P · PAUSA'}
          </button>
        )}
      </div>
    </div>
  );
}
