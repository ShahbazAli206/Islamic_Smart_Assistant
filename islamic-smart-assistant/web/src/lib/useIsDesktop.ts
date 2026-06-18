'use client';

import { useEffect, useState } from 'react';

/**
 * True only when running inside the Noor Desktop (Electron) app.
 *
 * The Electron preload exposes `window.desktop` (see desktop/electron/preload.js);
 * on the plain web build that global is undefined. We also accept an "Electron"
 * user-agent as a fallback. Resolved in an effect so server render + first client
 * render agree (both `false`), avoiding a hydration mismatch.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { desktop?: unknown };
    setIsDesktop(!!w.desktop || /electron/i.test(navigator.userAgent));
  }, []);
  return isDesktop;
}
