'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Languages, Mic2,
  ChevronDown, Volume2, FileText, Check,
} from 'lucide-react';
import {
  RECITERS, TRANSLATIONS, fetchSurahMulti, ayahAudioUrl, translationAudioUrl,
  hasTranslationAudio, getTtsLang,
  type ReciterId, type TranslationId,
} from '@/lib/quran';
import { SURAHS } from '@/lib/surahs';
import { useBnDownloaded, localBnUrl, isBnLocalSupported } from '@/lib/bnAudioLocal';

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

// ── Translation groups ────────────────────────────────────────────────────────
// CDN audio: English, Urdu, Turkish, Chinese, French, Bengali, Persian, Russian, Kazakh
// Desktop TTS (system voice): German, Spanish, Dutch, Italian, Swedish, Bosnian, Albanian, Polish, Portuguese
const LANG_GROUPS: { label: string | null; ids: string[] }[] = [
  { label: null,           ids: ['none'] },
  // — CDN audio (all platforms) ———————————————————————————————————————————————
  { label: 'English',      ids: ['en.sahih', 'en.asad'] },
  { label: 'Urdu',         ids: ['ur.jalandhry', 'ur.junagarhi'] },
  { label: 'Turkish',      ids: ['tr.vakfi', 'tr.diyanet', 'tr.yazir'] },
  { label: 'Chinese',      ids: ['zh.majian'] },
  { label: 'French',       ids: ['fr.hamidullah'] },
  { label: 'Bengali',      ids: ['bn.bengali', 'bn.hoque'] },
  { label: 'Persian',      ids: ['fa.fooladvand'] },
  { label: 'Russian',      ids: ['ru.kuliev'] },
  { label: 'Kazakh',       ids: ['kk.khalifahaltai'] },
  // — System TTS on desktop (text on web) ————————————————————————————————————
  { label: 'German',       ids: ['de.bubenheim'] },
  { label: 'Spanish',      ids: ['es.cortes'] },
  { label: 'Dutch',        ids: ['nl.leemhuis'] },
  { label: 'Italian',      ids: ['it.piccardo'] },
  { label: 'Swedish',      ids: ['sv.bernstrom'] },
  { label: 'Bosnian',      ids: ['bs.korkut'] },
  { label: 'Albanian',     ids: ['sq.nahi'] },
  { label: 'Polish',       ids: ['pl.bielawskiego'] },
  { label: 'Portuguese',   ids: ['pt.elhayek'] },
];

// ── Tajweed makhraj (articulation-point) colour map ─────────────────────────
// Each Arabic letter is assigned a colour matching its place of articulation.
// This is a visual approximation, not a full rule engine.
const MAKHRAJ: Record<string, string> = {
  // Halq — throat (ء ه ع ح غ خ) → sky blue
  'ء': '#38bdf8', 'ه': '#38bdf8', 'ع': '#38bdf8',
  'ح': '#38bdf8', 'غ': '#38bdf8', 'خ': '#38bdf8',
  // Qalqalah — echoing bounce (ق ط ب ج د) → amber/gold
  'ق': '#f59e0b', 'ط': '#f59e0b', 'ب': '#f59e0b',
  'ج': '#f59e0b', 'د': '#f59e0b',
  // Ghunnah — nasal (ن م) → pink
  'ن': '#f472b6', 'م': '#f472b6',
  // Shafatain — lips (ف و) → violet
  'ف': '#a78bfa', 'و': '#a78bfa',
  // Dhalaaqah — tongue tip / lateral (ل ر) → emerald green
  'ل': '#34d399', 'ر': '#34d399',
  // Asnaan sibilants (ز س ص) → yellow
  'ز': '#fcd34d', 'س': '#fcd34d', 'ص': '#fcd34d',
  // Asnaan stops (ت) → orange  (ط is already qalqalah above)
  'ت': '#fb923c',
  // Interdentals (ث ذ ظ) → warm yellow
  'ث': '#fbbf24', 'ذ': '#fbbf24', 'ظ': '#fbbf24',
  // Middle tongue (ش ي) → teal
  'ش': '#2dd4bf', 'ي': '#22d3ee',
  // Back tongue (ك) → light green
  'ك': '#86efac',
  // Side tongue (ض) → light blue
  'ض': '#60a5fa',
};

