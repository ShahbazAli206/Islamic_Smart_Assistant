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

// Approximate download size per language (MB), measured from the generated audio.
// Lets the UI show disk usage before downloading.
export const LANG_AUDIO_SIZE_MB: Record<string, number> = {
  am: 284, az: 451, bg: 299, bs: 288, cs: 283, de: 361, es: 296, hi: 467,
  id: 387, it: 287, ja: 394, ko: 333, ml: 401, ms: 541, my: 777, nl: 308,
  pl: 321, ps: 330, pt: 279, ro: 317, si: 428, so: 273, sq: 335, sv: 404,
  sw: 317, ta: 500, th: 359, uz: 576,
};

/** Total size (MB) of all downloadable languages. */
export const TOTAL_AUDIO_SIZE_MB = Object.values(LANG_AUDIO_SIZE_MB).reduce((a, b) => a + b, 0);

/** Human-readable size for a language folder (e.g. "361 MB"). */
export function langSizeLabel(lang: string): string {
  const mb = LANG_AUDIO_SIZE_MB[lang];
  if (!mb) return '';
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

/** Format a byte count as KB/MB/GB. */
export function fmtBytes(b: number): string {
  if (b <= 0) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Consume the one-time "prompt for downloads on first launch" flag (desktop). */
export async function consumeFirstRunPrompt(): Promise<boolean> {
  const api = getApi() as (TransAudioApi & { consumeFirstRunPrompt?: () => Promise<boolean> }) | null;
  if (!api?.consumeFirstRunPrompt) return false;
  try { return await api.consumeFirstRunPrompt(); } catch { return false; }
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
