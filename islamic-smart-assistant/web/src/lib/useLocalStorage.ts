'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Persistent state in localStorage. Reads on mount (SSR-safe), writes on change.
 * Returns [value, setValue] just like useState. Sync across tabs via the storage event.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

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
