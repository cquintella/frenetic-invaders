/// <reference types="vite/client" />

interface FreneticDebug {
  sound: import('./services/soundService').SoundService;
  getEngine: () => import('./game/engine').GameEngine | null;
}

declare global {
  interface Window {
    __frenetic?: FreneticDebug;
  }
}

export {};
