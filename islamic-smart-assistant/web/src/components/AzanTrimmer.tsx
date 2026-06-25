'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Scissors, Loader2, Check } from 'lucide-react';
import { decodeAudioFile, computePeaks, encodeWavClip, formatClock } from '@/lib/audioTrim';
import { putAzanClip, getAzanClip, deleteAzanClip, isCustomAzan, CUSTOM_AZAN_PREFIX, type CustomAzan } from '@/lib/customAzan';
import { Azan } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

export type TrimTarget = {
  id: string;
  name: string;
  local?: string;
  remote?: string;
  badge?: 'popular' | 'new';
  tags?: string[];
};

type Props = {
  open: boolean;
  target: TrimTarget | null;
  onClose: () => void;
  onSaved: (meta: CustomAzan, replacedId?: string) => void;
};

const BUCKETS = 240;
const MIN_LEN = 1;

export function AzanTrimmer({ open, target, onClose, onSaved }: Props) {
  const { isDark } = useTheme();

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
  const [playHead, setPlayHead] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const objUrlRef = useRef<string | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);

  const startRef = useRef(0); startRef.current = start;
  const endRef = useRef(0); endRef.current = end;
  const durRef = useRef(0); durRef.current = duration;

  const revokeUrl = () => { if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; } };

  const reset = useCallback(() => {
    setLoading(false); setLoadError(null); setBuffer(null); setPeaks([]);
    setDuration(0); setStart(0); setEnd(0); setName('');
    setSaving(false); setPlaying(false); setPlayHead(0); setError(null);
    revokeUrl();
  }, []);

  const handleClose = useCallback(() => {
    previewRef.current?.pause(); reset(); onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    const load = async () => {
      reset(); setLoading(true); setName(target.name);
      try {
        let blob: Blob | null = null;
        if (isCustomAzan(target.id)) {
          blob = await getAzanClip(target.id);
          if (!blob) throw new Error("Clip not found in this browser's storage.");
        } else {
          const src = target.local || target.remote;
          if (!src) throw new Error('No audio source found for this voice.');
          const tryFetch = async (url: string) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.blob();
          };
          try { blob = await tryFetch(src); }
          catch {
            if (target.remote && target.remote !== src) blob = await tryFetch(target.remote);
            else throw new Error('Could not download this voice. Check your connection.');
          }
        }
        if (cancelled || !blob) return;
        revokeUrl();
        objUrlRef.current = URL.createObjectURL(blob);
        const file = new File([blob], 'audio', { type: blob.type || 'audio/mpeg' });
        const buf = await decodeAudioFile(file);
        if (cancelled) return;
        setBuffer(buf); setPeaks(computePeaks(buf, BUCKETS));
        setDuration(buf.duration); setStart(0); setEnd(buf.duration); setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load audio.');
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id]);

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
        ctx.fillStyle = inSel ? '#059669' : (isDark ? '#2d5a45' : '#cbd5d1');
        ctx.fillRect(i * barW, (h - barH) / 2, Math.max(1, barW - 1), barH);
      });
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [peaks, start, end, duration, isDark]);

  const handleMove = useCallback((e: PointerEvent) => {
    const el = containerRef.current; const which = dragRef.current;
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
    e.preventDefault(); dragRef.current = which;
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  useEffect(() => () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    revokeUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMove, handleUp]);

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
    setSaving(true); setError(null);
    try {
      const blob = encodeWavClip(buffer, start, end);
      const trimmedDur = end - start;
      const savedName = name.trim() || target.name;
      const id = `${CUSTOM_AZAN_PREFIX}${crypto.randomUUID()}`;
      await putAzanClip(id, blob);
      if (isCustomAzan(target.id)) await deleteAzanClip(target.id).catch(() => {});
      const replacedId = target.id;
      Azan.uploadVoice(blob, { name: savedName, durationMs: Math.round(trimmedDur * 1000), audioType: 'azan' }).catch(() => {});
      onSaved({ id, name: savedName, createdAt: Date.now(), durationSec: Math.round(trimmedDur * 10) / 10, badge: target.badge, tags: target.tags }, replacedId);
      handleClose();
    } catch (e) {
      setError(`Save failed. ${e instanceof Error ? e.message : ''}`); setSaving(false);
    }
  };

  const sPct = duration ? (start / duration) * 100 : 0;
  const ePct = duration ? (end / duration) * 100 : 100;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className={`relative w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl ${
              isDark
                ? 'bg-[#0d1f17] border border-emerald-900/50 shadow-black/70'
                : 'bg-[#f7f3eb] border border-gray-200/80 shadow-emerald-900/12'
            }`}
          >
            {/* ── Header ── */}
            <div className="relative px-6 sm:px-8 pt-6 pb-5 flex items-start gap-4">
              {/* Badge */}
              <div
                className="w-[60px] h-[60px] shrink-0 rounded-2xl overflow-hidden shadow-lg"
                style={{
                  background: isDark
                    ? 'radial-gradient(ellipse at 30% 30%, #1e4a30, #061009)'
                    : 'radial-gradient(ellipse at 30% 30%, #1a5c36, #0b3520)',
                }}
              >
                <svg viewBox="0 0 60 60" width="60" height="60">
                  <circle cx="8" cy="10" r="0.9" fill="rgba(255,255,255,0.6)" />
                  <circle cx="47" cy="7" r="0.75" fill="rgba(255,255,255,0.5)" />
                  <circle cx="35" cy="15" r="0.65" fill="rgba(255,255,255,0.4)" />
                  <circle cx="54" cy="20" r="0.6" fill="rgba(255,255,255,0.45)" />
                  <circle cx="16" cy="22" r="0.55" fill="rgba(255,255,255,0.35)" />
                  <circle cx="43" cy="12" r="7.5" fill="#E9CF7A" />
                  <circle cx="46.5" cy="9.5" r="6" fill={isDark ? '#071a10' : '#0b3520'} />
                  {/* scissors */}
                  <g transform="translate(30,37) scale(0.72)" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="-9" cy="-9" r="5"/>
                    <circle cx="9" cy="-9" r="5"/>
                    <line x1="-5" y1="-5" x2="14" y2="14"/>
                    <line x1="5" y1="-5" x2="-14" y2="14"/>
                  </g>
                  <circle cx="30" cy="14" r="1.8" fill="#E9CF7A" />
                </svg>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h2 className={`font-bold text-xl sm:text-2xl leading-tight ${isDark ? 'text-[#E9CF7A]' : 'text-emerald-900'}`}>
                  Trim Azan
                </h2>
                <p className={`text-sm mt-1 leading-snug truncate max-w-xs ${isDark ? 'text-white/55' : 'text-emerald-900/60'}`}>
                  {target?.name ?? 'Select the region to keep'}
                </p>
              </div>

              <button onClick={handleClose} aria-label="Close"
                className={`mt-1 w-8 h-8 rounded-full border grid place-items-center transition shrink-0 ${
                  isDark
                    ? 'border-white/25 text-white/50 hover:text-white hover:bg-white/10'
                    : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}>
                <X size={15} />
              </button>
            </div>

            {/* Divider */}
            <div className={`mx-6 sm:mx-8 h-px ${isDark ? 'bg-white/[0.07]' : 'bg-emerald-100'}`} />

            {/* ── Body ── */}
            <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] border border-white/10' : 'bg-emerald-50 border border-emerald-100'}`}>
                    <Loader2 size={28} className="text-emerald-500 animate-spin" />
                  </div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-emerald-800/70'}`}>Loading audio…</p>
                </div>
              )}

              {loadError && !loading && (
                <p className={`text-sm rounded-xl px-3 py-2.5 border ${isDark ? 'text-rose-300 bg-rose-900/30 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                  {loadError}
                </p>
              )}

              {buffer && !loading && (
                <>
                  <div>
                    <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-white/80' : 'text-emerald-950'}`}>Save as</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Makkah Azan (trimmed)"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${
                        isDark
                          ? 'border border-white/15 bg-white/10 text-white placeholder:text-white/30 focus:ring-emerald-500/50'
                          : 'border border-emerald-200 bg-white text-emerald-950 placeholder:text-emerald-900/35 focus:ring-emerald-300'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? 'text-white/80' : 'text-emerald-950'}`}>
                        <Scissors size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                        Select the region to keep
                      </label>
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-emerald-900/45'}`}>
                        Total: {formatClock(duration)}
                      </span>
                    </div>

                    <div ref={containerRef} className={`relative h-28 rounded-xl overflow-hidden select-none touch-none ${
                      isDark ? 'border border-white/10 bg-white/[0.05]' : 'border border-emerald-100 bg-emerald-50/30'
                    }`}>
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      <div className={`absolute inset-y-0 left-0 ${isDark ? 'bg-black/45' : 'bg-white/60'}`} style={{ width: `${sPct}%` }} />
                      <div className={`absolute inset-y-0 right-0 ${isDark ? 'bg-black/45' : 'bg-white/60'}`} style={{ width: `${100 - ePct}%` }} />
                      {playing && playHead > 0 && (
                        <div className="absolute inset-y-0 bg-white/40 pointer-events-none"
                          style={{ left: `${sPct}%`, width: `${(ePct - sPct) * playHead}%` }} />
                      )}
                      {(playing || playHead > 0) && (
                        <div className="absolute inset-y-0 w-[2px] bg-emerald-400 pointer-events-none z-10 rounded-full"
                          style={{ left: `${sPct + (ePct - sPct) * playHead}%`, boxShadow: '0 0 6px 1px rgba(16,185,129,0.55)' }} />
                      )}
                      {(['start', 'end'] as const).map((which) => (
                        <div key={which} onPointerDown={startDrag(which)}
                          className="absolute top-0 bottom-0 -ml-2 w-4 cursor-ew-resize flex items-center justify-center group"
                          style={{ left: `${which === 'start' ? sPct : ePct}%` }}>
                          <div className="w-0.5 h-full bg-emerald-600" />
                          <div className="absolute w-3.5 h-7 rounded-md bg-emerald-600 shadow group-hover:bg-emerald-700 flex items-center justify-center">
                            <div className="w-0.5 h-3 bg-white/70" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-emerald-100'}`}>
                      <div className="h-full rounded-full bg-emerald-500 transition-none" style={{ width: `${playing ? playHead * 100 : 0}%` }} />
                    </div>

                    <div className={`flex items-center justify-between mt-1.5 text-xs ${isDark ? 'text-white/50' : 'text-emerald-900/55'}`}>
                      <span className="tabular-nums">
                        {playing
                          ? <><span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{formatClock(start + playHead * (end - start))}</span><span className="opacity-60"> / {formatClock(end - start)}</span></>
                          : <span>{formatClock(start)} – {formatClock(end)}</span>
                        }
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${isDark ? 'bg-white/10 border border-white/15 text-white/70' : 'bg-emerald-100 border border-emerald-200 text-emerald-800'}`}>
                        Keeping {formatClock(end - start)}
                      </span>
                    </div>

                    <button onClick={playSelection}
                      className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                        playing
                          ? isDark ? 'bg-rose-900/30 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      }`}>
                      {playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Preview selection</>}
                    </button>
                  </div>
                </>
              )}

              {error && (
                <p className={`text-sm rounded-xl px-3 py-2 border ${isDark ? 'text-rose-300 bg-rose-900/30 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                  {error}
                </p>
              )}
            </div>

            {/* ── Footer ── */}
            <div className={`shrink-0 border-t px-6 sm:px-8 py-4 flex items-center justify-end gap-3 ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
              <button onClick={handleClose}
                className={`py-2.5 px-6 rounded-full text-sm font-semibold border transition ${
                  isDark
                    ? 'border-white/20 text-white/55 hover:text-white hover:bg-white/10'
                    : 'border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                Cancel
              </button>
              <button onClick={save} disabled={!buffer || saving || loading}
                className={`inline-flex items-center gap-2 py-2.5 px-6 rounded-full text-sm font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[#C9A227] hover:bg-[#b8911e] text-[#0a1a0f] shadow-amber-900/30'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20'
                }`}>
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save Trimmed Azan</>}
              </button>
            </div>

            <audio ref={previewRef} onTimeUpdate={onPreviewTime} onEnded={() => { setPlaying(false); setPlayHead(0); }} preload="auto" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
