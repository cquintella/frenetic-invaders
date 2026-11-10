/// <reference types="vite/client" />

interface FreneticDebug {
  sound: import('./services/soundService').SoundService;
  getEngine: () => import('./game/engine').GameEngine | null;
  alienCutsReady?: () => boolean;
  shipPosesReady?: () => boolean;
  backgroundsReady?: () => boolean;
}

declare global {
  interface Window {
    __frenetic?: FreneticDebug;
  }
}

export {};
