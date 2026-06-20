'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlarmClock, Search, X, Plus, Trash2, Pencil, Play, Square,
  Volume2, Volume1, VolumeX, Mic2, Languages, CalendarClock, CalendarDays,
  Clock, Repeat, Check, Power, Sparkles, BookOpen, Bell, Users, Headphones,
  Download, Compass, Leaf, Award, Heart, History, ChevronRight, ChevronDown,
} from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { useLocalStorage } from '@/lib/useLocalStorage';
import {
  RECITERS, TRANSLATIONS, hasTranslationAudio, langToTranslation,
  type ReciterId, type TranslationId,
} from '@/lib/quran';
import {
  createRecitationController, type RecitationController,
} from '@/lib/recitationPlayer';
import {
  formatTime, type RecitationSchedule, type RepeatMode,
} from '@/lib/recitationSchedule';
import { useTheme } from '@/lib/ThemeContext';

// Repeat modes for the modal's segmented picker, with their labels + icons.
const REPEAT_MODES: RepeatMode[] = ['once', 'daily', 'weekly', 'monthly'];
const REPEAT_LABEL: Record<RepeatMode, string> = {
  once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
};
const REPEAT_ICON: Record<RepeatMode, typeof Repeat> = {
  once: CalendarDays, daily: Repeat, weekly: CalendarClock, monthly: CalendarDays,
};

// Rotating ayat shown in the header (auto-advancing carousel).
const HERO_AYAT = [
  { ar: 'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ', en: 'Indeed, this Qur’an guides to that which is most just and right.', ref: 'Surah Al-Isra 17:9' },
  { ar: 'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ', en: 'And We have certainly made the Qur’an easy for remembrance, so is there any who will remember?', ref: 'Surah Al-Qamar 54:17' },
  { ar: 'وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ', en: 'And We send down of the Qur’an that which is healing and mercy for the believers.', ref: 'Surah Al-Isra 17:82' },
];

// Static feature chips beneath the hero.
const FEATURES = [
  { Icon: Bell,        title: 'Daily Reminder',    sub: 'Never miss a recitation' },
  { Icon: Users,       title: 'Multiple Reciters', sub: 'Voices you love' },
  { Icon: Headphones,  title: 'Background Play',    sub: 'Listen while you do more' },
  { Icon: Download,    title: 'Offline Listening', sub: 'Download & listen' },
  { Icon: Compass,     title: 'Qibla Direction',   sub: 'Stay connected' },
];

// Benefits of listening — static, with continuously-floating icons.
const BENEFITS = [
  { Icon: Leaf,    title: 'Brings Peace',     sub: 'to the heart' },
  { Icon: Award,   title: 'Rewards Multiply', sub: 'with every letter' },
  { Icon: Bell,    title: 'Strengthens Iman', sub: 'and connection' },
  { Icon: Compass, title: 'Guidance',         sub: 'for daily life' },
];

// ── date helpers (all local-time, matching how the runner reads a schedule) ──
function pad(n: number) { return String(n).padStart(2, '0'); }
function todayYMD() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function localDate(ymd: string) { const [y, m, d] = ymd.split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); }

function describeRepeat(repeat: RepeatMode, date: string): string {
  const d = localDate(date);
  switch (repeat) {
    case 'once':    return `Plays once on ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`;
    case 'daily':   return 'Plays every day at the set time.';
    case 'weekly':  return `Plays every ${d.toLocaleDateString(undefined, { weekday: 'long' })}.`;
    case 'monthly': return `Plays on day ${d.getDate()} of every month.`;
  }
}
function shortRecurrence(s: RecitationSchedule): string {
  const d = localDate(s.date);
  switch (s.repeat) {
    case 'once':    return `Once · ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    case 'daily':   return 'Every day';
    case 'weekly':  return `Every ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
    case 'monthly': return `Day ${d.getDate()} of each month`;
  }
}

/** Speaker icon reflecting the current volume level (muted / low / high). */
function VolIcon({ v, className = '' }: { v: number; className?: string }) {
  if (v === 0) return <VolumeX size={18} className={className} />;
  if (v < 0.5) return <Volume1 size={18} className={className} />;
  return <Volume2 size={18} className={className} />;
}

/** Animated equaliser bars — used on a schedule card while it is previewing. */
function EqualiserBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span key={i} className="w-[3px] rounded-full bg-emerald-500"
          animate={active ? { height: ['30%', '100%', '45%', '85%', '30%'] } : { height: '35%' }}
          transition={active ? { duration: 0.9 + i * 0.12, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          style={{ height: '35%' }} />
      ))}
    </div>
  );
}

