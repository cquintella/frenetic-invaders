import { useEffect, useState, type ReactNode } from 'react';
import { LOGO_SRC, OPENING_SRC } from './art';

function useImage(src: string): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setOk(true);
    };
    img.onerror = () => {
      if (live) setOk(false);
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [src]);
  return ok;
}

export function OpeningBackdrop() {
  const ok = useImage(OPENING_SRC);
  return (
    <div className="opening-scene" aria-hidden="true">
      {ok ? (
        <>
          <img className="opening-fill" src={OPENING_SRC} alt="" />
          <img className="opening-sharp" src={OPENING_SRC} alt="" />
        </>
      ) : (
        <div className="space-stars" />
      )}
      <div className="opening-vignette" />
    </div>
  );
}

export function GameLogo({ fallback }: { fallback: ReactNode }) {
  const ok = useImage(LOGO_SRC);
  return (
    <h1 className="title-heading">
      {ok ? <img className="title-logo" src={LOGO_SRC} alt="" /> : fallback}
      <span className={ok ? 'sr-only' : 'logo-lockup'}>
        <span className="logo-word">FRENETIC</span>
        <span className="logo-sub">
          <span className="logo-rule" />
          INVADERS
        </span>
      </span>
    </h1>
  );
}
