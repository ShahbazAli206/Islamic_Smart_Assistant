'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, CheckCircle2, Loader2, HardDrive, Globe2 } from 'lucide-react';
import { TRANSLATIONS, LOCAL_AUDIO_EDITIONS, type TranslationId } from '@/lib/quran';
import { archiveUrl, canDownload, type ProgressEvent } from '@/lib/translationAudioLocal';

const TOTAL_AYAHS = 6236;

// Downloadable languages, resolved to display names once at module load.
type Row = { id: TranslationId; lang: string; name: string; short: string };
const ROWS: Row[] = (Object.keys(LOCAL_AUDIO_EDITIONS) as TranslationId[]).map((id) => {
  const t = TRANSLATIONS.find((x) => x.id === id);
  return { id, lang: LOCAL_AUDIO_EDITIONS[id]!, name: t?.name ?? id, short: t?.short ?? '' };
}).sort((a, b) => a.name.localeCompare(b.name));

function fmtBytes(b: number) {
  if (b <= 0) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type LangState = { count: number; bytes: number };

interface Props {
  open: boolean;
  onClose: () => void;
  highlight?: TranslationId | null;   // language the user just selected
  isDark: boolean;
}

/**
 * Desktop-only modal: browse & download per-language offline translation audio.
 * Downloads run one at a time (a queue); progress is shown live per language.
 */
export function TranslationDownloadModal({ open, onClose, highlight, isDark }: Props) {
  const [stateByLang, setStateByLang] = useState<Record<string, LangState>>({});
  const [queue, setQueue]     = useState<string[]>([]);          // langs waiting/active
  const [active, setActive]   = useState<string | null>(null);   // lang downloading now
  const [prog, setProg]       = useState<ProgressEvent | null>(null);
  const [mounted, setMounted] = useState(false);
  const runningRef = useRef(false);
  const downloadable = canDownload();

  useEffect(() => { setMounted(true); }, []);

  const refreshAll = async () => {
    const api = (window as any).desktop?.transAudio;
    if (!api) return;
    const s = await api.statsAll() as { byLang: Record<string, LangState> };
    setStateByLang(s.byLang ?? {});
  };

  useEffect(() => {
    if (!open) return;
    refreshAll();
    const api = (window as any).desktop?.transAudio;
    const unsub = api?.onProgress((e: ProgressEvent) => {
      setProg(e);
      if (e.phase === 'extract' && e.done === e.total) setTimeout(refreshAll, 150);
    });
    return () => unsub?.();
  }, [open]);

  // Sequential queue processor
  useEffect(() => {
    if (runningRef.current || queue.length === 0 || !downloadable) return;
    const api = (window as any).desktop?.transAudio;
    if (!api) return;

    runningRef.current = true;
    const lang = queue[0];
    setActive(lang);
    setProg(null);
    const url = archiveUrl(lang);
    (async () => {
      try { if (url) await api.download(lang, url); }
      finally {
        await refreshAll();
        runningRef.current = false;
        setActive(null);
        setProg(null);
        setQueue((q) => q.slice(1));
      }
    })();
  }, [queue, downloadable]);

  const enqueue = (lang: string) => setQueue((q) => (q.includes(lang) ? q : [...q, lang]));

  const clearLang = async (lang: string) => {
    const api = (window as any).desktop?.transAudio;
    if (!api || active === lang) return;
    await api.clear(lang);
    await refreshAll();
  };

  const totals = useMemo(() => {
    const langs = Object.values(stateByLang);
    const ready = ROWS.filter((r) => (stateByLang[r.lang]?.count ?? 0) >= TOTAL_AYAHS - 10).length;
    const bytes = langs.reduce((a, s) => a + (s.bytes ?? 0), 0);
    return { ready, bytes };
  }, [stateByLang]);

  if (!mounted) return null;

  const pct = prog
    ? prog.phase === 'download'
      ? (prog.totalBytes ? Math.round((prog.received! / prog.totalBytes) * 100) : null)
      : (prog.total ? Math.round((prog.done! / prog.total) * 100) : null)
    : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Transparent blurred backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: isDark ? 'rgba(3,10,6,0.55)' : 'rgba(8,20,14,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden
              ${isDark ? 'border-white/15 text-parchment' : 'border-white/40 text-ink'}`}
            style={{
              background: isDark
                ? 'linear-gradient(165deg, rgba(16,42,28,0.92) 0%, rgba(9,24,16,0.94) 100%)'
                : 'linear-gradient(165deg, rgba(255,255,255,0.92) 0%, rgba(240,250,244,0.94) 100%)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className={`shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-black/8'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
                  <Globe2 size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-lg leading-tight truncate">Offline Translation Audio</h2>
                  <p className={`text-xs ${isDark ? 'text-parchment/55' : 'text-ink/50'}`}>
                    {totals.ready}/{ROWS.length} languages ready
                    {totals.bytes > 0 && ` · ${fmtBytes(totals.bytes)} on disk`}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className={`grid h-8 w-8 place-items-center rounded-lg transition ${isDark ? 'hover:bg-white/10 text-parchment/70' : 'hover:bg-black/8 text-ink/60'}`}>
                <X size={18} />
              </button>
            </div>

            {!downloadable && (
              <div className={`shrink-0 px-6 py-2.5 text-xs ${isDark ? 'bg-amber-900/20 text-amber-200/90' : 'bg-amber-50 text-amber-800'}`}>
                Download host not configured yet — set NEXT_PUBLIC_TRANSLATION_AUDIO_BASE. Downloaded audio still plays offline.
              </div>
            )}

            {/* Language list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {ROWS.map((r) => {
                const st = stateByLang[r.lang];
                const count = st?.count ?? 0;
                const ready = count >= TOTAL_AYAHS - 10;
                const isActive = active === r.lang;
                const isQueued = queue.includes(r.lang) && !isActive;
                const isHi = highlight === r.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition
                      ${isHi ? (isDark ? 'bg-emerald-500/15 ring-1 ring-emerald-400/40' : 'bg-emerald-50 ring-1 ring-emerald-300')
                             : (isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]')}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{r.name}</span>
                        {r.short && <span className={`text-xs shrink-0 ${isDark ? 'text-parchment/45' : 'text-ink/45'}`}>{r.short}</span>}
                      </div>
                      {/* Per-row progress / status */}
                      {isActive ? (
                        <div className="mt-1.5 space-y-1">
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                            <div className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: pct != null ? `${pct}%` : '40%' }} />
                          </div>
                          <p className={`text-[11px] ${isDark ? 'text-parchment/55' : 'text-ink/50'}`}>
                            {prog?.phase === 'extract'
                              ? `Extracting ${prog.done?.toLocaleString()}/${prog.total?.toLocaleString()}`
                              : `Downloading${prog?.totalBytes ? ` · ${fmtBytes(prog.received ?? 0)} / ${fmtBytes(prog.totalBytes)}` : '…'}`}
                          </p>
                        </div>
                      ) : (
                        <p className={`text-[11px] mt-0.5 ${ready ? 'text-emerald-500' : isDark ? 'text-parchment/45' : 'text-ink/45'}`}>
                          {ready ? 'Ready offline' : count > 0 ? `${count.toLocaleString()}/${TOTAL_AYAHS.toLocaleString()} partial` : isQueued ? 'Queued…' : 'Not downloaded'}
                          {st?.bytes ? ` · ${fmtBytes(st.bytes)}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {ready && !isActive ? (
                        <>
                          <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium"><CheckCircle2 size={14} /></span>
                          <button onClick={() => clearLang(r.lang)} title="Delete downloaded audio"
                            className={`grid h-8 w-8 place-items-center rounded-lg transition ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-900/20' : 'text-red-500/60 hover:text-red-600 hover:bg-red-50'}`}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : isActive ? (
                        <Loader2 size={16} className="animate-spin text-emerald-500" />
                      ) : (
                        <button
                          onClick={() => enqueue(r.lang)}
                          disabled={!downloadable || isQueued}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-40
                            ${isDark ? 'bg-emerald-700/50 hover:bg-emerald-600/60 text-emerald-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                        >
                          <Download size={12} /> {isQueued ? 'Queued' : 'Download'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`shrink-0 px-6 py-3 border-t text-[11px] ${isDark ? 'border-white/10 text-parchment/45' : 'border-black/8 text-ink/45'}`}>
              Audio is stored on this device and plays offline. Each language is the full Quran (~300–780 MB).
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
