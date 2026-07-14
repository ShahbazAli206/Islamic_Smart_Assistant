'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, BookMarked } from 'lucide-react';
import { QuranPlayer } from '@/components/QuranPlayer';
import { QuranReadOnlyView } from '@/components/QuranReadOnlyView';
import { QuranSurahList } from '@/components/QuranSurahList';
import { QuranParaList } from '@/components/QuranParaList';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { langToTranslation, type ReciterId, type TranslationId } from '@/lib/quran';
import { useMushafIndex, surahStartPage, juzStartPage } from '@/lib/mushaf';
import { useTheme } from '@/lib/ThemeContext';

export default function QuranPage() {
  const { isDark } = useTheme();
  const [surah, setSurah]               = useState(1);
  const [reciter, setReciter]           = useState<ReciterId>('ar.abdulbasitmurattal');
  const [translation, setTranslation]   = useState<TranslationId>('ur.jalandhry');
  const [translationMode, setTranslationMode] = useState(true);

  const [language] = useLocalStorage<string>('isa:language', 'en');
  useEffect(() => { setTranslation(langToTranslation(language)); }, [language]);

  // ── Read Only Mode: page-by-page 16-line mushaf reading, in place of the
  // audio player. Persisted so the toggle/last-read page survive a reload.
  const [readOnlyMode, setReadOnlyMode] = useLocalStorage('isa:quran-read-only-mode', false);
  const [mushafPage, setMushafPage]     = useLocalStorage('isa:quran-last-read-page', 1);
  const [sidePanelTab, setSidePanelTab] = useLocalStorage<'surah' | 'para'>('isa:quran-side-panel-tab', 'surah');
  const [activeJuz, setActiveJuz]       = useState(1);
  const { data: mushafIndex } = useMushafIndex();

  const selectSurah = (n: number) => {
    setSurah(n);
    if (readOnlyMode) setMushafPage(surahStartPage(mushafIndex, n));
  };
  const selectJuz = (n: number) => {
    setActiveJuz(n);
    if (readOnlyMode) setMushafPage(juzStartPage(mushafIndex, n));
  };

  return (
    <div
      className={`-m-5 sm:-m-8 flex flex-col lg:flex-row lg:h-[calc(100%+4rem)] overflow-hidden ${isDark ? 'text-parchment' : 'text-ink'}`}
    >

      {/* ═══════════════ LEFT — Player section (75%) ═══════════════ */}
      {/* features-bg.jpg is the background — a lush nature/forest image */}
      <div
        className="relative flex flex-col lg:w-[75%] lg:min-h-0 lg:overflow-y-auto"
        style={{
          backgroundImage: 'url(/features-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        {/* Dark/light readability overlay — keep thin so image shows clearly */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(170deg,rgba(2,8,4,0.16) 0%,rgba(3,10,5,0.20) 100%)'
              : 'linear-gradient(170deg,rgba(255,255,255,0.48) 0%,rgba(240,252,244,0.52) 100%)',
          }}
        />

        {/* ── Content ── */}
        <div className="relative flex flex-col flex-1 px-5 py-6 sm:px-8 sm:py-7 gap-5">

          {/* Badge row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur-sm border ${
              isDark
                ? 'border-gold-400/20 bg-emerald-950/55 text-gold-300'
                : 'border-emerald-200/80 bg-white/75 text-emerald-800'
            }`}>
              <BookOpen size={11} /> The Noble Quran
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 backdrop-blur-sm border ${
              isDark
                ? 'border-gold-400/20 bg-emerald-950/55'
                : 'border-emerald-200/80 bg-white/75'
            }`}>
              <motion.span
                className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className={`text-[11px] font-medium ${isDark ? 'text-emerald-400/70' : 'text-emerald-700'}`}>
                {readOnlyMode ? '16-Line Indo-Pak Mushaf · 548 Pages' : 'CDN Streaming · 114 Surahs · 7 Reciters'}
              </span>
            </span>

            {/* Read Only Mode toggle */}
            <button
              onClick={() => setReadOnlyMode(!readOnlyMode)}
              className={`ml-auto inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur-sm border transition ${
                readOnlyMode
                  ? isDark
                    ? 'border-gold-400/55 bg-gold-gradient text-midnight-900 shadow-[0_0_16px_rgba(221,185,75,0.4)]'
                    : 'border-amber-400/70 bg-gold-gradient text-midnight-900 shadow-[0_2px_10px_rgba(221,185,75,0.3)]'
                  : isDark
                    ? 'border-gold-400/20 bg-emerald-950/55 text-gold-300 hover:border-gold-400/40'
                    : 'border-emerald-200/80 bg-white/75 text-emerald-800 hover:border-emerald-300'
              }`}
            >
              <BookMarked size={11} /> {readOnlyMode ? 'Read Only Mode: On' : 'Read Only Mode'}
            </button>
          </div>

          {/* Player / Read Only reading view — narrower than the section, centered
              with extra x-axis breathing room */}
          <div className="w-full max-w-4xl mx-auto px-2 sm:px-6">
            {readOnlyMode ? (
              <QuranReadOnlyView page={mushafPage} onPageChange={setMushafPage} isDark={isDark} />
            ) : (
              <QuranPlayer
                surahNumber={surah}
                reciter={reciter}
                translation={translation}
                translationMode={translationMode}
                onReciterChange={setReciter}
                onTranslationChange={setTranslation}
                onTranslationModeChange={setTranslationMode}
                isDark={isDark}
              />
            )}
          </div>

        </div>
      </div>

      {/* ═══════════════ RIGHT — Surah / Para list (25%) ═══════════════ */}
      {/* islamic_Library_bg.png is the background — an Islamic library/mosque image */}
      <div
        className={`relative flex flex-col lg:w-[25%] lg:min-h-0 border-t lg:border-t-0 lg:border-l ${
          isDark ? 'border-white/[0.06]' : 'border-emerald-100'
        }`}
        style={{
          backgroundImage: 'url(/islamic_Library_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Very light overlay — keep the library image fully visible; per-row
            cards carry their own dark/light backdrop for text readability. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(180deg,rgba(6,4,2,0.18) 0%,rgba(10,6,3,0.22) 100%)'
              : 'linear-gradient(180deg,rgba(255,250,240,0.22) 0%,rgba(252,246,232,0.26) 100%)',
          }}
        />

        {/* ── Surah / Para tab switcher ── */}
        <div className="relative shrink-0 flex gap-1.5 px-4 pt-4">
          {(['surah', 'para'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidePanelTab(tab)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition border ${
                sidePanelTab === tab
                  ? isDark
                    ? 'border-gold-400/50 bg-emerald-950/70 text-gold-300'
                    : 'border-amber-400/60 bg-white/85 text-amber-800'
                  : isDark
                    ? 'border-white/10 bg-emerald-950/30 text-parchment/55 hover:text-parchment/80'
                    : 'border-white/40 bg-white/40 text-ink/55 hover:text-ink/80'
              }`}
            >
              {tab === 'surah' ? 'Surah' : 'Para'}
            </button>
          ))}
        </div>

        {sidePanelTab === 'surah' ? (
          <QuranSurahList surah={surah} onSelect={selectSurah} language={language} isDark={isDark} />
        ) : (
          <QuranParaList activeJuz={activeJuz} onSelect={selectJuz} isDark={isDark} />
        )}
      </div>
    </div>
  );
}
