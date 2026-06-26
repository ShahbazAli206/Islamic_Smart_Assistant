'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, Play, Square, Scissors, Loader2, Check, Music2, Plus, Bell } from 'lucide-react';
import { decodeAudioFile, computePeaks, encodeWavFromSegments, formatClock } from '@/lib/audioTrim';
import { putAzanClip, saveRemoteUrl, CUSTOM_AZAN_PREFIX, type CustomAzan, type AudioType } from '@/lib/customAzan';
import { Azan } from '@/lib/api';
import { useTheme } from '@/lib/ThemeContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (meta: CustomAzan) => void;
  audioType?: AudioType;
};

const BUCKETS = 240;
const MIN_LEN = 1;
const MAX_FILE_MB = 25;

export function AzanUploader({ open, onClose, onSaved, audioType = 'azan' }: Props) {
  const TYPE_CFG: Record<AudioType, { title: string; desc: string; btn: string }> = {
    azan:   { title: 'Upload custom Azan',   desc: 'Add your own audio, then trim it to the part you want.', btn: 'Save Azan'   },
    durood: { title: 'Upload Durood Sharif', desc: 'Upload a clip to play with your Azan.',                  btn: 'Save Durood' },
    dua:    { title: 'Upload Dua',           desc: 'Upload a supplication to play after your Azan.',          btn: 'Save Dua'    },
  };
  const cfg = TYPE_CFG[audioType];
  const { isDark } = useTheme();

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

  const [extraBuffer, setExtraBuffer] = useState<AudioBuffer | null>(null);
  const [extraName, setExtraName] = useState('');
  const [extraDur, setExtraDur] = useState(0);
  const [extraPos, setExtraPos] = useState<'start' | 'end'>('start');
  const [extraDecoding, setExtraDecoding] = useState(false);
  const [extraPlaying, setExtraPlaying] = useState(false);
  const extraInputRef = useRef<HTMLInputElement>(null);
  const extraPreviewRef = useRef<HTMLAudioElement>(null);
  const extraUrlRef = useRef<string | null>(null);
  const revokeExtraUrl = () => { if (extraUrlRef.current) { URL.revokeObjectURL(extraUrlRef.current); extraUrlRef.current = null; } };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const objUrlRef = useRef<string | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);

  const startRef = useRef(0); startRef.current = start;
  const endRef = useRef(0); endRef.current = end;
  const durRef = useRef(0); durRef.current = duration;

  const revokeUrl = () => { if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; } };

  const resetState = useCallback(() => {
    setFile(null); setDecoding(false); setBuffer(null); setPeaks([]);
    setDuration(0); setStart(0); setEnd(0); setName(''); setSaving(false);
    setPlaying(false); setError(null); setDragOver(false);
    setExtraBuffer(null); setExtraName(''); setExtraDur(0); setExtraPos('start');
    setExtraDecoding(false); setExtraPlaying(false);
    revokeUrl(); revokeExtraUrl();
  }, []);

  const onPickExtra = async (f: File) => {
    setError(null);
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name)) {
      setError('Please choose an audio file for the added sound.'); return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setError(`That sound is too large (max ${MAX_FILE_MB} MB).`); return; }
    revokeExtraUrl();
    extraUrlRef.current = URL.createObjectURL(f);
    setExtraDecoding(true);
    try {
      const buf = await decodeAudioFile(f);
      setExtraBuffer(buf); setExtraDur(buf.duration);
      setExtraName(f.name.replace(/\.[^.]+$/, ''));
    } catch {
      setError('Could not read the added sound. Try mp3/wav/m4a.'); revokeExtraUrl();
    } finally { setExtraDecoding(false); }
  };
  const removeExtra = () => {
    extraPreviewRef.current?.pause(); setExtraPlaying(false);
    revokeExtraUrl(); setExtraBuffer(null); setExtraName(''); setExtraDur(0);
  };
  const previewExtra = () => {
    const el = extraPreviewRef.current;
    if (!el || !extraUrlRef.current) return;
    if (extraPlaying) { el.pause(); setExtraPlaying(false); return; }
    previewRef.current?.pause(); setPlaying(false);
    if (el.src !== extraUrlRef.current) el.src = extraUrlRef.current;
    el.currentTime = 0;
    el.play().then(() => setExtraPlaying(true)).catch(() => setExtraPlaying(false));
  };

  const handleClose = useCallback(() => {
    previewRef.current?.pause(); resetState(); onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, handleClose]);

  const onPickFile = async (f: File) => {
    setError(null);
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name)) {
      setError('Please choose an audio file (mp3, wav, m4a…).'); return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { setError(`That file is too large (max ${MAX_FILE_MB} MB).`); return; }
    revokeUrl();
    objUrlRef.current = URL.createObjectURL(f);
    setFile(f); setBuffer(null); setPeaks([]); setPlaying(false); setDecoding(true);
    setName(f.name.replace(/\.[^.]+$/, ''));
    try {
      const buf = await decodeAudioFile(f);
      setBuffer(buf); setPeaks(computePeaks(buf, BUCKETS));
      setDuration(buf.duration); setStart(0); setEnd(buf.duration);
    } catch {
      setError('Could not read this audio file. Try a different format (mp3/wav/m4a).'); setFile(null);
    } finally { setDecoding(false); }
  };

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
  }, [handleMove, handleUp]);

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
    setSaving(true); setError(null);
    try {
      const main = { buffer, startSec: start, endSec: end };
      const segments = extraBuffer
        ? (extraPos === 'start'
            ? [{ buffer: extraBuffer, startSec: 0, endSec: extraDur }, main]
            : [main, { buffer: extraBuffer, startSec: 0, endSec: extraDur }])
        : [main];
      const blob = encodeWavFromSegments(segments);
      const totalDur = (end - start) + (extraBuffer ? extraDur : 0);
      const DEFAULT_CLIP_NAME: Record<AudioType, string> = { azan: 'Custom Azan', durood: 'Custom Durood', dua: 'Custom Dua' };
      const clipName = name.trim() || DEFAULT_CLIP_NAME[audioType];

      // Upload to the backend first so every browser gets the same ID and a
      // public audio_url. Fall back to a local-only ID when offline.
      let id = `${CUSTOM_AZAN_PREFIX}${crypto.randomUUID()}`;
      let remoteUrl: string | undefined;
      try {
        const remote = await Azan.uploadVoice(blob, { name: clipName, durationMs: totalDur * 1000, audioType });
        id = remote.id;
        remoteUrl = remote.audio_url || undefined;
      } catch {
        // Offline or server error — save locally only; other browsers won't see it until re-uploaded
      }

      await putAzanClip(id, blob);
      if (remoteUrl) saveRemoteUrl(id, remoteUrl);
      onSaved({ id, name: clipName, createdAt: Date.now(), durationSec: Math.round(totalDur * 10) / 10, audioType, remoteUrl });
      handleClose();
    } catch (e) {
      setError(`Could not save the clip. ${e instanceof Error ? e.message : ''}`);
      setSaving(false);
    }
  };

  const sPct = duration ? (start / duration) * 100 : 0;
  const ePct = duration ? (end / duration) * 100 : 100;

  // ── "How it works" steps ────────────────────────────────────────────────────
  const HOW_IT_WORKS = [
    { Icon: UploadCloud, label: 'Upload Audio',    desc: 'Add your Azan audio in any supported format', gold: false },
    { Icon: Scissors,    label: 'Trim & Customize',desc: 'Select the exact part you want to use',        gold: true  },
    { Icon: Bell,        label: 'Set as Azan',     desc: 'Save and use your custom Azan',                gold: false },
  ] as const;

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
              {/* Mosque icon badge */}
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
                  <rect x="14" y="44" width="32" height="11" rx="1.5" fill="rgba(255,255,255,0.25)" />
                  <path d="M27,55 L27,49 Q30,45 33,49 L33,55 Z" fill="rgba(255,255,255,0.12)" />
                  <rect x="14" y="30" width="5" height="16" rx="1.5" fill="rgba(255,255,255,0.22)" />
                  <path d="M13.5,30 Q16.5,24 19.5,30 Z" fill="rgba(255,255,255,0.30)" />
                  <rect x="15.8" y="22" width="1.4" height="6" rx="0.7" fill="rgba(255,255,255,0.42)" />
                  <rect x="41" y="30" width="5" height="16" rx="1.5" fill="rgba(255,255,255,0.22)" />
                  <path d="M40.5,30 Q43.5,24 46.5,30 Z" fill="rgba(255,255,255,0.30)" />
                  <rect x="42.8" y="22" width="1.4" height="6" rx="0.7" fill="rgba(255,255,255,0.42)" />
                  <ellipse cx="30" cy="40" rx="13" ry="10" fill="rgba(255,255,255,0.28)" />
                  <ellipse cx="30" cy="34" rx="8" ry="6" fill="rgba(255,255,255,0.32)" />
                  <rect x="29.2" y="26" width="1.6" height="7" rx="0.8" fill="rgba(255,255,255,0.50)" />
                  <circle cx="30" cy="25" r="1.8" fill="#E9CF7A" />
                </svg>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h2 className={`font-bold text-xl sm:text-2xl leading-tight ${isDark ? 'text-[#E9CF7A]' : 'text-emerald-900'}`}>
                  {cfg.title}
                </h2>
                <p className={`text-sm mt-1 leading-snug ${isDark ? 'text-white/55' : 'text-emerald-900/60'}`}>
                  {cfg.desc}
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

              {/* ── File picker (before decoded) ── */}
              {!buffer && (
                <>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onPickFile(f); }}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-10 text-center cursor-pointer overflow-hidden transition-colors ${
                      dragOver
                        ? isDark ? 'border-emerald-400' : 'border-emerald-500'
                        : isDark ? 'border-emerald-700/50 hover:border-emerald-500/70' : 'border-emerald-400/50 hover:border-emerald-500'
                    }`}
                  >
                    {/* ── Background art ── */}
                    {isDark ? (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(145deg,#0f2a1d 0%,#060e09 100%)' }}>
                        {[[6,8],[20,5],[42,9],[60,6],[75,14],[90,7],[12,22],[55,18],[85,24],[30,28],[68,20],[15,35],[50,32],[78,38]].map(([x,y],i) => (
                          <span key={i} className="absolute rounded-full bg-white"
                            style={{ left:`${x}%`, top:`${y}%`, width:'2px', height:'2px', opacity:0.22+0.22*(i%3) }} />
                        ))}
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 200">
                          <defs>
                            <linearGradient id="upl-swirl" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#E9CF7A" stopOpacity="0"/>
                              <stop offset="35%" stopColor="#E9CF7A" stopOpacity="0.55"/>
                              <stop offset="70%" stopColor="#c9a420" stopOpacity="0.28"/>
                              <stop offset="100%" stopColor="#c9a420" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0,160 Q100,60 200,110 Q300,158 410,80" stroke="url(#upl-swirl)" strokeWidth="2.5" fill="none"/>
                          <path d="M0,175 Q80,100 170,145 Q270,188 400,125" stroke="url(#upl-swirl)" strokeWidth="1.5" fill="none" opacity="0.45"/>
                        </svg>
                        <svg className="absolute bottom-0 right-5 opacity-[0.18]" viewBox="0 0 100 72" width="100" height="72">
                          <rect x="8" y="42" width="84" height="30" fill="white"/>
                          <ellipse cx="50" cy="42" rx="26" ry="18" fill="white"/>
                          <ellipse cx="50" cy="31" rx="14" ry="11" fill="white"/>
                          <rect x="47" y="18" width="6" height="12" rx="2" fill="white"/>
                          <circle cx="50" cy="17" r="3" fill="white"/>
                          <rect x="12" y="28" width="11" height="28" rx="2" fill="white"/>
                          <path d="M12,28 Q17.5,20 23,28 Z" fill="white"/>
                          <rect x="77" y="28" width="11" height="28" rx="2" fill="white"/>
                          <path d="M77,28 Q82.5,20 88,28 Z" fill="white"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: '#f0ece0' }}>
                        <svg className="absolute inset-0 w-full h-full opacity-[0.13]" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice">
                          {Array.from({length:8},(_,i)=>{const a=i*45*Math.PI/180,r=48;return <line key={i} x1="150" y1="110" x2={150+r*Math.cos(a)} y2={110+r*Math.sin(a)} stroke="#059669" strokeWidth="0.8"/>;}) }
                          <polygon points="150,65 160,89 186,89 165,104 172,128 150,113 128,128 135,104 114,89 140,89" fill="none" stroke="#059669" strokeWidth="0.8"/>
                          <circle cx="150" cy="110" r="52" fill="none" stroke="#059669" strokeWidth="0.5"/>
                          <circle cx="150" cy="110" r="36" fill="none" stroke="#059669" strokeWidth="0.4"/>
                          {[[40,40],[260,40],[40,180],[260,180]].map(([cx,cy],i)=>(
                            <g key={i} transform={`translate(${cx},${cy})`}>
                              {Array.from({length:8},(_,j)=>{const a=j*45*Math.PI/180,r=22;return <line key={j} x1="0" y1="0" x2={r*Math.cos(a)} y2={r*Math.sin(a)} stroke="#059669" strokeWidth="0.7"/>;}) }
                              <circle cx="0" cy="0" r="22" fill="none" stroke="#059669" strokeWidth="0.4"/>
                            </g>
                          ))}
                        </svg>
                      </div>
                    )}

                    {decoding ? (
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <Loader2 size={32} className="text-emerald-500 animate-spin" />
                        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-emerald-900/60'}`}>Reading audio…</p>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${
                          isDark ? 'bg-[#1a3d28] border border-emerald-700/40' : 'bg-white border border-emerald-100 shadow-sm'
                        }`}>
                          <UploadCloud size={28} className={isDark ? 'text-[#E9CF7A]' : 'text-emerald-600'} />
                        </div>
                        <div>
                          <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-emerald-900'}`}>
                            Drag &amp; drop your audio file here
                          </p>
                          <p className={`text-sm mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            or click to browse
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium ${
                          isDark ? 'bg-white/[0.08] border border-white/15 text-white/65' : 'bg-white border border-emerald-100 text-emerald-800 shadow-sm'
                        }`}>
                          <Music2 size={11} /> MP3, WAV, M4A, OGG · Max {MAX_FILE_MB}MB
                        </span>
                      </div>
                    )}
                    <input type="file" accept="audio/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ''; }} />
                  </label>

                  {/* How it works */}
                  <div>
                    <p className={`text-center text-sm font-semibold mb-4 tracking-wide ${isDark ? 'text-[#E9CF7A]' : 'text-emerald-800'}`}>
                      ✦ How it works ✦
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {HOW_IT_WORKS.map(({ Icon, label, desc, gold }) => (
                        <div key={label} className={`rounded-2xl p-3.5 text-center ${
                          isDark ? 'bg-white/[0.05] border border-white/[0.08]' : 'bg-white border border-gray-100 shadow-sm'
                        }`}>
                          <div className={`w-11 h-11 rounded-full mx-auto mb-2.5 flex items-center justify-center ${gold ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                            <Icon size={18} className="text-white" />
                          </div>
                          <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                          <p className={`text-[10px] mt-1 leading-snug ${isDark ? 'text-white/45' : 'text-gray-500'}`}>{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Trimmer (shown once decoded) ── */}
              {buffer && (
                <>
                  <div>
                    <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-white/80' : 'text-emerald-950'}`}>Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My local masjid Azan"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${
                        isDark
                          ? 'border border-white/15 bg-white/10 text-white placeholder:text-white/30 focus:ring-emerald-500/50'
                          : 'border border-emerald-200 bg-white text-emerald-950 placeholder:text-emerald-900/35 focus:ring-emerald-300'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? 'text-white/80' : 'text-emerald-950'}`}>
                        <Scissors size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} /> Trim
                      </label>
                      <button onClick={() => { revokeUrl(); resetState(); }} className={`text-xs underline ${isDark ? 'text-white/45 hover:text-white/80' : 'text-emerald-900/50 hover:text-emerald-900'}`}>
                        Choose another file
                      </button>
                    </div>

                    <div ref={containerRef} className={`relative h-28 rounded-xl overflow-hidden select-none touch-none ${
                      isDark ? 'border border-white/10 bg-white/[0.05]' : 'border border-emerald-100 bg-emerald-50/30'
                    }`}>
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      <div className={`absolute inset-y-0 left-0 ${isDark ? 'bg-black/45' : 'bg-white/60'}`} style={{ width: `${sPct}%` }} />
                      <div className={`absolute inset-y-0 right-0 ${isDark ? 'bg-black/45' : 'bg-white/60'}`} style={{ width: `${100 - ePct}%` }} />
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

                    <div className={`flex items-center justify-between mt-2 text-xs ${isDark ? 'text-white/50' : 'text-emerald-900/55'}`}>
                      <span>{formatClock(start)} – {formatClock(end)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        isDark ? 'bg-white/10 border border-white/15 text-white/70' : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
                      }`}>
                        Selected {formatClock(end - start)}
                      </span>
                    </div>

                    <button onClick={playSelection}
                      className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                        playing
                          ? isDark ? 'bg-rose-900/30 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      }`}>
                      {playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play selection</>}
                    </button>
                  </div>

                  <div>
                    <label className={`flex items-center gap-1.5 text-sm font-semibold mb-1.5 ${isDark ? 'text-white/80' : 'text-emerald-950'}`}>
                      <Music2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} /> Add a sound (intro / outro)
                      <span className={`font-normal ${isDark ? 'text-white/35' : 'text-emerald-900/45'}`}>— optional</span>
                    </label>

                    {!extraBuffer ? (
                      <button onClick={() => extraInputRef.current?.click()} disabled={extraDecoding}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition disabled:opacity-60 ${
                          isDark
                            ? 'border-white/15 bg-white/[0.06] text-emerald-300 hover:border-emerald-500 hover:bg-white/10'
                            : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}>
                        {extraDecoding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        {extraDecoding ? 'Reading…' : 'Add another sound'}
                      </button>
                    ) : (
                      <div className={`rounded-xl border p-3 space-y-3 ${isDark ? 'border-white/10 bg-white/[0.05]' : 'border-emerald-100 bg-emerald-50/40'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                            isDark ? 'bg-white/10 border border-white/15 text-emerald-400' : 'bg-emerald-100 border border-emerald-200 text-emerald-600'
                          }`}><Music2 size={15} /></span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-emerald-950'}`}>{extraName || 'Added sound'}</p>
                            <p className={`text-xs ${isDark ? 'text-white/45' : 'text-emerald-900/55'}`}>{formatClock(extraDur)}</p>
                          </div>
                          <button onClick={previewExtra} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}>
                            {extraPlaying ? <Square size={15} /> : <Play size={15} />}
                          </button>
                          <button onClick={removeExtra} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-rose-900/30 text-rose-400' : 'hover:bg-rose-50 text-rose-500'}`}>
                            <X size={15} />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs ${isDark ? 'text-white/45' : 'text-emerald-900/55'}`}>Position:</span>
                          {(['start', 'end'] as const).map((pos) => (
                            <button key={pos} onClick={() => setExtraPos(pos)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                extraPos === pos
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : isDark
                                    ? 'bg-white/[0.06] border-white/15 text-emerald-300 hover:border-emerald-500'
                                    : 'bg-white border-emerald-200 text-emerald-700 hover:border-emerald-400'
                              }`}>
                              {pos === 'start' ? 'At start (intro)' : 'At end (outro)'}
                            </button>
                          ))}
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-white/35' : 'text-emerald-900/45'}`}>
                          Plays {extraPos === 'start' ? 'before' : 'after'} the trimmed Azan and is baked into the saved file (total {formatClock((end - start) + extraDur)}).
                        </p>
                      </div>
                    )}

                    <input ref={extraInputRef} type="file" accept="audio/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickExtra(f); e.currentTarget.value = ''; }} />
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
              <button onClick={save} disabled={!buffer || saving}
                className={`inline-flex items-center gap-2 py-2.5 px-6 rounded-full text-sm font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[#C9A227] hover:bg-[#b8911e] text-[#0a1a0f] shadow-amber-900/30'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20'
                }`}>
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> {cfg.btn}</>}
              </button>
            </div>

            <audio ref={previewRef} onTimeUpdate={onPreviewTime} onEnded={() => setPlaying(false)} preload="auto" />
            <audio ref={extraPreviewRef} onEnded={() => setExtraPlaying(false)} preload="auto" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
