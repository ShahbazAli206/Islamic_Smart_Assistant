'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistent state in localStorage. Reads on mount (SSR-safe), writes on change.
 * Returns [value, setValue] just like useState. Sync across tabs via the storage event.
 *
 * IMPORTANT: Only writes to localStorage after the initial read has completed.
 * This prevents overwriting stored values with the hook's default during mount.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  // The read effect (below) sets this to true before the write effect runs in the
  // same commit, causing the write effect to skip its first execution for each key.
  // Without this, the write effect fires on mount with the `initial` default and
  // overwrites whatever the user previously stored — because the read effect's
  // setValue() call only applies in the *next* render, not the current commit.
  const skipWrite = useRef(true);

  // Read from localStorage whenever key changes (including initial mount).
  useEffect(() => {
    skipWrite.current = true; // suppress the paired write that fires in this same commit
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);

  // Write to localStorage when value changes, but never on the same commit as a
  // key-change/mount read (skipWrite guards that first spurious write).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipWrite.current) { skipWrite.current = false; return; }
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  // Sync across same-tab listeners (StorageEvent) and cross-tab.
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

/**
 * One-shot outside-React read of a useLocalStorage-backed value — a plain
 * synchronous localStorage.getItem, no React state or subscription. For firing
 * logic (schedulers/runners mounted once for the whole session) that must
 * never trust another component's possibly-stale useLocalStorage snapshot:
 * the native `storage` event only fires in OTHER tabs, never the tab that made
 * the write, so a same-tab writer (e.g. the Devices page) is otherwise invisible
 * to an already-mounted reader until the app restarts. Mirrors the pattern
 * `readAzanDeviceSetting` already uses for the desktop/web dual-backend keys.
 */
export function readLocalStorageJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
