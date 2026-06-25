'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Scissors, Loader2, Check } from 'lucide-react';
import { decodeAudioFile, computePeaks, encodeWavClip, formatClock } from '@/lib/audioTrim';
import { putAzanClip, getAzanClip, deleteAzanClip, isCustomAzan, CUSTOM_AZAN_PREFIX, type CustomAzan } from '@/lib/customAzan';
import { Azan } from '@/lib/api';

export type TrimTarget = {
  id: string;
  name: string;
  /** Bundled local path (built-in voices). Tried first. */
  local?: string;
  /** Public URL fallback (built-in remote or backend-synced custom). */
  remote?: string;
};

type Props = {
  open: boolean;
  target: TrimTarget | null;
  onClose: () => void;
  /** replacedId is the original target.id when the trimmed clip replaces it (e.g. a custom azan). */
  onSaved: (meta: CustomAzan, replacedId?: string) => void;
};

const BUCKETS = 240;
const MIN_LEN = 1;

/**
 * Modal that loads any existing azan voice (built-in or custom), shows a
 * waveform with draggable trim handles, and saves the selected segment as a
 * new custom clip in IndexedDB + the backend.
 */
export function AzanTrimmer({ open, target, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playHead, setPlayHead] = useState(0); // 0–1 fraction within the selected region
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const objUrlRef = useRef<string | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);

  const startRef = useRef(0); startRef.current = start;
  const endRef = useRef(0); endRef.current = end;
  const durRef = useRef(0); durRef.current = duration;

  const revokeUrl = () => {
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
  };

  const reset = useCallback(() => {
    setLoading(false); setLoadError(null); setBuffer(null); setPeaks([]);
    setDuration(0); setStart(0); setEnd(0); setName('');
    setSaving(false); setPlaying(false); setPlayHead(0); setError(null);
    revokeUrl();
  }, []);

  const handleClose = useCallback(() => {
    previewRef.current?.pause();
    reset();
    onClose();
  }, [onClose, reset]);

  // Scroll lock + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, handleClose]);

  // Auto-load audio whenever the modal opens with a new target.
  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;

    const load = async () => {
      reset();
      setLoading(true);
      setName(target.name);
      try {
        let blob: Blob | null = null;

        if (isCustomAzan(target.id)) {
          // User's own upload — audio blob lives in IndexedDB.
          blob = await getAzanClip(target.id);
          if (!blob) throw new Error("Clip not found in this browser's storage.");
        } else {
          // Built-in voice or backend-synced custom — fetch from URL.
          const src = target.local || target.remote;
          if (!src) throw new Error('No audio source found for this voice.');

          const tryFetch = async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.blob();
          };

          try {
            blob = await tryFetch(src);
          } catch {
            // Local file not available — fall back to remote URL.
            if (target.remote && target.remote !== src) {
              blob = await tryFetch(target.remote);
            } else {
              throw new Error('Could not download this voice. Check your connection.');
            }
          }
        }

        if (cancelled || !blob) return;

        revokeUrl();
        objUrlRef.current = URL.createObjectURL(blob);
        const file = new File([blob], 'audio', { type: blob.type || 'audio/mpeg' });
        const buf = await decodeAudioFile(file);
        if (cancelled) return;

        setBuffer(buf);
        setPeaks(computePeaks(buf, BUCKETS));
        setDuration(buf.duration);
        setStart(0);
        setEnd(buf.duration);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load audio.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

  // Waveform drawing — re-runs on peaks/selection change and window resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const barW = w / peaks.length;
      const sFrac = duration ? start / duration : 0;
      const eFrac = duration ? end / duration : 1;
      peaks.forEach((p, i) => {
        const frac = i / peaks.length;
        const inSel = frac >= sFrac && frac <= eFrac;
        const barH = Math.max(2, p * h * 0.92);
        ctx.fillStyle = inSel ? '#059669' : '#cbd5d1';
        ctx.fillRect(i * barW, (h - barH) / 2, Math.max(1, barW - 1), barH);
      });
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [peaks, start, end, duration]);

  // Draggable trim handles.
  const handleMove = useCallback((e: PointerEvent) => {
    const el = containerRef.current;
    const which = dragRef.current;
    if (!el || !which) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const t = frac * durRef.current;
    if (which === 'start') setStart(Math.min(t, endRef.current - MIN_LEN));
    else setEnd(Math.max(t, startRef.current + MIN_LEN));
  }, []);

  const handleUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
  }, [handleMove]);

  const startDrag = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = which;
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  useEffect(() => () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    revokeUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMove, handleUp]);

  // Preview the selected segment only, using the already-loaded object URL.
  const playSelection = () => {
    const el = previewRef.current;
    if (!el || !objUrlRef.current) return;
    if (playing) { el.pause(); setPlaying(false); setPlayHead(0); return; }
    if (el.src !== objUrlRef.current) el.src = objUrlRef.current;
    try { el.currentTime = start; } catch { /* not seekable yet */ }
    setPlayHead(0);
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const onPreviewTime = () => {
    const el = previewRef.current;
    if (!el) return;
    const selLen = end - start;
    if (selLen > 0) setPlayHead(Math.min(1, Math.max(0, (el.currentTime - start) / selLen)));
    if (el.currentTime >= end) { el.pause(); el.currentTime = start; setPlaying(false); setPlayHead(0); }
  };

  const save = async () => {
    if (!buffer || !target) return;
    if (end - start < MIN_LEN) { setError('Selection is too short (minimum 1 second).'); return; }
    setSaving(true);
    setError(null);
    try {
      const blob = encodeWavClip(buffer, start, end);
      const trimmedDur = end - start;
      const savedName = name.trim() || target.name;
      const id = `${CUSTOM_AZAN_PREFIX}${crypto.randomUUID()}`;
      await putAzanClip(id, blob);
      // If the original was a custom clip, delete it now so the trimmed version replaces it.
      const replacedId = isCustomAzan(target.id) ? target.id : undefined;
      if (replacedId) await deleteAzanClip(replacedId).catch(() => {});
      // Best-effort backend sync — never blocks the local save.
      Azan.uploadVoice(blob, {
        name: savedName,
        durationMs: Math.round(trimmedDur * 1000),
      }).catch(() => {});
      onSaved({
        id,
        name: savedName,
        createdAt: Date.now(),
        durationSec: Math.round(trimmedDur * 10) / 10,
      }, replacedId);
      handleClose();
    } catch (e) {
      setError(`Save failed. ${e instanceof Error ? e.message : ''}`);
      setSaving(false);
    }
  };

  const sPct = duration ? (start / duration) * 100 : 0;
  const ePct = duration ? (end / duration) * 100 : 100;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-midnight-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/40 bg-white/80 backdrop-blur-2xl shadow-2xl"
          >
            <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-glow-emerald opacity-50" />

            {/* header */}
            <div className="relative bg-mosque-gradient text-parchment px-6 sm:px-8 pt-7 pb-6 overflow-hidden shrink-0">
              <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
              <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-glow-emerald pointer-events-none" />
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-parchment transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="relative flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
                  <Scissors size={22} className="text-gold-300" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold">Trim Azan</h2>
                  <p className="text-emerald-100/75 text-sm truncate max-w-xs">{target?.name ?? ''}</p>
                </div>
              </div>
            </div>

            {/* body */}
            <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">

              {/* loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-emerald-700">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Loading audio…</p>
                </div>
              )}

              {/* load error */}
              {loadError && !loading && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">
                  {loadError}
                </div>
              )}

              {/* trimmer (shown once audio is decoded) */}
              {buffer && !loading && (
                <>
                  {/* name */}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Save as</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Makkah Azan (trimmed)"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>

                  {/* waveform + handles */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-1.5 text-sm font-semibold">
                        <Scissors size={14} className="text-emerald-600" />
                        Select the region to keep
                      </label>
                      <span className="text-xs text-ink/50">Total: {formatClock(duration)}</span>
                    </div>

                    <div
                      ref={containerRef}
                      className="relative h-28 rounded-xl border border-emerald-100 bg-white/60 overflow-hidden select-none touch-none"
                    >
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      {/* dimmed regions outside the selection */}
                      <div className="absolute inset-y-0 left-0 bg-white/55" style={{ width: `${sPct}%` }} />
                      <div className="absolute inset-y-0 right-0 bg-white/55" style={{ width: `${100 - ePct}%` }} />
                      {/* played-region overlay — lightens already-played bars */}
                      {playing && playHead > 0 && (
                        <div
                          className="absolute inset-y-0 bg-white/40 pointer-events-none"
                          style={{ left: `${sPct}%`, width: `${(ePct - sPct) * playHead}%` }}
                        />
                      )}
                      {/* playhead line */}
                      {(playing || playHead > 0) && (
                        <div
                          className="absolute inset-y-0 w-[2px] bg-emerald-400 pointer-events-none z-10 rounded-full"
                          style={{
                            left: `${sPct + (ePct - sPct) * playHead}%`,
                            boxShadow: '0 0 6px 1px rgba(16,185,129,0.55)',
                          }}
                        />
                      )}
                      {/* handles */}
                      {(['start', 'end'] as const).map((which) => (
                        <div
                          key={which}
                          onPointerDown={startDrag(which)}
                          className="absolute top-0 bottom-0 -ml-2 w-4 cursor-ew-resize flex items-center justify-center group"
                          style={{ left: `${which === 'start' ? sPct : ePct}%` }}
                        >
                          <div className="w-0.5 h-full bg-emerald-600" />
                          <div className="absolute w-3.5 h-7 rounded-md bg-emerald-600 shadow group-hover:bg-emerald-700 flex items-center justify-center">
                            <div className="w-0.5 h-3 bg-white/70" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* playback progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-none"
                        style={{ width: `${playing ? playHead * 100 : 0}%` }}
                      />
                    </div>

                    {/* time readout + duration chip */}
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="tabular-nums text-ink/60">
                        {playing
                          ? <><span className="font-semibold text-emerald-700">{formatClock(start + playHead * (end - start))}</span><span className="text-ink/40"> / {formatClock(end - start)}</span></>
                          : <span>{formatClock(start)} – {formatClock(end)}</span>
                        }
                      </span>
                      <span className="chip text-xs">Keeping {formatClock(end - start)}</span>
                    </div>

                    <button
                      onClick={playSelection}
                      className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition
                        ${playing
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Preview selection</>}
                    </button>
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            {/* footer */}
            <div className="shrink-0 border-t border-emerald-100/70 bg-white/70 backdrop-blur px-6 sm:px-8 py-4 flex items-center justify-end gap-2">
              <button onClick={handleClose} className="btn-ghost py-2.5 px-5">Cancel</button>
              <button
                onClick={save}
                disabled={!buffer || saving || loading}
                className="btn-primary py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : <><Check size={16} /> Save Trimmed Azan</>}
              </button>
            </div>

            <audio ref={previewRef} onTimeUpdate={onPreviewTime} onEnded={() => { setPlaying(false); setPlayHead(0); }} preload="auto" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
