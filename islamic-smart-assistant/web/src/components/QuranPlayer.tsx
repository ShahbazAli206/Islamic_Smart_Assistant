'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Languages, Mic2,
  ChevronDown, Volume2, FileText, Check,
} from 'lucide-react';
import {
  RECITERS, TRANSLATIONS, fetchSurahMulti, ayahAudioUrl, translationAudioUrl,
  hasTranslationAudio,
  type ReciterId, type TranslationId,
} from '@/lib/quran';
import { SURAHS } from '@/lib/surahs';

type Stage = 'arabic' | 'translation';

type Props = {
  surahNumber: number;
  reciter: ReciterId;
  translation: TranslationId;
  translationMode: boolean;
  onReciterChange?: (r: ReciterId) => void;
  onTranslationChange?: (t: TranslationId) => void;
  onTranslationModeChange?: (v: boolean) => void;
  isDark?: boolean;
};

// ── Translation groups (all entries have spoken audio) ────────────────────────
const LANG_GROUPS: { label: string | null; ids: string[] }[] = [
  { label: null,      ids: ['none'] },
  { label: 'English', ids: ['en.sahih', 'en.asad'] },
  { label: 'Urdu',    ids: ['ur.jalandhry', 'ur.junagarhi'] },
  { label: 'Turkish', ids: ['tr.vakfi', 'tr.diyanet', 'tr.yazir'] },
  { label: 'Chinese', ids: ['zh.majian'] },
  { label: 'French',  ids: ['fr.hamidullah'] },
  { label: 'Bengali', ids: ['bn.bengali', 'bn.hoque'] },
  { label: 'Persian', ids: ['fa.fooladvand'] },
  { label: 'Russian', ids: ['ru.kuliev'] },
  { label: 'Kazakh',  ids: ['kk.khalifahaltai'] },
];

// ── Click-outside hook ────────────────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

const dropdownVariants = {
  hidden:  { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1 },
  exit:    { opacity: 0, y: -8, scale: 0.96 },
};
const dropdownTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as number[] };

