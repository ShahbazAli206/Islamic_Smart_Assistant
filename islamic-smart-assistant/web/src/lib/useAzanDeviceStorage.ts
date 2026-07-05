'use client';

// Storage backend for the Auto-Azan output-device selections
// (isa:azanDeviceIds / isa:azanLocalDeviceIds / isa:castDeviceId).
//
// Desktop app: backed by localStorage. Electron's BrowserWindow already
// persists localStorage to disk under userData, so a selection made once
// survives app restarts until the user changes it again — no separate
// native store needed.
// Plain website: backed by sessionStorage instead. The web build has no
// login/account (see the "web app has no login flow" note elsewhere in this
// repo), so there's nowhere to persist a per-user choice across browser
// restarts on a possibly-shared machine — the selection lives for the
// current browser session only.

import { useCallback, useEffect, useRef, useState } from 'react';

function isDesktopRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { desktop?: unknown };
  return !!w.desktop || /electron/i.test(navigator.userAgent);
}

function azanStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return isDesktopRuntime() ? window.localStorage : window.sessionStorage;
}

/** Read an Auto-Azan device-selection key outside of React (e.g. AutoAzanScheduler's fire()). */
export function readAzanDeviceSetting<T>(key: string, fallback: T): T {
  const storage = azanStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Same shape as useLocalStorage (web/src/lib/useLocalStorage.ts), but backed
 * by sessionStorage on plain web and localStorage on the desktop app — see
 * module comment above.
 */
export function useAzanDeviceStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  // Same skip-first-write guard as useLocalStorage — prevents the write effect
  // from firing on mount with `initial` and clobbering a stored value before
  // the read effect's setValue() has applied in a render.
  const skipWrite = useRef(true);

  useEffect(() => {
    skipWrite.current = true;
    setValue(readAzanDeviceSetting(key, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const storage = azanStorage();
    if (!storage) return;
    if (skipWrite.current) { skipWrite.current = false; return; }
    try { storage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  // Cross-tab sync (desktop/localStorage only — sessionStorage is per-tab by
  // design on web, so there's nothing to sync there).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setValue(JSON.parse(e.newValue) as T); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const setter = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, setter];
}