/** Radial "Today's Goal" progress ring with an animated draw + soft pulsing glow. */
function RadialGoal({ value, target }: { value: number; target: number }) {
  const r = 40; const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <span className="absolute inset-1 rounded-full animate-pulse-soft" style={{ background: 'radial-gradient(circle, rgba(221,185,75,0.25) 0%, transparent 70%)' }} />
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <defs>
          <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E9CF7A" /><stop offset="100%" stopColor="#C9A227" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke="url(#goalGrad)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="font-display font-bold text-2xl text-white">{value}</span>
        <span className="text-[10px] text-white/55 mt-0.5">{target}</span>
      </div>
    </div>
  );
}

function Flower({ size = 18, color = '#f9a8d4', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill={color} opacity="0.9">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="12" cy="6" rx="3" ry="5.2" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2.6" fill="#F6D67A" />
    </svg>
  );
}

export default function RecitationSchedulerPage() {
  const { isDark } = useTheme();
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  const [schedules, setSchedules] = useLocalStorage<RecitationSchedule[]>('isa:recitationSchedules', []);

  // Honest local tracking for the goal / "last listen" widgets.
  const [listenLog, setListenLog] = useLocalStorage<{ ymd: string; seconds: number }>('isa:listenLog', { ymd: '', seconds: 0 });
  const [lastListen, setLastListen] = useLocalStorage<{ surah: number; at: number } | null>('isa:lastRecitation', null);

  // ── form state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSurahs, setSelectedSurahs] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [reciter, setReciter] = useState<ReciterId>('ar.abdulbasitmurattal');
  const [withTranslation, setWithTranslation] = useState(false);
  const [translation, setTranslation] = useState<TranslationId>('ur.jalandhry');
  const [time, setTime] = useState('06:00');
  const [date, setDate] = useState(todayYMD());
  const [repeat, setRepeat] = useState<RepeatMode>('daily');
  const [volume, setVolume] = useState(0.8);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Header ayah carousel (auto-advancing → continuous animation).
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_AYAT.length), 5500);
    return () => clearInterval(t);
  }, []);

  // Apply the profile's preferred translation language once on first mount.
  const langApplied = useRef(false);
  useEffect(() => {
    if (!langApplied.current) { setTranslation(langToTranslation(language)); langApplied.current = true; }
  }, [language]);

  // ── preview / test playback (separate audio element from the global runner) ──
  const previewRef = useRef<HTMLAudioElement>(null);
  const previewCtrlRef = useRef<RecitationController | null>(null);
  const [previewingId, setPreviewingId] = useState<string | 'test' | null>(null);

  useEffect(() => {
    if (previewRef.current && !previewCtrlRef.current) {
      previewCtrlRef.current = createRecitationController(previewRef.current);
    }
    return () => { previewCtrlRef.current?.stop(); };
  }, []);

  // Accumulate "minutes listened today" while a preview is playing on this page.
  useEffect(() => {
    if (!previewingId) return;
    const t = setInterval(() => {
      setListenLog((prev) => {
        const ymd = todayYMD();
        return ymd !== prev.ymd ? { ymd, seconds: 1 } : { ymd, seconds: prev.seconds + 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [previewingId, setListenLog]);

  const minutesListened = listenLog.ymd === todayYMD() ? Math.floor(listenLog.seconds / 60) : 0;
  const GOAL_TARGET = 30;

  // Surah search — matches English name, meaning, Arabic, or number.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishTranslation.toLowerCase().includes(q) ||
        s.arabic.includes(q) ||
        String(s.number) === q,
    );
  }, [query]);

  // What the Step-1 list shows: collapsed = first 4; expanded / searching = all.
  const visibleSurahs = useMemo(
    () => (query.trim() || viewAll ? filtered : filtered.slice(0, 4)),
    [filtered, query, viewAll],
  );

  const toggleSurah = (n: number) =>
    setSelectedSurahs((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  const removeSurah = (n: number) => setSelectedSurahs((prev) => prev.filter((x) => x !== n));

  const startPreview = (surahs: number[], id: 'test' | string) => {
    const ctrl = previewCtrlRef.current;
    if (!ctrl) return;
    ctrl.stop();
    setPreviewingId(id);
    if (surahs[0]) setLastListen({ surah: surahs[0], at: Date.now() });
    ctrl.play(
      { surahs, reciter, withTranslation, translation, volume },
      { onDone: () => setPreviewingId((p) => (p === id ? null : p)), onBlocked: () => setPreviewingId((p) => (p === id ? null : p)) },
    );
  };
  const stopPreview = () => { previewCtrlRef.current?.stop(); setPreviewingId(null); };

  const test = () => {
    if (previewingId === 'test') { stopPreview(); return; }
    startPreview(selectedSurahs.length ? [selectedSurahs[0]] : [1], 'test');
  };

  const onVolume = (v: number) => { setVolume(v); previewCtrlRef.current?.setVolume(v); };

  const resetForm = () => {
    setSelectedSurahs([]); setQuery(''); setViewAll(false); setEditingId(null); setError(null);
    setReciter('ar.abdulbasitmurattal'); setWithTranslation(false);
    setTranslation(langToTranslation(language));
    setTime('06:00'); setDate(todayYMD()); setRepeat('daily'); setVolume(0.8);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (s: RecitationSchedule) => {
    setEditingId(s.id);
    setSelectedSurahs(s.surahs);
    setReciter(s.reciter);
    setWithTranslation(s.withTranslation);
    setTranslation(s.translation);
    setTime(s.time);
    setDate(s.date);
    setRepeat(s.repeat);
    setVolume(s.volume);
    setError(null);
    setViewAll(false);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (previewCtrlRef.current?.isPlaying() && previewingId === 'test') stopPreview();
    setModalOpen(false);
  }, [previewingId]);

  const save = () => {
    if (!selectedSurahs.length) { setError('Choose at least one Surah.'); return; }
    if (!time) { setError('Pick a time.'); return; }
    if (!date) { setError('Pick a date.'); return; }
    const fields = { surahs: selectedSurahs, time, date, repeat, reciter, withTranslation, translation, volume };
    if (editingId) {
      setSchedules((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...fields } : s)));
    } else {
      setSchedules((prev) => [
        { id: crypto.randomUUID(), createdAt: Date.now(), enabled: true, ...fields },
        ...prev,
      ]);
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    stopPreview();
    setModalOpen(false);
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (previewingId === id) stopPreview();
  };

  const toggleEnabled = (id: string) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  // Lock scroll + Escape-to-close while the modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [modalOpen, closeModal]);

  const noTransAudio = withTranslation && translation !== 'none' && !hasTranslationAudio(translation);
  const activeCount = schedules.filter((s) => s.enabled).length;

  // Deterministic "Surah of the day" (Al-Kahf on Fridays, else day-of-year pick).
  const surahOfDay = useMemo(() => {
    const now = new Date();
    if (now.getDay() === 5) return SURAHS.find((s) => s.number === 18)!; // Friday → Al-Kahf
    const start = new Date(now.getFullYear(), 0, 0);
    const doy = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
    return SURAHS[doy % SURAHS.length];
  }, []);
  const lastListenSurah = lastListen ? SURAHS.find((s) => s.number === lastListen.surah) : null;

  return (
    <div className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}>

      {/* ── header banner: pastel blobs left + mosque photo right ── */}
      <header className="relative overflow-hidden min-h-[300px]">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: isDark ? 'linear-gradient(120deg,#0c2418 0%,#08160f 72%)' : 'linear-gradient(120deg,#fdf8ec 0%,#f4ead7 72%)' }} />

          {/* right ~62%: image */}
          <div className="absolute inset-y-0 right-0 w-[62%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masjid_quran_bg.png" alt="" className="w-full h-full object-cover object-center" style={isDark ? { filter: 'brightness(0.82)' } : undefined} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${isDark ? '#08160f' : '#f4ead7'} 0%, transparent 26%)` }} />
          </div>

          {/* left ~46%: animated pastel blobs + floating flowers */}
          <div className="absolute inset-y-0 left-0 w-[46%] overflow-hidden">
            <motion.div className="absolute rounded-full blur-3xl" style={{ left: '2%', top: '6%', width: 190, height: 190, background: 'radial-gradient(circle, rgba(253,224,71,0.45), transparent 70%)' }} animate={{ x: [0, 22, 0], y: [0, 16, 0] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute rounded-full blur-3xl" style={{ left: '30%', top: '42%', width: 210, height: 210, background: 'radial-gradient(circle, rgba(134,239,172,0.42), transparent 70%)' }} animate={{ x: [0, -18, 0], y: [0, 20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute rounded-full blur-3xl" style={{ left: '6%', top: '54%', width: 170, height: 170, background: 'radial-gradient(circle, rgba(147,197,253,0.42), transparent 70%)' }} animate={{ x: [0, 16, 0], y: [0, -14, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute rounded-full blur-3xl" style={{ left: '40%', top: '2%', width: 160, height: 160, background: 'radial-gradient(circle, rgba(251,207,232,0.48), transparent 70%)' }} animate={{ x: [0, -14, 0], y: [0, 18, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute" style={{ left: '13%', top: '24%' }} animate={{ y: [0, -8, 0], rotate: [0, 12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}><Flower size={22} color="#f9a8d4" /></motion.div>
            <motion.div className="absolute" style={{ left: '35%', top: '64%' }} animate={{ y: [0, -10, 0], rotate: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}><Flower size={18} color="#fcd34d" /></motion.div>
            <motion.div className="absolute" style={{ left: '5%', top: '74%' }} animate={{ y: [0, -7, 0], rotate: [0, 14, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}><Flower size={16} color="#86efac" /></motion.div>
            <motion.div className="absolute" style={{ left: '44%', top: '36%' }} animate={{ y: [0, -9, 0], rotate: [0, -12, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}><Flower size={20} color="#93c5fd" /></motion.div>
          </div>

          {/* bottom fade into page */}
          <div className="absolute inset-x-0 bottom-0 h-10" style={{ background: isDark ? 'linear-gradient(to bottom, transparent, #08160F)' : 'linear-gradient(to bottom, transparent, #FAF7EE)' }} />

          {/* crescent moon */}
          <motion.div aria-hidden className="absolute hidden lg:block" style={{ right: '20%', top: 26 }}
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="#F1D588" style={{ filter: 'drop-shadow(0 0 12px rgba(233,207,122,0.7))' }}>
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
            </svg>
          </motion.div>
        </div>

        <div className="relative px-6 sm:px-10 pt-8 pb-3 flex flex-wrap items-start justify-between gap-6">
          {/* left: badge + title + description + CTA */}
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur border ${isDark ? 'border-gold-300/50 bg-black/30 text-gold-200' : 'border-gold-500/40 bg-white/70 text-emerald-800'}`}>
              <Bell size={12} /> Recitation Alarm
            </span>
            <h1 className={`mt-4 font-display font-bold text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl leading-[1.05] whitespace-nowrap ${isDark ? 'text-white' : 'text-emerald-950'}`}
              style={{ textShadow: isDark ? '0 2px 16px rgba(0,0,0,0.6)' : '0 1px 8px rgba(255,255,255,0.7)' }}>
              Quran Recitation
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl px-4 py-2.5"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.2)' }}>
              <p className="text-base sm:text-lg leading-relaxed text-white/90">
                Schedule your daily recitation. Let the words of Allah bring peace to your heart.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <motion.button onClick={openCreate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-gold-gradient text-midnight-900 font-bold px-5 py-2 shadow-glow-gold text-sm">
                  <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 skew-x-12 animate-sheen" />
                  <AlarmClock size={15} /> Schedule Recitation
                </motion.button>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-medium text-white/85">
                  <CalendarClock size={13} className="text-gold-300" /> {schedules.length} Scheduled
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-medium text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-soft" /> {activeCount > 0 ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* right: rotating ayah panel */}
          <div className="hidden md:block max-w-[17rem]">
            <div className="rounded-2xl px-4 py-4 text-right"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.22)' }}>
              <AnimatePresence mode="wait">
                <motion.div key={heroIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                  <p className={`font-arabic text-xl lg:text-2xl leading-[1.9] ${isDark ? 'text-[#E9CF7A]' : 'text-black'}`} dir="rtl">{HERO_AYAT[heroIdx].ar}</p>
                  <p className="mt-1.5 text-sm leading-relaxed font-medium text-white/90">&ldquo;{HERO_AYAT[heroIdx].en}&rdquo;</p>
                  <p className="mt-1 text-xs font-bold text-[#F1D588]">({HERO_AYAT[heroIdx].ref})</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                {HERO_AYAT.map((_, i) => (
                  <button key={i} onClick={() => setHeroIdx(i)} aria-label={`Ayah ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIdx ? 'w-6 bg-gold-300' : 'w-1.5 bg-white/30'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-10 pb-10 space-y-6">

      {/* ════════ FEATURE CHIPS ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {FEATURES.map(({ Icon, title, sub }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-2xl bg-white border border-emerald-900/8 shadow-card-soft px-3.5 py-3"
          >
            <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 animate-float"
              style={{ animationDelay: `${i * 0.5}s` }}>
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 leading-tight">{title}</p>
              <p className="text-[11px] text-emerald-900/50 leading-tight mt-0.5 truncate">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ════════ YOUR SCHEDULES ════════ */}
      <div className="rounded-3xl bg-white/70 border border-emerald-900/8 shadow-card-soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-emerald-950">Your Schedules</h2>
          <motion.button onClick={openCreate} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white text-emerald-800 font-semibold text-sm px-4 py-2 shadow-sm hover:bg-emerald-50 transition">
            <Plus size={15} /> New Schedule
          </motion.button>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 animate-float">
              <AlarmClock size={28} className="text-emerald-400" />
            </div>
            <h3 className="font-display text-lg font-bold text-emerald-950">No recitation scheduled yet</h3>
            <p className="text-emerald-900/55 mt-1 max-w-sm mx-auto text-sm">Create your first schedule and Noor will recite the Quran for you at the time you choose.</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white font-semibold px-5 py-2.5 shadow-glow-emerald hover:bg-emerald-700 transition">
              <Plus size={16} /> Schedule Recitation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {schedules.map((s) => {
                const recName = RECITERS.find((r) => r.id === s.reciter)?.name ?? s.reciter;
                const transName = s.withTranslation ? (TRANSLATIONS.find((t) => t.id === s.translation)?.name ?? 'Translation') : 'Arabic only';
                const RIcon = REPEAT_ICON[s.repeat];
                const firstSurah = SURAHS.find((x) => x.number === s.surahs[0]);
                const isPreviewing = previewingId === s.id;
                return (
                  <motion.div
                    key={s.id} layout
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className={`group relative overflow-hidden rounded-2xl bg-parchment/70 border border-emerald-900/8 shadow-sm transition ${s.enabled ? '' : 'opacity-60'}`}
                  >
                    {/* animated accent rail */}
                    <div className="absolute left-0 inset-y-0 w-1.5 overflow-hidden">
                      <div className={`absolute inset-0 ${s.enabled ? 'bg-gold-gradient' : 'bg-emerald-900/15'}`} />
                      {s.enabled && <div className="absolute inset-x-0 -top-1/2 h-1/2 bg-white/50 animate-sheen" style={{ animationDuration: '3s' }} />}
                    </div>

                    <div className="pl-6 pr-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* time block */}
                      <div className="flex items-center gap-4 sm:w-40 shrink-0">
                        <motion.div
                          animate={s.enabled ? { scale: [1, 1.06, 1] } : {}}
                          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.enabled ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'bg-emerald-900/10 text-emerald-900/40'}`}
                        >
                          <AlarmClock size={22} />
                        </motion.div>
                        <div className="leading-tight">
                          <p className="font-display text-2xl font-bold text-emerald-950">{formatTime(s.time)}</p>
                          <p className="text-xs text-emerald-900/50 flex items-center gap-1"><RIcon size={11} /> {shortRecurrence(s)}</p>
                        </div>
                      </div>

                      {/* details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-gold-300/60 bg-gold-50 text-gold-700 text-xs font-semibold px-2.5 py-0.5">
                            {firstSurah ? `${firstSurah.number} ${firstSurah.englishName}` : `Surah ${s.surahs[0]}`}
                          </span>
                          {s.surahs.length > 1 && <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5">+{s.surahs.length - 1} more</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-900/55">
                          <span className="inline-flex items-center gap-1.5"><Mic2 size={12} className="text-emerald-600" /> {recName}</span>
                          <span className="inline-flex items-center gap-1.5"><Languages size={12} className="text-emerald-600" /> {transName}</span>
                          <span className="inline-flex items-center gap-1.5"><VolIcon v={s.volume} className="text-emerald-600" /> {Math.round(s.volume * 100)}%</span>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                        {isPreviewing && <div className="mr-1"><EqualiserBars active /></div>}
                        <button onClick={() => (isPreviewing ? stopPreview() : startPreview(s.surahs, s.id))} title="Play now"
                          className={`p-2.5 rounded-xl transition ${isPreviewing ? 'bg-rose-50 text-rose-600' : 'hover:bg-emerald-50 text-emerald-700'}`}>
                          {isPreviewing ? <Square size={17} /> : <Play size={17} />}
                        </button>
                        <button onClick={() => toggleEnabled(s.id)} title={s.enabled ? 'Pause' : 'Enable'}
                          className={`p-2.5 rounded-xl transition ${s.enabled ? 'text-emerald-700 hover:bg-emerald-50' : 'text-emerald-900/30 hover:bg-emerald-50'}`}>
                          <Power size={17} />
                        </button>
                        <button onClick={() => openEdit(s)} title="Edit" className="p-2.5 rounded-xl hover:bg-emerald-50 text-emerald-900/60"><Pencil size={16} /></button>
                        <button
                          onClick={() => (confirmDeleteId === s.id ? removeSchedule(s.id) : setConfirmDeleteId(s.id))}
                          onBlur={() => setConfirmDeleteId((c) => (c === s.id ? null : c))}
                          title="Delete"
                          className={`p-2.5 rounded-xl transition ${confirmDeleteId === s.id ? 'bg-rose-600 text-white' : 'hover:bg-rose-50 text-rose-500'}`}>
                          {confirmDeleteId === s.id ? <span className="text-xs font-semibold px-0.5">Sure?</span> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ════════ BENEFITS + TODAY'S GOAL ════════ */}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4">
        {/* Benefits */}
        <div className="rounded-3xl bg-emerald-50/60 border border-emerald-100 p-6">
          <h2 className="flex items-center gap-2 font-display font-bold text-lg text-emerald-950 mb-5">
            <BookOpen size={18} className="text-gold-600" /> Benefits of Listening to Quran
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BENEFITS.map(({ Icon, title, sub }, i) => (
              <div key={title} className="flex flex-col items-center text-center gap-2">
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                  className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm border border-emerald-100"
                >
                  <Icon size={22} />
                </motion.span>
                <div>
                  <p className="text-sm font-bold text-emerald-950 leading-tight">{title}</p>
                  <p className="text-[11px] text-emerald-900/50 leading-tight mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Goal */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(150deg,#0d3d2c 0%,#072018 100%)' }}>
          <div aria-hidden className="absolute inset-0 pattern-bg opacity-[0.08]" />
          <p className="relative font-semibold text-sm text-emerald-100/80 mb-3">Today&apos;s Goal</p>
          <div className="relative flex items-center gap-4">
            <RadialGoal value={minutesListened} target={GOAL_TARGET} />
            <div>
              <p className="font-display font-bold text-lg leading-tight">Minutes</p>
              <p className="text-emerald-100/70 text-sm">Listened</p>
            </div>
          </div>
          <p className="relative text-xs text-emerald-100/60 mt-4 leading-relaxed">
            {minutesListened >= GOAL_TARGET ? 'Goal reached — masha’Allah! ' : 'Keep it up! '}Consistency brings barakah.
          </p>
        </div>
      </div>

      {/* ════════ INSPIRING HADEES ════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-parchment/80 border border-emerald-900/8 shadow-card-soft p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1">
          <h2 className="flex items-center gap-2 font-display font-bold text-lg text-emerald-950 mb-4">
            <Sparkles size={18} className="text-gold-600" /> Inspiring Hadees
          </h2>
          <p className="font-arabic text-2xl text-emerald-900 leading-[2] mb-3" dir="rtl">
            مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا
          </p>
          <p className="text-emerald-900/70 text-sm leading-relaxed">
            &ldquo;Whoever reads a letter from the Book of Allah will get a reward for it, and the reward is multiplied tenfold.&rdquo;
          </p>
          <p className="text-emerald-900/45 text-xs mt-1.5">(Tirmidhi 2910)</p>
        </div>
        <div className="shrink-0 relative w-44 h-40 grid place-items-center">
          <span aria-hidden className="absolute inset-0 m-auto w-32 h-32 animate-spin-slow opacity-60" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(16,185,129,0.08), transparent)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/recitation/rehal.svg" alt="Quran on a rehal stand" className="relative w-40 animate-float" />
        </div>
      </div>

      {/* ════════ QUICK ACTIONS ════════ */}
      <div className="rounded-3xl bg-white/70 border border-emerald-900/8 shadow-card-soft p-5 sm:p-6">
        <h2 className="font-display font-bold text-lg text-emerald-950 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { Icon: BookOpen, label: 'Surah of the Day', value: surahOfDay?.englishName ?? '—', href: '/dashboard/quran' },
            { Icon: History,  label: 'Last Listen', value: lastListenSurah ? `${lastListenSurah.englishName}` : 'Nothing yet', href: undefined as string | undefined },
            { Icon: Mic2,     label: 'Reciters', value: `${RECITERS.length} voices`, href: undefined },
            { Icon: AlarmClock, label: 'Schedules', value: `${activeCount} active`, href: undefined },
          ].map(({ Icon, label, value, href }) => {
            const inner = (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-900/8 bg-white px-4 py-3.5 hover:shadow-lg hover:shadow-emerald-900/10 transition h-full">
                <span className="inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-emerald-900/50 leading-none">{label}</p>
                  <p className="text-sm font-bold text-emerald-950 mt-1 leading-none truncate">{value}</p>
                </div>
              </div>
            );
            return href
              ? <Link key={label} href={href} className="block">{inner}</Link>
              : <div key={label}>{inner}</div>;
          })}
        </div>
      </div>

      <p className="text-xs text-emerald-900/45 flex items-center gap-1.5">
        <Clock size={12} /> Recitation plays in your browser, so a schedule only rings while Noor is open in a tab (just like auto-Azan).
      </p>

      </div>

      {/* ════════ SCHEDULE PANEL (right-side modal) ════════ */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal} className="absolute inset-0 bg-midnight-900/55 backdrop-blur-sm" />

            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="relative w-full sm:max-w-xl h-full flex flex-col bg-parchment shadow-2xl"
            >
              {/* header */}
              <div className="shrink-0 flex items-start justify-between gap-3 px-6 sm:px-8 pt-6 pb-4 border-b border-emerald-900/8">
                <div>
                  <h2 className="font-display font-bold text-2xl text-emerald-950">Schedule Recitation</h2>
                  <p className="text-emerald-900/55 text-sm mt-0.5">Set your time, reciter, and preferences</p>
                </div>
                <button onClick={closeModal} aria-label="Close"
                  className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 text-emerald-900/60 transition">
                  <X size={18} />
                </button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-7">

                {/* selected chips */}
                {selectedSurahs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSurahs.map((n) => {
                      const s = SURAHS.find((x) => x.number === n);
                      return (
                        <motion.span layout key={n} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1">
                          {n}. {s?.englishName ?? `Surah ${n}`}
                          <button onClick={() => removeSurah(n)} className="hover:bg-white/25 rounded-full p-0.5"><X size={12} /></button>
                        </motion.span>
                      );
                    })}
                  </div>
                )}

                {/* STEP 1: Select Surah */}
                <StepSection n={1} title="Select Surah">
                  <label className="relative block mb-3">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/40" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Surah by name or number..."
                      className="w-full pl-10 pr-3 py-3 rounded-2xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </label>

                  <div className={`rounded-2xl border border-emerald-100 bg-white divide-y divide-emerald-50 overflow-hidden ${query.trim() || viewAll ? 'max-h-64 overflow-y-auto' : ''}`}>
                    {visibleSurahs.map((s) => {
                      const sel = selectedSurahs.includes(s.number);
                      return (
                        <button key={s.number} onClick={() => toggleSurah(s.number)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition hover:bg-emerald-50/70 ${sel ? 'bg-emerald-50/80' : ''}`}>
                          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${sel ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{s.number}</span>
                          <span className="flex-1 min-w-0">
                            <span className="font-semibold text-emerald-950">{s.englishName}</span>
                            <span className="text-emerald-900/50"> {s.englishTranslation} • {s.ayahs} ayahs</span>
                          </span>
                          {sel && <Check size={15} className="text-emerald-600 shrink-0" />}
                          <span className="font-arabic text-lg text-emerald-800 shrink-0">{s.arabic}</span>
                        </button>
                      );
                    })}
                    {visibleSurahs.length === 0 && <p className="px-3 py-6 text-center text-sm text-emerald-900/50">No Surah matches &ldquo;{query}&rdquo;.</p>}
                  </div>

                  {!query.trim() && filtered.length > 4 && (
                    <button onClick={() => setViewAll((v) => !v)}
                      className="mt-3 mx-auto flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition">
                      {viewAll ? 'Show less' : 'View all Surahs'} {viewAll ? <ChevronDown size={15} className="rotate-180" /> : <ChevronRight size={15} />}
                    </button>
                  )}
                </StepSection>

                {/* STEP 2: Reciter & Translation */}
                <StepSection n={2} title="Reciter & Translation">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-emerald-900/55 mb-1.5">Reciter</p>
                      <div className="relative">
                        <select value={reciter} onChange={(e) => setReciter(e.target.value as ReciterId)}
                          className="w-full appearance-none px-3.5 py-3 pr-9 rounded-2xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                          {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-700/50 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-900/55 mb-1.5">Translation</p>
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2.5">
                        <button type="button" onClick={() => setWithTranslation((v) => !v)} role="switch" aria-checked={withTranslation}
                          className={`relative w-10 h-5.5 shrink-0 rounded-full transition-colors ${withTranslation ? 'bg-emerald-500' : 'bg-emerald-900/15'}`} style={{ height: '22px' }}>
                          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${withTranslation ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                        <select value={translation} disabled={!withTranslation} onChange={(e) => setTranslation(e.target.value as TranslationId)}
                          className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                          {TRANSLATIONS.filter((t) => t.id !== 'none').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  {noTransAudio && <p className="text-xs text-amber-700 mt-2">Spoken audio isn&apos;t available for this translation yet — only the Arabic will be recited.</p>}
                </StepSection>

                {/* STEP 3: Time & Date */}
                <StepSection n={3} title="Time & Date">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-emerald-900/55 mb-1.5">Time</p>
                      <div className="relative">
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-2xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-900/55 mb-1.5">{repeat === 'once' ? 'Date' : 'Start Date'}</p>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-2xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    </div>
                  </div>
                </StepSection>

                {/* STEP 4: Repeat */}
                <StepSection n={4} title="Repeat">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REPEAT_MODES.map((mode) => {
                      const Icon = REPEAT_ICON[mode];
                      const active = repeat === mode;
                      return (
                        <motion.button key={mode} onClick={() => setRepeat(mode)} whileTap={{ scale: 0.96 }}
                          animate={active ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                          transition={active ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : {}}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-semibold border transition-colors
                            ${active ? 'bg-emerald-600 border-emerald-600 text-white shadow-glow-emerald' : 'bg-white border-emerald-200 text-emerald-900/70 hover:border-emerald-400'}`}>
                          <Icon size={14} /> {REPEAT_LABEL[mode]}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-emerald-900/55 mt-2">{describeRepeat(repeat, date)}</p>
                </StepSection>

                {/* STEP 5: Volume */}
                <StepSection n={5} title="Volume">
                  <div className="flex items-center gap-3">
                    <VolIcon v={volume} className="text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-900 w-10 shrink-0">{Math.round(volume * 100)}%</span>
                    <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => onVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-600" />
                    <motion.button onClick={test} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 border
                        ${previewingId === 'test' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}`}>
                      {previewingId === 'test' ? <><Square size={14} /> Stop</> : <><Play size={14} /> Test</>}
                    </motion.button>
                  </div>
                  <p className="text-xs text-emerald-900/55 mt-2">Drag the slider to test volume.</p>
                </StepSection>

                {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

                {/* ayah quote + lantern */}
                <div className="relative overflow-hidden rounded-2xl bg-emerald-50/70 border border-emerald-100 px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <p className="font-arabic text-xl text-emerald-900 leading-loose" dir="rtl">فَإِنَّ مَعَ الْعُسْرِ يُسْرًا</p>
                    <p className="text-xs text-emerald-900/65 mt-1">&ldquo;Indeed, with hardship [will be] ease.&rdquo;</p>
                    <p className="text-[11px] text-emerald-900/40 mt-0.5">(Surah Ash-Sharh 94:6)</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/recitation/lantern.svg" alt="" className="w-12 shrink-0 animate-float" />
                </div>
              </div>

              {/* footer */}
              <div className="shrink-0 border-t border-emerald-900/8 bg-white px-6 sm:px-8 py-4 flex items-center justify-end gap-3">
                <button onClick={closeModal} className="rounded-full border border-emerald-200 text-emerald-800 font-semibold text-sm px-5 py-2.5 hover:bg-emerald-50 transition">Cancel</button>
                <motion.button onClick={save} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden inline-flex items-center gap-2 rounded-full bg-gold-gradient text-midnight-900 font-bold text-sm px-6 py-2.5 shadow-glow-gold">
                  <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 skew-x-12 animate-sheen" />
                  {editingId ? <><Check size={16} /> Save Changes</> : <><AlarmClock size={16} /> Schedule Recitation</>}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={previewRef} preload="auto" />
    </div>
  );
}

/** A numbered step block in the schedule panel. */
function StepSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <motion.span
          animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 6px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          className="w-6 h-6 shrink-0 grid place-items-center rounded-full bg-emerald-600 text-white text-xs font-bold"
        >
          {n}
        </motion.span>
        <h3 className="font-bold text-emerald-950">{title}</h3>
      </div>
      <div className="pl-8.5" style={{ paddingLeft: '2.125rem' }}>{children}</div>
    </section>
  );
}
