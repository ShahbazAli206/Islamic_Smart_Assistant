'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, Play, Square, Scissors, Loader2, Check, Music2 } from 'lucide-react';
import { decodeAudioFile, computePeaks, encodeWavClip, formatClock } from '@/lib/audioTrim';
import { putAzanClip, CUSTOM_AZAN_PREFIX, type CustomAzan } from '@/lib/customAzan';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (meta: CustomAzan) => void;
};

const BUCKETS = 240;       // waveform resolution (bars)
const MIN_LEN = 1;         // minimum selection length, seconds
const MAX_FILE_MB = 25;    // soft cap on the upload size

/**
 * Glass modal that lets the user upload an audio file, trim any [start,end]
 * segment on a waveform, preview the selection, and save it as a custom Azan.
 * On save it encodes the slice to WAV (lib/audioTrim) and stores it in IndexedDB
 * (lib/customAzan), then hands the metadata back to the page via onSaved.
 */
export function AzanUploader({ open, onClose, onSaved }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const objUrlRef = useRef<string | null>(null);   // object URL of the ORIGINAL file (for preview)
  const dragRef = useRef<'start' | 'end' | null>(null);

  // Mirror trim state into refs so the global pointer handlers read fresh values.
  const startRef = useRef(0); startRef.current = start;
  const endRef = useRef(0); endRef.current = end;
  const durRef = useRef(0); durRef.current = duration;

  const revokeUrl = () => { if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; } };

  const resetState = useCallback(() => {
    setFile(null); setDecoding(false); setBuffer(null); setPeaks([]);
    setDuration(0); setStart(0); setEnd(0); setName(''); setSaving(false);
    setPlaying(false); setError(null); setDragOver(false);
    revokeUrl();
  }, []);

  const handleClose = useCallback(() => {
    previewRef.current?.pause();
    resetState();
    onClose();
  }, [onClose, resetState]);

  // Lock scroll + Escape-to-close while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, handleClose]);

  // Decode a picked/dropped file and prime the trimmer.
  const onPickFile = async (f: File) => {
    setError(null);
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name)) {
      setError('Please choose an audio file (mp3, wav, m4a…).'); return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large (max ${MAX_FILE_MB} MB).`); return;
    }
    revokeUrl();
    objUrlRef.current = URL.createObjectURL(f);
    setFile(f); setBuffer(null); setPeaks([]); setPlaying(false); setDecoding(true);
    setName(f.name.replace(/\.[^.]+$/, ''));
    try {
      const buf = await decodeAudioFile(f);
      setBuffer(buf);
      setPeaks(computePeaks(buf, BUCKETS));
      setDuration(buf.duration);
      setStart(0);
      setEnd(buf.duration);
    } catch {
      setError('Could not read this audio file. Try a different format (mp3/wav/m4a).');
      setFile(null);
    } finally {
      setDecoding(false);
    }
  };

  // ── waveform drawing (re-runs when peaks/selection change, and on resize) ──
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

  // ── trim-handle dragging ──
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

  // Clean up any dangling listeners / object URL on unmount.
  useEffect(() => () => {
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    revokeUrl();
  }, [handleMove, handleUp]);

  // Preview ONLY the selected segment, using the original (untrimmed) file.
  const playSelection = () => {
    const el = previewRef.current;
    if (!el || !objUrlRef.current) return;
    if (playing) { el.pause(); setPlaying(false); return; }
    if (el.src !== objUrlRef.current) el.src = objUrlRef.current;
    try { el.currentTime = start; } catch { /* not seekable yet */ }
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const onPreviewTime = () => {
    const el = previewRef.current;
    if (el && el.currentTime >= end) { el.pause(); el.currentTime = start; setPlaying(false); }
  };

  const save = async () => {
    if (!buffer) return;
    if (end - start < MIN_LEN) { setError('Selection is too short.'); return; }
    setSaving(true);
    setError(null);
    try {
      const blob = encodeWavClip(buffer, start, end);
      const id = `${CUSTOM_AZAN_PREFIX}${crypto.randomUUID()}`;
      await putAzanClip(id, blob);
      onSaved({
        id,
        name: name.trim() || 'Custom Azan',
        createdAt: Date.now(),
        durationSec: Math.round((end - start) * 10) / 10,
      });
      handleClose();
    } catch (e) {
      setError(`Could not save the clip. ${e instanceof Error ? e.message : ''}`);
      setSaving(false);
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
              <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-parchment transition" aria-label="Close">
                <X size={18} />
              </button>
              <div className="relative flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
                  <UploadCloud size={24} className="text-gold-300" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold">Upload custom Azan</h2>
                  <p className="text-emerald-100/75 text-sm">Add your own audio, then trim it to the part you want.</p>
                </div>
              </div>
            </div>

            {/* body */}
            <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
              {/* file picker (shown until a file is decoded) */}
              {!buffer && (
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onPickFile(f); }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition
                    ${dragOver ? 'border-emerald-500 bg-emerald-50/70' : 'border-emerald-200 bg-white/60 hover:border-emerald-400'}`}
                >
                  {decoding ? (
                    <><Loader2 size={28} className="text-emerald-600 animate-spin" /><p className="text-sm text-ink/60">Reading audio…</p></>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Music2 size={26} className="text-emerald-500" />
                      </div>
                      <p className="font-semibold">Drop an audio file or click to browse</p>
                      <p className="text-xs text-ink/50">mp3, wav, m4a, ogg · up to {MAX_FILE_MB} MB</p>
                    </>
                  )}
                  <input
                    type="file" accept="audio/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ''; }}
                  />
                </label>
              )}

              {/* trimmer (shown once decoded) */}
              {buffer && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My local masjid Azan"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-1.5 text-sm font-semibold"><Scissors size={14} className="text-emerald-600" /> Trim</label>
                      <button onClick={() => { revokeUrl(); resetState(); }} className="text-xs text-ink/55 hover:text-ink underline">Choose another file</button>
                    </div>

                    {/* waveform + draggable handles */}
                    <div ref={containerRef} className="relative h-28 rounded-xl border border-emerald-100 bg-white/60 overflow-hidden select-none touch-none">
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      {/* dimmed regions outside the selection */}
                      <div className="absolute inset-y-0 left-0 bg-white/55" style={{ width: `${sPct}%` }} />
                      <div className="absolute inset-y-0 right-0 bg-white/55" style={{ width: `${100 - ePct}%` }} />
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

                    <div className="flex items-center justify-between mt-2 text-xs text-ink/60">
                      <span>{formatClock(start)} – {formatClock(end)}</span>
                      <span className="chip text-xs">Selected {formatClock(end - start)}</span>
                    </div>

                    <button
                      onClick={playSelection}
                      className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition
                        ${playing ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play selection</>}
                    </button>
                  </div>
                </>
              )}

              {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
            </div>

            {/* footer */}
            <div className="shrink-0 border-t border-emerald-100/70 bg-white/70 backdrop-blur px-6 sm:px-8 py-4 flex items-center justify-end gap-2">
              <button onClick={handleClose} className="btn-ghost py-2.5 px-5">Cancel</button>
              <button
                onClick={save}
                disabled={!buffer || saving}
                className="btn-primary py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save Azan</>}
              </button>
            </div>

            <audio ref={previewRef} onTimeUpdate={onPreviewTime} onEnded={() => setPlaying(false)} preload="auto" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
