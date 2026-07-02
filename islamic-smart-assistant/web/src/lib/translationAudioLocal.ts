'use client';

// Client-side helpers for the local (downloaded) translation-audio cache.
// Only functional inside the Electron desktop app; every function is safe to
// call in the browser (returns null / false / empty set gracefully).
//
// Editions listed in LOCAL_AUDIO_EDITIONS (quran.ts) have no free per-ayah CDN
// recording, so we pre-generated neural-TTS audio. The desktop app downloads a
// per-language archive on demand into local storage, served via the
// isa-audio://{lang}/{N}.mp3 custom protocol.

import { useEffect, useRef, useState } from 'react';
import { LOCAL_AUDIO_EDITIONS, localAudioLangOf, type TranslationId } from './quran';

export { LOCAL_AUDIO_EDITIONS, localAudioLangOf };

type TransAudioApi = {
  list:       (lang: string) => Promise<number[]>;
  stats:      (lang: string) => Promise<{ count: number; bytes: number }>;
  statsAll:   () => Promise<{ totalBytes: number; byLang: Record<string, { count: number; bytes: number }> }>;
  clear:      (lang: string) => Promise<{ deleted: number }>;
  download:   (lang: string, archiveUrl: string) => Promise<{ ok: boolean; extracted: number; error?: string }>;
  getUrl:     (lang: string, ayahNumber: number) => string;
  onProgress: (cb: (d: ProgressEvent) => void) => () => void;
};

export type ProgressEvent = {
  lang: string;
  phase: 'download' | 'extract';
  received?: number;   // bytes downloaded
  totalBytes?: number; // content-length (0 if unknown)
  done?: number;       // files extracted
  total?: number;      // files to extract
};

function getApi(): TransAudioApi | null {
  if (typeof window === 'undefined') return null;
  return (window as any).desktop?.transAudio ?? null;
}

/** True when running inside the Electron desktop app with local-audio support. */
export function isLocalAudioSupported(): boolean {
  return !!getApi();
}

/** The storage language folder for a translation edition, or null if no local audio. */
export function localAudioLang(translation: TranslationId): string | null {
  return localAudioLangOf(translation);
}

/** `isa-audio://{lang}/{N}.mp3` for a downloaded ayah. */
export function localAudioUrl(lang: string, ayahNumber: number): string {
  return `isa-audio://${lang}/${ayahNumber}.mp3`;
}

// Public host for the per-language audio archives. Kept in a dedicated PUBLIC
// GitHub repo (release assets) so the code repo can stay private. Overridable at
// build time with NEXT_PUBLIC_TRANSLATION_AUDIO_BASE.
const DEFAULT_AUDIO_BASE =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases/download/audio-v1';

function audioBase(): string {
  const env = (process.env.NEXT_PUBLIC_TRANSLATION_AUDIO_BASE ?? '').trim();
  return (env || DEFAULT_AUDIO_BASE).replace(/\/+$/, '');
}

/**
 * URL of a language's downloadable audio archive (a .zip of {N}.mp3 files),
 * e.g. `${base}/de.zip`.
 */
export function archiveUrl(lang: string): string | null {
  const base = audioBase();
  if (!base) return null;
  return `${base}/${lang}.zip`;
}

/** Whether downloading is possible (desktop app + a configured host). */
export function canDownload(): boolean {
  return isLocalAudioSupported() && !!audioBase();
}

/**
 * Hook: Set of downloaded global ayah numbers for the given translation.
 * Empty on web / when the edition has no local audio / when nothing downloaded.
 * Re-reads after each completed download for that language.
 */
export function useDownloadedAyahs(translation: TranslationId): Set<number> {
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const mounted = useRef(true);
  const lang = localAudioLangOf(translation);

  useEffect(() => {
    mounted.current = true;
    const api = getApi();
    if (!api || !lang) { setDownloaded(new Set()); return; }

    api.list(lang).then((nums) => { if (mounted.current) setDownloaded(new Set(nums)); });

    const unsub = api.onProgress((e) => {
      if (e.lang === lang && e.phase === 'extract' && e.done === e.total) {
        api.list(lang).then((nums) => { if (mounted.current) setDownloaded(new Set(nums)); });
      }
    });
    return () => { mounted.current = false; unsub(); };
  }, [lang]);

  return downloaded;
}
