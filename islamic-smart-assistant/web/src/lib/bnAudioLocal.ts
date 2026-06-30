'use client';

// Client-side helpers for the local Bengali translation audio cache.
// Only available in the Electron desktop app; all functions are safe to call
// in the browser (they return null / false / empty set gracefully).

import { useEffect, useRef, useState } from 'react';

type BnAudioApi = {
  list:       () => Promise<number[]>;
  stats:      () => Promise<{ count: number; bytes: number }>;
  clear:      () => Promise<{ deleted: number }>;
  download:   (items: { ayah: number; url: string }[]) => Promise<{ done: number; failed: number }>;
  getUrl:     (ayahNumber: number) => string;
  onProgress: (cb: (data: { done: number; total: number; failed: number }) => void) => () => void;
};

function getApi(): BnAudioApi | null {
  if (typeof window === 'undefined') return null;
  return (window as any).desktop?.bnAudio ?? null;
}

/** True when running inside the Electron desktop app with local audio support. */
export function isBnLocalSupported(): boolean {
  return !!getApi();
}

/** `isa-audio://bn/{N}.mp3` — served by the Electron protocol handler from userData/audio/bn/. */
export function localBnUrl(ayahNumber: number): string {
  return `isa-audio://bn/${ayahNumber}.mp3`;
}

/**
 * Constructs the remote source URL for a Bengali ayah, used when downloading.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_TTS_BUCKET at build time.
 * Returns null when Supabase is not configured.
 */
export function bnSourceUrl(ayahNumber: number): string | null {
  const base   = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const bucket = process.env.NEXT_PUBLIC_TTS_BUCKET || 'quran-audio';
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/translations/bn/${ayahNumber}.mp3`;
}

/**
 * Hook: returns the Set of global ayah numbers (1–6236) downloaded locally.
 * Re-triggers after each completed batch download.
 * Empty set on web / when no files are downloaded.
 */
export function useBnDownloaded(): Set<number> {
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const api = getApi();
    if (!api) return;

    api.list().then((nums) => {
      if (mountedRef.current) setDownloaded(new Set(nums));
    });

    const unsub = api.onProgress(({ done, total }) => {
      if (done === total) {
        api.list().then((nums) => {
          if (mountedRef.current) setDownloaded(new Set(nums));
        });
      }
    });

    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  return downloaded;
}

/** Hook: storage stats for the Bengali audio cache. */
export function useBnStats(): { count: number; bytes: number } | null {
  const [s, setS] = useState<{ count: number; bytes: number } | null>(null);

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.stats().then(setS);
  }, []);

  return s;
}
