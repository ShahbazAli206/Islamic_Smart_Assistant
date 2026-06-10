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
  const hydrated = useRef(false);

  // Read from localStorage on mount (runs before the write effect).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    // Mark as hydrated so the write effect knows the initial read is done.
    hydrated.current = true;
  }, [key]);

  // Write to localStorage only AFTER the initial read has set the real value.
  // Without this guard, the write effect fires on mount with the `initial` default
  // and overwrites whatever the user previously stored.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hydrated.current) return; // skip the first render (still using default)
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
