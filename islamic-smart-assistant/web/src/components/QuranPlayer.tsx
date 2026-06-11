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
};

// ── Translation groups ────────────────────────────────────────────────────────
const LANG_GROUPS: { label: string | null; ids: string[] }[] = [
  { label: null,      ids: ['none'] },
  { label: 'English', ids: ['en.sahih', 'en.asad'] },
  { label: 'Urdu',    ids: ['ur.jalandhry', 'ur.junagarhi'] },
  { label: 'Turkish', ids: ['tr.vakfi', 'tr.diyanet', 'tr.yazir'] },
  { label: 'Chinese', ids: ['zh.majian'] },
  { label: 'French',  ids: ['fr.hamidullah'] },
  { label: 'Bengali', ids: ['bn.bengali', 'bn.hoque'] },
  { label: 'Hindi',   ids: ['hi.hindi', 'hi.farooq'] },
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
function ReciterDropdown({ value, onChange }: { value: ReciterId; onChange: (v: ReciterId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const selected = RECITERS.find(r => r.id === value);

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(p => !p)}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink shadow-sm hover:border-emerald-400 hover:shadow-md transition-all duration-200 min-w-[185px]"
      >
        <Mic2 size={15} className="text-emerald-600 shrink-0" />
        <span className="flex-1 text-left truncate">{selected?.name}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
          <ChevronDown size={14} className="text-emerald-500" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={dropdownTransition}
            className="absolute top-full mt-2 left-0 z-50 bg-white border border-emerald-100 rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden min-w-[220px]"
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
function TranslationDropdown({ value, onChange }: { value: TranslationId; onChange: (v: TranslationId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const transMap = Object.fromEntries(TRANSLATIONS.map(t => [t.id, t]));
  const selected = transMap[value];

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(p => !p)}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink shadow-sm hover:border-emerald-400 hover:shadow-md transition-all duration-200 min-w-[205px]"
      >
        <Languages size={15} className="text-emerald-600 shrink-0" />
        <span className="flex-1 text-left truncate">{selected?.name ?? 'No translation'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
          <ChevronDown size={14} className="text-emerald-500" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={dropdownTransition}
            className="absolute top-full mt-2 left-0 z-50 bg-white border border-emerald-100 rounded-2xl shadow-2xl shadow-emerald-900/10 overflow-hidden min-w-[270px]"
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
  checked, onChange, label, title,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <motion.button
      type="button"
      title={title}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-2.5 bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink shadow-sm hover:border-emerald-400 hover:shadow-md transition-all duration-200 cursor-pointer select-none"
    >
      {/* track */}
      <motion.div
        animate={{ backgroundColor: checked ? '#059669' : '#d1d5db' }}
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
}: Props) {
  const surahMeta = SURAHS.find((s) => s.number === surahNumber)!;
  const editions = useMemo(
    () => ['quran-uthmani', ...(translation === 'none' ? [] : [translation])],
    [translation],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['surah', surahNumber, editions.join('|')],
    queryFn: () => fetchSurahMulti(surahNumber, editions),
    staleTime: 60 * 60 * 1000,
  });

  const arabic = data?.[0];
  const trans  = data?.[1];

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
        setPlaying(false);
        setError(`Couldn't play audio: ${e?.message ?? 'browser blocked playback'}`);
      });
    } else {
      el.pause();
    }
  }, [playing, stageUrl]);

  const onEnded = () => {
    if (!arabic || !currentAyah) return;
    if (
      translationMode && stage === 'arabic' && translation !== 'none' &&
      translationAudioUrl(translation, currentAyah.number)
    ) {
      setStage('translation'); return;
    }
    const last = ayahIdx >= arabic.ayahs.length - 1;
    if (last) {
      setStage('arabic');
      if (repeat) setAyahIdx(0);
      else { setPlaying(false); return; }
    } else {
      const delay = translationMode ? 400 : 0;
      setStage('arabic');
      setTimeout(() => setAyahIdx((i) => i + 1), delay);
    }
  };

  const toggle  = () => setPlaying((p) => !p);
  const goPrev  = () => { setStage('arabic'); setAyahIdx((i) => Math.max(0, i - 1)); };
  const goNext  = () => arabic && (setStage('arabic'), setAyahIdx((i) => Math.min(arabic.ayahs.length - 1, i + 1)));
  const isUrdu  = translation.startsWith('ur.');
  const noAudio = translation !== 'none' && !hasTranslationAudio(translation);

  return (
    <div className="card overflow-hidden">
      {/* ── header ── */}
      <div className="bg-mosque-gradient text-parchment p-6 relative overflow-hidden">
        <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-gold-300 text-xs uppercase tracking-widest">Surah {surahMeta.number}</p>
            <h2 className="h-display text-3xl font-bold">{surahMeta.englishName}</h2>
            <p className="text-emerald-100/85 text-sm">
              {surahMeta.englishTranslation} • {surahMeta.revelation} • {surahMeta.ayahs} ayahs
            </p>
          </div>
          <p className="font-arabic text-5xl text-gold-200 drop-shadow">{surahMeta.arabic}</p>
        </div>
      </div>

      {/* ── controls ── */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-emerald-900/5 bg-gradient-to-r from-stone-50 to-emerald-50/40">
        <ReciterDropdown value={reciter} onChange={(v) => onReciterChange?.(v)} />
        <TranslationDropdown value={translation} onChange={(v) => onTranslationChange?.(v)} />
        <ToggleSwitch
          checked={translationMode}
          onChange={(v) => onTranslationModeChange?.(v)}
          label="Recite with translation"
          title="Plays each Arabic ayah followed by its translation, then moves to the next ayah."
        />

        {/* playback */}
        <div className="ml-auto flex items-center gap-1">
          <PlaybackBtn onClick={goPrev} title="Previous ayah" className="text-emerald-800 hover:bg-emerald-50">
            <SkipBack size={18} />
          </PlaybackBtn>

          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.91 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="p-3.5 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-colors mx-1"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={playing ? 'pause' : 'play'}
                initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                animate={{ scale: 1,   opacity: 1, rotate: 0 }}
                exit={{   scale: 0.5,  opacity: 0, rotate: 20 }}
                transition={{ duration: 0.14 }}
                className="block"
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <PlaybackBtn onClick={goNext} title="Next ayah" className="text-emerald-800 hover:bg-emerald-50">
            <SkipForward size={18} />
          </PlaybackBtn>

          <motion.button
            onClick={() => setRepeat((r) => !r)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            animate={{
              backgroundColor: repeat ? 'rgba(180,130,20,0.1)' : 'transparent',
              color: repeat ? '#b45309' : '#065f46',
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

              <p className="font-arabic text-3xl md:text-4xl leading-[1.9] text-ink text-right">
                {currentAyah.text}
                <span className="font-display text-emerald-700 text-2xl mx-2">
                  ﴿{toArabicNumber(currentAyah.numberInSurah)}﴾
                </span>
              </p>

              {currentTrans && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  className={`border-t border-emerald-900/10 pt-4 text-lg leading-relaxed text-ink/80
                              ${isUrdu ? 'font-arabic text-xl' : ''}`}
                >
                  {currentTrans.text}
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
        onError={() => { setPlaying(false); setError('Audio failed to load from the CDN.'); }}
        preload="auto"
      />
      <audio ref={preloadRef} preload="auto" muted aria-hidden style={{ display: 'none' }} />
    </div>
  );
}

function toArabicNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}
