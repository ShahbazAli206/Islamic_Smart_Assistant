'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, BookOpen, Languages, Mic2,
} from 'lucide-react';
import {
  RECITERS, TRANSLATIONS, fetchSurahMulti, ayahAudioUrl, translationAudioUrl,
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

/**
 * Ayah-by-ayah player. In translation mode (Arabic + translation), we play the Arabic
 * recitation for each ayah, then briefly pause to let the on-screen translation
 * appear before advancing to the next ayah.
 */
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

  // Reset position when surah / reciter changes
  useEffect(() => {
    setAyahIdx(0); setStage('arabic'); setPlaying(false); setError(null);
  }, [surahNumber, reciter]);

  // If translation choice changes, restart current ayah at the Arabic stage.
  useEffect(() => { setStage('arabic'); }, [translation]);

  const currentAyah = arabic?.ayahs[ayahIdx];
  const currentTrans = trans?.ayahs[ayahIdx];

  // Decide what URL belongs to the current (ayah, stage) tuple.
  const stageUrl = (() => {
    if (!currentAyah) return null;
    if (stage === 'arabic') {
      return currentAyah.audio ?? ayahAudioUrl(currentAyah.number, reciter);
    }
    return translationAudioUrl(translation, surahNumber, currentAyah.numberInSurah);
  })();

  // Load whenever the URL changes — without touching `playing`,
  // so toggling play/pause doesn't re-seek the file.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stageUrl) return;
    el.src = stageUrl;
    el.load();
    setError(null);
  }, [stageUrl]);

  // Pre-fetch the *next* clip into a hidden audio element so the gap between
  // Arabic and translation (or between ayahs) is sub-100ms instead of 1-2s.
  useEffect(() => {
    if (!arabic || !currentAyah) return;
    const pre = preloadRef.current;
    if (!pre) return;

    const wantsTranslation =
      translationMode &&
      stage === 'arabic' &&
      translation !== 'none' &&
      translationAudioUrl(translation, surahNumber, currentAyah.numberInSurah);

    let nextUrl: string | null = null;
    if (wantsTranslation) {
      nextUrl = translationAudioUrl(translation, surahNumber, currentAyah.numberInSurah);
    } else if (ayahIdx < arabic.ayahs.length - 1) {
      const next = arabic.ayahs[ayahIdx + 1];
      nextUrl = next.audio ?? ayahAudioUrl(next.number, reciter);
    }

    if (nextUrl && pre.src !== nextUrl) {
      pre.src = nextUrl;
      pre.load();
    }
  }, [arabic, currentAyah, ayahIdx, stage, translationMode, translation, surahNumber, reciter]);

  // Play / pause based on `playing` flag.
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

    // PTV mode: after Arabic, play the spoken translation (if we have audio for it),
    // then advance to the next ayah.
    if (
      translationMode &&
      stage === 'arabic' &&
      translation !== 'none' &&
      translationAudioUrl(translation, surahNumber, currentAyah.numberInSurah)
    ) {
      setStage('translation');
      return;
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

  const toggle = () => setPlaying((p) => !p);
  const goPrev = () => { setStage('arabic'); setAyahIdx((i) => Math.max(0, i - 1)); };
  const goNext = () => arabic && (setStage('arabic'), setAyahIdx((i) => Math.min(arabic.ayahs.length - 1, i + 1)));
  const isUrdu = translation.startsWith('ur.');

  return (
    <div className="card overflow-hidden">
      {/* header */}
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
          <p className="font-arabic text-5xl text-gold-200 drop-shadow">
            {surahMeta.arabic}
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="p-5 flex flex-wrap items-center gap-3 border-b border-emerald-900/5 bg-white/50">
        <div className="flex items-center gap-2 text-sm">
          <Mic2 size={16} className="text-emerald-700" />
          <select
            value={reciter}
            onChange={(e) => onReciterChange?.(e.target.value as ReciterId)}
            className="bg-white border border-emerald-100 rounded-lg px-3 py-2 font-medium text-ink"
          >
            {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Languages size={16} className="text-emerald-700" />
          <select
            value={translation}
            onChange={(e) => onTranslationChange?.(e.target.value as TranslationId)}
            className="bg-white border border-emerald-100 rounded-lg px-3 py-2 font-medium text-ink"
          >
            {TRANSLATIONS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <label
          title="Plays each Arabic ayah followed by its translation, then moves to the next ayah."
          className="flex items-center gap-2 text-sm bg-white border border-emerald-100 rounded-lg px-3 py-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={translationMode}
            onChange={(e) => onTranslationModeChange?.(e.target.checked)}
            className="accent-emerald-600"
          />
          Recite each ayah with its translation
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={goPrev}   className="p-2 rounded-full hover:bg-emerald-50 text-emerald-800"><SkipBack size={18}/></button>
          <button onClick={toggle}   className="p-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-glow-emerald">
            {playing ? <Pause size={20}/> : <Play size={20}/>}
          </button>
          <button onClick={goNext}   className="p-2 rounded-full hover:bg-emerald-50 text-emerald-800"><SkipForward size={18}/></button>
          <button
            onClick={() => setRepeat((r) => !r)}
            className={`p-2 rounded-full ${repeat ? 'bg-gold-100 text-gold-700' : 'hover:bg-emerald-50 text-emerald-800'}`}
            title="Repeat surah"
          >
            <Repeat size={18}/>
          </button>
        </div>
      </div>

      {/* now-reading */}
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
                  {playing && (
                    <span className={`chip ${stage === 'translation' ? 'bg-gold-100 text-gold-700 border-gold-300/40' : ''}`}>
                      {stage === 'arabic' ? 'Reciting Arabic…' : 'Playing translation (tarjuma)…'}
                    </span>
                  )}
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
                <div
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  className={`border-t border-emerald-900/10 pt-4 text-lg leading-relaxed text-ink/80
                              ${isUrdu ? 'font-arabic text-xl' : ''}`}
                >
                  {currentTrans.text}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ayah scrubber */}
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

      {error && (
        <div className="mx-6 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={onEnded}
        onError={() => { setPlaying(false); setError('Audio failed to load from the CDN.'); }}
        preload="auto"
      />
      {/* Hidden preloader — warms the browser cache for the next clip. */}
      <audio ref={preloadRef} preload="auto" muted aria-hidden style={{ display: 'none' }} />
    </div>
  );
}

function toArabicNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}