// Split Arabic text into grapheme clusters (base letter + all following diacritics)
// so spans wrap each character with its harakāt together.
function splitGraphemes(text: string): string[] {
  const clusters: string[] = [];
  let cur = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    // Arabic combining diacritics: U+064B–U+065F, U+0610–U+061A, U+0670
    const isDiacritic = (cp >= 0x064B && cp <= 0x065F) || (cp >= 0x0610 && cp <= 0x061A) || cp === 0x0670;
    if (isDiacritic) { cur += ch; } else { if (cur) clusters.push(cur); cur = ch; }
  }
  if (cur) clusters.push(cur);
  return clusters;
}

// Renders an Arabic ayah with per-character tajweed makhraj colours.
function TajweedAyah({ text, isDark }: { text: string; isDark: boolean }) {
  const defaultColor = isDark ? '#e2e8f0' : '#1e293b';
  const words = text.split(/(\s+)/);
  return (
    <p className="font-arabic text-3xl md:text-4xl leading-[2] text-center" dir="rtl">
      {words.map((segment, wi) => {
        if (/^\s+$/.test(segment)) return <span key={wi}>{segment}</span>;
        const graphemes = splitGraphemes(segment);
        return (
          <span key={wi} className="inline-block">
            {graphemes.map((g, ci) => {
              const base = g[0];
              const hasShadda = g.includes('ّ');
              const color = MAKHRAJ[base] ?? defaultColor;
              return (
                <span
                  key={ci}
                  style={{
                    color,
                    textShadow: hasShadda ? `0 0 10px ${color}88` : undefined,
                  }}
                >
                  {g}
                </span>
              );
            })}
          </span>
        );
      })}
    </p>
  );
}

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
                    const hasCdnAudio = hasTranslationAudio(id as TranslationId);
                    const hasTts = !!getTtsLang(id as TranslationId);
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
                            hasCdnAudio
                              ? <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                  <Volume2 size={8} strokeWidth={2.5} /> audio
                                </span>
                              : hasTts
                                ? <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                    <Volume2 size={8} strokeWidth={2.5} /> tts
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

  // ── Audio pool ────────────────────────────────────────────────────────────
  // URL-keyed map of pre-loaded HTMLAudioElement objects. Each entry is created
  // when its URL enters the "upcoming" window and has el.load() called so it
  // starts buffering from the CDN immediately. On transition (Arabic → translation
  // or ayah N → N+1) we directly call play() on the already-buffered element
  // instead of resetting src + load() on a single shared element — that src/load
  // pipeline is what caused the 0.5–2 s silence gap.
  const poolRef        = useRef<Map<string, HTMLAudioElement>>(new Map());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stable ref so TTS advance callbacks don't capture stale closure values
  const advanceRef = useRef<() => void>(() => {});

  // Detect desktop (Electron / Tauri) — TTS is only used on desktop
  const isDesktop = useMemo(() => {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    return (
      navigator.userAgent.toLowerCase().includes('electron') ||
      !!(window as Window & { __TAURI__?: unknown }).__TAURI__
    );
  }, []);

  // Local Bengali audio: set of global ayah numbers downloaded to disk (desktop only)
  const bnDownloaded = useBnDownloaded();

  const currentAyah    = arabic?.ayahs[ayahIdx];
  const currentTrans   = trans?.ayahs[ayahIdx];
  const currentEnglish = english?.ayahs[ayahIdx];

  // Stable snapshot of state for event handlers. Handlers are created once with
  // useCallback([]) and read from this ref so they never capture stale closures.
  // Declared after currentAyah/currentTrans so TypeScript infers their types correctly.
  const hsRef = useRef({
    arabic,
    ayahIdx,
    stage,
    translationMode,
    translation,
    repeat,
    isDesktop,
    currentAyah,
    currentTrans,
  });

  // Synchronous update — runs before any effects this render cycle
  hsRef.current = { arabic, ayahIdx, stage, translationMode, translation, repeat, isDesktop, currentAyah, currentTrans };

  const stageUrl = (() => {
    if (!currentAyah) return null;
    if (stage === 'arabic') return currentAyah.audio ?? ayahAudioUrl(currentAyah.number, reciter);
    // Bengali: prefer local file (isa-audio:// served by Electron) over Supabase/TTS
    if (translation === 'bn.bengali' && bnDownloaded.has(currentAyah.number)) {
      return localBnUrl(currentAyah.number);
    }
    return translationAudioUrl(translation, currentAyah.number);
  })();

  // ── Pool helper ───────────────────────────────────────────────────────────
  const getPoolEl = useCallback((url: string): HTMLAudioElement => {
    const pool = poolRef.current;
    if (pool.has(url)) return pool.get(url)!;
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.load(); // start buffering immediately
    pool.set(url, el);
    return el;
  }, []);

  // ── Stable event handlers (read from hsRef — never recreated) ────────────
  const onEnded = useCallback(() => {
    const { arabic, currentAyah, stage, translationMode, translation, repeat, isDesktop, ayahIdx } = hsRef.current;
    if (!arabic || !currentAyah) return;

    const cdnTransUrl  = translationAudioUrl(translation, currentAyah.number);
    const ttsAvailable = isDesktop && !!getTtsLang(translation);
    if (
      translationMode && stage === 'arabic' && translation !== 'none' &&
      (!!cdnTransUrl || ttsAvailable)
    ) {
      setStage('translation');
      return;
    }

    const last = ayahIdx >= arabic.ayahs.length - 1;
    if (last) {
      setStage('arabic');
      if (repeat) setAyahIdx(0); else setPlaying(false);
      return;
    }

    if (translationMode) {
      // Keep stage='translation' during the 400 ms gap so stageUrl stays on the
      // translation URL (already ended). Setting stage='arabic' immediately would
      // trigger a spurious replay of the same Arabic ayah before ayahIdx advances.
      setTimeout(() => {
        setStage('arabic');
        setAyahIdx((i) => i + 1);
      }, 400);
    } else {
      setStage('arabic');
      setAyahIdx((i) => i + 1);
    }
  }, []);

  const onTranslationAudioError = useCallback(() => {
    const { stage, isDesktop, currentTrans, translation } = hsRef.current;
    if (stage === 'translation') {
      if (isDesktop && currentTrans) {
        const lang = getTtsLang(translation);
        if (lang) {
          const utter = new SpeechSynthesisUtterance(currentTrans.text);
          utter.lang = lang;
          utter.rate = 0.92;
          utter.onend  = () => advanceRef.current();
          utter.onerror = (e: Event) => {
            const err = (e as SpeechSynthesisErrorEvent).error;
            if (err === 'interrupted' || err === 'canceled') return;
            advanceRef.current();
          };
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
          return;
        }
      }
      advanceRef.current();
    } else {
      setPlaying(false);
      setError('Audio failed to load from the CDN.');
    }
  }, []);

  // Keep advanceRef always current so TTS callbacks don't capture stale state
  advanceRef.current = () => {
    const { arabic, ayahIdx, repeat } = hsRef.current;
    if (!arabic) return;
    const last = ayahIdx >= arabic.ayahs.length - 1;
    if (last) {
      setStage('arabic');
      if (repeat) setAyahIdx(0); else setPlaying(false);
    } else {
      setTimeout(() => { setStage('arabic'); setAyahIdx((i) => i + 1); }, 400);
    }
  };

  // ── Reset on surah / reciter change ──────────────────────────────────────
  useEffect(() => {
    // All pooled URLs are stale — flush and release memory
    poolRef.current.forEach((el) => { el.onended = null; el.onerror = null; el.src = ''; });
    poolRef.current.clear();
    activeAudioRef.current = null;
    setAyahIdx(0); setStage('arabic'); setPlaying(false); setError(null);
  }, [surahNumber, reciter]);

  // ── Reset stage on translation change ────────────────────────────────────
  // Stale translation URLs are evicted naturally by the prefetch effect below.
  useEffect(() => { setStage('arabic'); }, [translation]);

  // ── Prefetch: keep next 3 ayah pairs buffered in the pool ────────────────
  useEffect(() => {
    if (!arabic || !currentAyah) return;
    const urlsToKeep = new Set<string>();
    if (stageUrl) urlsToKeep.add(stageUrl);

    // Translation of current ayah — the very next sound when stage='arabic'
    if (stage === 'arabic' && translationMode && translation !== 'none') {
      const url = (translation === 'bn.bengali' && bnDownloaded.has(currentAyah.number))
        ? localBnUrl(currentAyah.number)
        : translationAudioUrl(translation, currentAyah.number);
      if (url) urlsToKeep.add(url);
    }

    // Arabic + translation URLs for the next 3 ayahs
    for (let i = 1; i <= 3; i++) {
      const next = arabic.ayahs[ayahIdx + i];
      if (!next) break;
      urlsToKeep.add(next.audio ?? ayahAudioUrl(next.number, reciter));
      if (translationMode && translation !== 'none') {
        // Bengali: use local file URL if downloaded, else CDN/Supabase URL
        const url = (translation === 'bn.bengali' && bnDownloaded.has(next.number))
          ? localBnUrl(next.number)
          : translationAudioUrl(translation, next.number);
        if (url) urlsToKeep.add(url);
      }
    }

    // Ensure every upcoming URL has a pool element that is already loading
    urlsToKeep.forEach(url => getPoolEl(url));

    // Evict pool entries that are no longer in the upcoming window
    poolRef.current.forEach((el, url) => {
      if (!urlsToKeep.has(url)) {
        el.onended = null; el.onerror = null; el.src = '';
        poolRef.current.delete(url);
      }
    });
  }, [arabic, ayahIdx, stage, translationMode, translation, reciter, stageUrl, currentAyah, getPoolEl]);

  // ── Activate pool element for current stageUrl ────────────────────────────
  // This replaces the old `el.src = stageUrl; el.load()` effect. Instead of
  // resetting a shared element, we look up (or create) the pre-loaded pool
  // element for the new URL and make it the active player. No load() call means
  // no CDN round-trip delay on the Arabic → translation transition.
  useEffect(() => {
    if (!stageUrl) return; // TTS / no-audio path; the TTS useEffect handles it
    const el = getPoolEl(stageUrl);
    const prev = activeAudioRef.current;
    if (prev && prev !== el) {
      prev.pause();
      prev.currentTime = 0;
      prev.onended = null;
      prev.onerror = null;
    }
    el.onended = onEnded;
    el.onerror = onTranslationAudioError;
    activeAudioRef.current = el;
    setError(null);
  }, [stageUrl, getPoolEl, onEnded, onTranslationAudioError]);

  // ── Play / pause ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stageUrl) return; // TTS handled by the dedicated useEffect below
    const el = activeAudioRef.current;
    if (!el) return;
    if (playing) {
      el.play().catch((e) => {
        if (e?.name === 'AbortError') return;
        setPlaying(false);
        setError(`Couldn't play audio: ${e?.message ?? 'browser blocked playback'}`);
      });
    } else {
      el.pause();
    }
  }, [playing, stageUrl]);

  // Cancel TTS whenever playback pauses or the component unmounts
  useEffect(() => {
    if (!playing) window.speechSynthesis?.cancel();
  }, [playing]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  // ── Desktop TTS playback ─────────────────────────────────────────────────────
  // Fires when stage==='translation' and there is no CDN audio URL (stageUrl===null),
  // meaning this translation's audio comes from the OS voice instead of the CDN.
  useEffect(() => {
    if (!playing || stage !== 'translation' || !isDesktop || !currentTrans || stageUrl) return;
    const lang = getTtsLang(translation);
    if (!lang) return;

    const utter = new SpeechSynthesisUtterance(currentTrans.text);
    utter.lang = lang;
    utter.rate = 0.92;
    utter.onend  = () => advanceRef.current();
    utter.onerror = (e: Event) => {
      const err = (e as SpeechSynthesisErrorEvent).error;
      // 'interrupted' / 'canceled' means the user paused — don't advance
      if (err === 'interrupted' || err === 'canceled') return;
      advanceRef.current();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    return () => { window.speechSynthesis.cancel(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, playing, ayahIdx, translation, isDesktop, stageUrl]);

  // ── Cleanup pool on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      poolRef.current.forEach(el => { el.onended = null; el.onerror = null; el.src = ''; });
      poolRef.current.clear();
    };
  }, []);

  const toggle  = () => setPlaying((p) => !p);
  const goPrev  = () => { setStage('arabic'); setAyahIdx((i) => Math.max(0, i - 1)); };
  const goNext  = () => arabic && (setStage('arabic'), setAyahIdx((i) => Math.min(arabic.ayahs.length - 1, i + 1)));
  const isUrdu       = translation.startsWith('ur.');
  const hasCdnAudio  = hasTranslationAudio(translation);
  const hasTtsAudio  = isDesktop && !!getTtsLang(translation);
  // true when translation mode would play nothing at all for this platform
  const noAudio      = translation !== 'none' && !hasCdnAudio && !hasTtsAudio;
  // on web, TTS translations exist but won't play — show an informational hint
  const webTtsNotice = !isDesktop && translation !== 'none' && !hasCdnAudio && !!getTtsLang(translation);

  return (
    <div className={`rounded-3xl overflow-hidden border shadow-2xl ${isDark ? 'border-gold-300/25' : 'border-emerald-900/10'}`}
      style={{ background: isDark ? 'rgba(6,18,12,0.97)' : '#F4F0E2' }}>
      {/* ── header ── */}
      <div className="text-white p-6 relative overflow-hidden"
        style={{ background: isDark
          ? 'linear-gradient(135deg,#143A28 0%,#0E2A1D 55%,#0A1F15 100%)'
          : 'linear-gradient(135deg,#1d5a41 0%,#16492f 55%,#103b27 100%)' }}>
        {/* features background image at low opacity */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url(/features-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18 }} />
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

      {/* ── no-audio / TTS hint notice ── */}
      <AnimatePresence>
        {translationMode && (noAudio || webTtsNotice) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-2.5 text-xs text-amber-800 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
              <Languages size={13} className="shrink-0" />
              {webTtsNotice
                ? 'Audio plays via system TTS on the desktop app — translation shown as text here on web.'
                : "Spoken audio isn't available for this translation yet — the Arabic is recited and the translation is shown as text."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── now-reading ── */}
      <div className={`p-6 ${isDark ? 'bg-[rgba(6,18,12,0.97)]' : ''}`}>
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
                        {stage === 'arabic'
                          ? 'Reciting Arabic…'
                          : hasTtsAudio
                            ? 'Playing via TTS…'
                            : 'Playing translation (tarjuma)…'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <span className="text-xs text-ink/55">Juz {currentAyah.juz} • Page {currentAyah.page}</span>
              </div>

              {/* Tajweed-coloured Arabic text */}
              <div className="relative">
                <TajweedAyah text={currentAyah.text} isDark={isDark} />
                <p dir="rtl" className="text-center -mt-1">
                  <span className={`font-display text-2xl mx-1 ${isDark ? 'text-gold-400/80' : 'text-emerald-700'}`}>
                    ﴿{toArabicNumber(currentAyah.numberInSurah)}﴾
                  </span>
                </p>
                {/* Tajweed legend */}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {[
                    { color: '#38bdf8', label: 'Throat (حلق)' },
                    { color: '#f59e0b', label: 'Qalqalah (قلقلة)' },
                    { color: '#f472b6', label: 'Ghunnah (غنة)' },
                    { color: '#34d399', label: 'Tongue tip (ذلاقة)' },
                    { color: '#a78bfa', label: 'Lips (شفتان)' },
                    { color: '#fcd34d', label: 'Sibilants (أسنان)' },
                  ].map(({ color, label }) => (
                    <span key={label} className="inline-flex items-center gap-1 text-[10px] opacity-70">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className={isDark ? 'text-parchment/60' : 'text-ink/55'}>{label}</span>
                    </span>
                  ))}
                </div>
              </div>

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
        <div className={`px-6 pb-6 ${isDark ? 'bg-[rgba(6,18,12,0.97)]' : ''}`}>
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
    </div>
  );
}

function toArabicNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}