// ── Reciter dropdown ──────────────────────────────────────────────────────────
function ReciterDropdown({ value, onChange, isDark }: { value: ReciterId; onChange: (v: ReciterId) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const selected = RECITERS.find(r => r.id === value);
  const trig = isDark
    ? 'bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.14] hover:border-white/25'
    : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50';

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(p => !p)}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 min-w-[240px] ${trig}`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-gradient text-midnight-900 shrink-0"><Mic2 size={13} /></span>
        <span className="flex-1 text-left truncate">{selected?.name}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
          <ChevronDown size={14} className={isDark ? 'text-white/60' : 'text-emerald-700/50'} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={dropdownTransition}
            className="absolute top-full mt-2 left-0 z-50 bg-white border border-emerald-100 rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden min-w-[260px]"
          >
            <div className="py-2">
              {RECITERS.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.15 }}
                  onClick={() => { onChange(r.id); setOpen(false); }}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors
                    ${value === r.id ? 'text-emerald-800 font-semibold bg-emerald-50/70' : 'text-ink'}`}
                >
                  <span>{r.name}</span>
                  {value === r.id && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                      <Check size={13} className="text-emerald-600" />
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Translation dropdown ──────────────────────────────────────────────────────
function TranslationDropdown({ value, onChange, isDark }: { value: TranslationId; onChange: (v: TranslationId) => void; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const transMap = Object.fromEntries(TRANSLATIONS.map(t => [t.id, t]));
  const selected = transMap[value];
  const trig = isDark
    ? 'bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.14] hover:border-white/25'
    : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50';

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(p => !p)}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 border rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 min-w-[270px] ${trig}`}
      >
        <Languages size={15} className={`shrink-0 ${isDark ? 'text-gold-300' : 'text-gold-600'}`} />
        <span className="flex-1 text-left truncate">{selected?.name ?? 'No translation'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
          <ChevronDown size={14} className={isDark ? 'text-white/60' : 'text-emerald-700/50'} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={dropdownTransition}
            className="absolute top-full mt-2 left-0 z-50 bg-white border border-emerald-100 rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden min-w-[340px]"
          >
            <div className="max-h-80 overflow-y-auto py-2">
              {LANG_GROUPS.map((group, gi) => (
                <div key={group.label ?? 'none'}>
                  {group.label && (
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 select-none">
                      {group.label}
                    </div>
                  )}
                  {group.ids.map((id, ii) => {
                    const t = transMap[id];
                    if (!t) return null;
                    const hasAudio = hasTranslationAudio(id as TranslationId);
                    const isSelected = value === id;
                    return (
                      <motion.button
                        key={id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (gi * 3 + ii) * 0.02, duration: 0.14 }}
                        onClick={() => { onChange(id as TranslationId); setOpen(false); }}
                        whileHover={{ x: 4 }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors
                          ${isSelected ? 'text-emerald-800 font-semibold bg-emerald-50/70' : 'text-ink'}`}
                      >
                        <span>{t.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {id !== 'none' && (
                            hasAudio
                              ? <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                  <Volume2 size={8} strokeWidth={2.5} /> audio
                                </span>
                              : <span className="flex items-center gap-0.5 text-[9px] font-medium text-ink/35 bg-stone-50 border border-stone-200 rounded-full px-1.5 py-0.5">
                                  <FileText size={8} strokeWidth={2} /> text
                                </span>
                          )}
                          {isSelected && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                              <Check size={13} className="text-emerald-600" />
                            </motion.span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Animated toggle switch ────────────────────────────────────────────────────
function ToggleSwitch({
  checked, onChange, label, title, isDark,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string; isDark: boolean }) {
  const trig = isDark
    ? 'bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.14] hover:border-white/25'
    : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50';
  return (
    <motion.button
      type="button"
      title={title}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.96 }}
      className={`flex items-center gap-2.5 border rounded-xl px-3.5 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer select-none ${trig}`}
    >
      {/* track */}
      <motion.div
        animate={{ backgroundColor: checked ? '#10B981' : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(6,95,70,0.2)' }}
        transition={{ duration: 0.25 }}
        className="relative rounded-full shrink-0"
        style={{ width: 36, height: 20 }}
      >
        <motion.div
          animate={{ x: checked ? 17 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute top-[2px] w-4 h-4 bg-white rounded-full shadow"
        />
      </motion.div>
      <span>{label}</span>
    </motion.button>
  );
}

// ── Playback button ───────────────────────────────────────────────────────────
function PlaybackBtn({ onClick, children, title, className = '' }: {
  onClick: () => void; children: React.ReactNode; title?: string; className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`p-2.5 rounded-full transition-colors ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function QuranPlayer({
  surahNumber, reciter, translation, translationMode,
  onReciterChange, onTranslationChange, onTranslationModeChange,
  isDark = false,
}: Props) {
  const surahMeta = SURAHS.find((s) => s.number === surahNumber)!;
  // Also fetch English (Saheeh Intl.) as a secondary line whenever the chosen
  // translation isn't already English — the design shows Urdu + English together.
  const showEnglishToo = translation !== 'none' && !translation.startsWith('en.');
  const editions = useMemo(
    () => [
      'quran-uthmani',
      ...(translation === 'none' ? [] : [translation]),
      ...(showEnglishToo ? ['en.sahih'] : []),
    ],
    [translation, showEnglishToo],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['surah', surahNumber, editions.join('|')],
    queryFn: () => fetchSurahMulti(surahNumber, editions),
    staleTime: 60 * 60 * 1000,
  });

  const arabic  = data?.[0];
  const trans   = translation === 'none' ? undefined : data?.[1];
  const english = showEnglishToo ? data?.[2] : undefined;

  const [ayahIdx, setAyahIdx] = useState(0);
  const [stage, setStage] = useState<Stage>('arabic');
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setAyahIdx(0); setStage('arabic'); setPlaying(false); setError(null);
  }, [surahNumber, reciter]);

  useEffect(() => { setStage('arabic'); }, [translation]);

  const currentAyah = arabic?.ayahs[ayahIdx];
  const currentTrans = trans?.ayahs[ayahIdx];
  const currentEnglish = english?.ayahs[ayahIdx];

  const stageUrl = (() => {
    if (!currentAyah) return null;
    if (stage === 'arabic') return currentAyah.audio ?? ayahAudioUrl(currentAyah.number, reciter);
    return translationAudioUrl(translation, currentAyah.number);
  })();

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stageUrl) return;
    el.src = stageUrl;
    el.load();
    setError(null);
  }, [stageUrl]);

  useEffect(() => {
    if (!arabic || !currentAyah) return;
    const pre = preloadRef.current;
    if (!pre) return;
    const wantsTranslation =
      translationMode && stage === 'arabic' && translation !== 'none' &&
      translationAudioUrl(translation, currentAyah.number);
    let nextUrl: string | null = null;
    if (wantsTranslation) {
      nextUrl = translationAudioUrl(translation, currentAyah.number);
    } else if (ayahIdx < arabic.ayahs.length - 1) {
      const next = arabic.ayahs[ayahIdx + 1];
      nextUrl = next.audio ?? ayahAudioUrl(next.number, reciter);
    }
    if (nextUrl && pre.src !== nextUrl) { pre.src = nextUrl; pre.load(); }
  }, [arabic, currentAyah, ayahIdx, stage, translationMode, translation, reciter]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.play().catch((e) => {
        // AbortError fires whenever el.load() interrupts a pending play() call —
        // this happens on every ayah advance (stageUrl effect calls el.load() first,
        // then this effect calls el.play() for the new src). It is not a real failure;
        // the next effect run will successfully play the new audio.
        if (e?.name === 'AbortError') return;
        setPlaying(false);
        setError(`Couldn't play audio: ${e?.message ?? 'browser blocked playback'}`);
      });
    } else {
      el.pause();
    }
  }, [playing, stageUrl]);

  // When a translation audio file fails to load (e.g. TTS not yet uploaded),
  // fall back silently to text-only for this ayah and advance to the next.
  const onTranslationAudioError = () => {
    if (stage === 'translation') {
      const last = !arabic || ayahIdx >= arabic.ayahs.length - 1;
      if (last) {
        setStage('arabic');
        if (repeat) setAyahIdx(0); else setPlaying(false);
      } else {
        // Batch stage + idx in one setTimeout so stageUrl jumps directly to the
        // next Arabic ayah without an intermediate reload of the current one.
        setTimeout(() => {
          setStage('arabic');
          setAyahIdx((i) => i + 1);
        }, 400);
      }
    } else {
      setPlaying(false);
      setError('Audio failed to load from the CDN.');
    }
  };

  const onEnded = () => {
    if (!arabic || !currentAyah) return;

    // Arabic ended with translation mode on → play the translation audio next.
    if (
      translationMode && stage === 'arabic' && translation !== 'none' &&
      translationAudioUrl(translation, currentAyah.number)
    ) {
      setStage('translation'); return;
    }

    // Translation (or Arabic without translation) ended → advance to next ayah.
    const last = ayahIdx >= arabic.ayahs.length - 1;
    if (last) {
      setStage('arabic');
      if (repeat) setAyahIdx(0);
      else setPlaying(false);
      return;
    }

    if (translationMode) {
      // Keep stage='translation' during the 400ms gap so stageUrl stays on the
      // translation URL (already ended). Setting stage='arabic' first would
      // immediately re-load the same Arabic ayah and cause a spurious replay +
      // AbortError when ayahIdx advances 400ms later.
      setTimeout(() => {
        setStage('arabic');
        setAyahIdx((i) => i + 1);
      }, 400);
    } else {
      setStage('arabic');
      setAyahIdx((i) => i + 1);
    }
  };

  const toggle  = () => setPlaying((p) => !p);
  const goPrev  = () => { setStage('arabic'); setAyahIdx((i) => Math.max(0, i - 1)); };
  const goNext  = () => arabic && (setStage('arabic'), setAyahIdx((i) => Math.min(arabic.ayahs.length - 1, i + 1)));
  const isUrdu  = translation.startsWith('ur.');
  const noAudio = translation !== 'none' && !hasTranslationAudio(translation);

  return (
    <div className={`rounded-3xl overflow-hidden border shadow-2xl ${isDark ? 'border-gold-300/30' : 'border-emerald-900/10'}`} style={{ background: '#F4F0E2' }}>
      {/* ── header ── */}
      <div className="text-white p-6 relative overflow-hidden"
        style={{ background: isDark
          ? 'linear-gradient(135deg,#143A28 0%,#0E2A1D 55%,#0A1F15 100%)'
          : 'linear-gradient(135deg,#1d5a41 0%,#16492f 55%,#103b27 100%)' }}>
        <div className="absolute inset-0 pattern-bg opacity-[0.12] pointer-events-none" />
        {/* drifting glow + sweeping sheen (continuous) */}
        <motion.div aria-hidden className="absolute -top-16 right-1/4 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(221,185,75,0.18) 0%, transparent 70%)' }}
          animate={{ x: [0, 30, 0], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#E9CF7A] text-xs uppercase tracking-widest">Surah {surahMeta.number}</p>
            <h2 className="h-display text-3xl font-bold text-white">{surahMeta.englishName}</h2>
            <p className="text-white/80 text-sm">
              {surahMeta.englishTranslation} • {surahMeta.revelation} • {surahMeta.ayahs} ayahs
            </p>
          </div>
          <motion.p className="font-arabic text-5xl text-[#E9CF7A] drop-shadow"
            animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            {surahMeta.arabic}
          </motion.p>
        </div>
      </div>

      {/* ── controls ── */}
      <div className={`px-5 py-4 flex flex-wrap items-center gap-3 border-b ${isDark ? 'border-white/10' : 'border-emerald-900/8'}`}
        style={{ background: isDark ? 'linear-gradient(135deg,#0E2A1D 0%,#0B2218 100%)' : '#FBF8EF' }}>
        <ReciterDropdown value={reciter} onChange={(v) => onReciterChange?.(v)} isDark={isDark} />
        <TranslationDropdown value={translation} onChange={(v) => onTranslationChange?.(v)} isDark={isDark} />
        <ToggleSwitch
          checked={translationMode}
          onChange={(v) => onTranslationModeChange?.(v)}
          label="Recite with translation"
          title="Plays each Arabic ayah followed by its translation, then moves to the next ayah."
          isDark={isDark}
        />

        {/* playback */}
        <div className="ml-auto flex items-center gap-1">
          <PlaybackBtn onClick={goPrev} title="Previous ayah" className={isDark ? 'text-white/80 hover:bg-white/10' : 'text-emerald-700 hover:bg-emerald-100'}>
            <SkipBack size={18} />
          </PlaybackBtn>

          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.91 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={`relative p-3.5 rounded-full border-2 transition-colors mx-1 ${isDark ? 'border-gold-400 text-gold-300 shadow-glow-gold hover:bg-gold-400/10' : 'border-emerald-600 bg-emerald-600 text-white shadow-glow-emerald hover:bg-emerald-700'}`}
          >
            {/* continuous pulse ring */}
            <motion.span aria-hidden className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: isDark ? '0 0 0 0 rgba(221,185,75,0.5)' : '0 0 0 0 rgba(16,185,129,0.5)' }}
              animate={{ boxShadow: isDark
                ? ['0 0 0 0 rgba(221,185,75,0.45)', '0 0 0 8px rgba(221,185,75,0)']
                : ['0 0 0 0 rgba(16,185,129,0.45)', '0 0 0 8px rgba(16,185,129,0)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={playing ? 'pause' : 'play'}
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1,   opacity: 1, rotate: 0 }}
                exit={{   scale: 0.5,  opacity: 0, rotate: 20 }}
                transition={{ duration: 0.14 }}
                className="relative block"
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <PlaybackBtn onClick={goNext} title="Next ayah" className={isDark ? 'text-white/80 hover:bg-white/10' : 'text-emerald-700 hover:bg-emerald-100'}>
            <SkipForward size={18} />
          </PlaybackBtn>

          <motion.button
            onClick={() => setRepeat((r) => !r)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            animate={{
              backgroundColor: repeat ? (isDark ? 'rgba(233,207,122,0.15)' : 'rgba(16,185,129,0.12)') : 'transparent',
              color: repeat ? (isDark ? '#E9CF7A' : '#047857') : (isDark ? 'rgba(250,247,238,0.8)' : '#047857'),
            }}
            className="p-2.5 rounded-full transition-colors"
            title="Repeat surah"
          >
            <Repeat size={18} />
          </motion.button>
        </div>
      </div>

      {/* ── no-audio notice ── */}
      <AnimatePresence>
        {translationMode && noAudio && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-2.5 text-xs text-amber-800 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
              <Languages size={13} className="shrink-0" />
              Spoken audio isn&apos;t available for this translation yet — the Arabic is recited and the translation is shown as text.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── now-reading ── */}
      <div className="p-6">
        {isLoading && (
          <div className="space-y-3">
            <div className="h-24 rounded-xl bg-emerald-50 animate-pulse" />
            <div className="h-16 rounded-xl bg-emerald-50/60 animate-pulse" />
          </div>
        )}

        {currentAyah && (
          <AnimatePresence mode="wait">
            <motion.div
              key={ayahIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="chip">Ayah {currentAyah.numberInSurah} of {arabic!.ayahs.length}</span>
                  <AnimatePresence>
                    {playing && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className={`chip ${stage === 'translation' ? 'bg-gold-100 text-gold-700 border-gold-300/40' : ''}`}
                      >
                        {stage === 'arabic' ? 'Reciting Arabic…' : 'Playing translation (tarjuma)…'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-xs text-ink/55">Juz {currentAyah.juz} • Page {currentAyah.page}</span>
              </div>

              <p className="font-arabic text-3xl md:text-4xl leading-[1.9] text-ink text-center" dir="rtl">
                {currentAyah.text}
                <span className="font-display text-emerald-700 text-2xl mx-2">
                  ﴿{toArabicNumber(currentAyah.numberInSurah)}﴾
                </span>
              </p>

              {(currentTrans || currentEnglish) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="border-t border-emerald-900/10 pt-4 space-y-2 text-center"
                >
                  {currentTrans && (
                    <p
                      dir={isUrdu ? 'rtl' : 'ltr'}
                      className={`text-lg leading-relaxed text-ink/80 ${isUrdu ? 'font-arabic text-xl' : ''}`}
                    >
                      {currentTrans.text}
                    </p>
                  )}
                  {currentEnglish && (
                    <p dir="ltr" className="text-base leading-relaxed text-ink/70">
                      {currentEnglish.text}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── progress bar ── */}
      {arabic && (
        <div className="px-6 pb-6">
          <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
            <motion.div
              animate={{ width: `${((ayahIdx + 1) / arabic.ayahs.length) * 100}%` }}
              className="h-full bg-gold-gradient"
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* ── error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        onEnded={onEnded}
        onError={onTranslationAudioError}
        preload="auto"
      />
      <audio ref={preloadRef} preload="auto" muted aria-hidden style={{ display: 'none' }} />
    </div>
  );
}

function toArabicNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}
