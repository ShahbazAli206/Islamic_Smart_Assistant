'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, HardDrive, Loader2, CheckCircle2 } from 'lucide-react';
import { isBnLocalSupported, bnSourceUrl } from '@/lib/bnAudioLocal';
import { SURAHS } from '@/lib/surahs';

// Build global ayah start index for each surah (computed once at module level).
const SURAH_RANGES = (() => {
  let start = 1;
  return SURAHS.map((s) => {
    const r = { number: s.number, name: s.englishName, start, end: start + s.ayahs - 1, count: s.ayahs };
    start += s.ayahs;
    return r;
  });
})();
const TOTAL_AYAHS = SURAH_RANGES[SURAH_RANGES.length - 1]?.end ?? 6236;

function fmtBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  surahNumber: number;
  isDark: boolean;
}

export function BnAudioManager({ surahNumber, isDark }: Props) {
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [bytes, setBytes]           = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress]     = useState<{ done: number; total: number; failed: number } | null>(null);
  const [clearing, setClearing]     = useState(false);
  const supported = isBnLocalSupported();

  const refreshState = useCallback(async () => {
    const api = (window as any).desktop?.bnAudio;
    if (!api) return;
    const [nums, s] = await Promise.all([api.list() as Promise<number[]>, api.stats() as Promise<{ count: number; bytes: number }>]);
    setDownloaded(new Set(nums));
    setBytes(s.bytes);
  }, []);

  useEffect(() => {
    if (!supported) return;
    refreshState();
    const api = (window as any).desktop?.bnAudio;
    const unsub = api?.onProgress((data: { done: number; total: number; failed: number }) => {
      setProgress(data);
      if (data.done === data.total) setTimeout(refreshState, 200);
    });
    return () => unsub?.();
  }, [supported, refreshState]);

  if (!supported) return null;

  const surahRange    = SURAH_RANGES.find((r) => r.number === surahNumber);
  const surahAyahs    = surahRange
    ? Array.from({ length: surahRange.count }, (_, i) => surahRange.start + i)
    : [];
  const surahDone     = surahAyahs.filter((n) => downloaded.has(n)).length;
  const surahComplete = surahAyahs.length > 0 && surahDone >= surahAyahs.length;
  const allComplete   = downloaded.size >= TOTAL_AYAHS;

  async function startDownload(ayahNums: number[]) {
    const api = (window as any).desktop?.bnAudio;
    if (!api || downloading) return;
    const items = ayahNums
      .filter((n) => !downloaded.has(n))
      .map((n) => ({ ayah: n, url: bnSourceUrl(n) }))
      .filter((x): x is { ayah: number; url: string } => x.url !== null);
    if (!items.length) return;
    setDownloading(true);
    setProgress({ done: 0, total: items.length, failed: 0 });
    try {
      await api.download(items);
    } finally {
      setDownloading(false);
      setProgress(null);
      await refreshState();
    }
  }

  async function clearAll() {
    const api = (window as any).desktop?.bnAudio;
    if (!api || clearing) return;
    setClearing(true);
    try { await api.clear(); } finally {
      setClearing(false);
      await refreshState();
    }
  }

  const card = isDark
    ? 'bg-[#0F2A1C] border border-white/10 text-parchment'
    : 'bg-white border border-black/8 text-ink';

  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${card} space-y-3`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-emerald-500 shrink-0" />
          <span className="font-semibold text-sm">Bengali Audio Cache</span>
        </div>
        <span className={`text-xs tabular-nums ${isDark ? 'text-parchment/50' : 'text-ink/45'}`}>
          {downloaded.size.toLocaleString()}/{TOTAL_AYAHS.toLocaleString()} ayahs
          {bytes > 0 && ` · ${fmtBytes(bytes)}`}
        </span>
      </div>

      {/* Current-surah bar */}
      {surahRange && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className={isDark ? 'text-parchment/65' : 'text-ink/55'}>
              {surahRange.name} — {surahDone}/{surahAyahs.length} downloaded
            </span>
            {surahComplete && (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <CheckCircle2 size={11} /> ready
              </span>
            )}
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${surahAyahs.length ? (surahDone / surahAyahs.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Download progress bar */}
      {downloading && progress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin text-emerald-400" />
              <span className={isDark ? 'text-parchment/65' : 'text-ink/55'}>
                Downloading {progress.done.toLocaleString()}/{progress.total.toLocaleString()}
                {progress.failed > 0 && ` · ${progress.failed} failed`}
              </span>
            </span>
            <span className={`tabular-nums ${isDark ? 'text-parchment/45' : 'text-ink/40'}`}>
              {Math.round((progress.done / progress.total) * 100)}%
            </span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => startDownload(surahAyahs)}
          disabled={downloading || surahComplete}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition
            ${surahComplete
              ? isDark ? 'bg-emerald-900/25 text-emerald-400/50 cursor-default' : 'bg-emerald-50 text-emerald-400 cursor-default'
              : isDark ? 'bg-emerald-800/40 hover:bg-emerald-700/50 text-emerald-200 active:scale-95' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'}
            disabled:opacity-50`}
        >
          {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          This Surah
        </button>

        <button
          onClick={() => startDownload(Array.from({ length: TOTAL_AYAHS }, (_, i) => i + 1))}
          disabled={downloading || allComplete}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition
            ${allComplete
              ? isDark ? 'bg-white/5 text-parchment/25 cursor-default' : 'bg-black/5 text-ink/25 cursor-default'
              : isDark ? 'bg-white/10 hover:bg-white/15 text-parchment active:scale-95' : 'bg-black/6 hover:bg-black/10 text-ink active:scale-95'}
            disabled:opacity-50`}
        >
          {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          All {TOTAL_AYAHS.toLocaleString()} Ayahs
        </button>

        {downloaded.size > 0 && (
          <button
            onClick={clearAll}
            disabled={clearing}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition active:scale-95
              ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-900/20' : 'text-red-500/60 hover:text-red-600 hover:bg-red-50'}
              disabled:opacity-40`}
          >
            {clearing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Clear Cache
          </button>
        )}
      </div>
    </div>
  );
}
