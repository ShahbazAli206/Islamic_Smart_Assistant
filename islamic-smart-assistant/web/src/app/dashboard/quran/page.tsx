'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Play } from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { QuranPlayer } from '@/components/QuranPlayer';
import { BnAudioManager } from '@/components/BnAudioManager';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { langToTranslation, type ReciterId, type TranslationId } from '@/lib/quran';
import { useTheme } from '@/lib/ThemeContext';

// Highlight frequently recited surahs with a gold dot
const POPULAR = new Set([1, 2, 18, 36, 55, 56, 67, 78, 112, 113, 114]);

export default function QuranPage() {
  const { isDark } = useTheme();
  const [query, setQuery]               = useState('');
  const [surah, setSurah]               = useState(1);
  const [reciter, setReciter]           = useState<ReciterId>('ar.abdulbasitmurattal');
  const [translation, setTranslation]   = useState<TranslationId>('ur.jalandhry');
  const [translationMode, setTranslationMode] = useState(true);
  const [listHovered, setListHovered]   = useState(false);

  const [language] = useLocalStorage<string>('isa:language', 'en');
  useEffect(() => { setTranslation(langToTranslation(language)); }, [language]);

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.englishTranslation.toLowerCase().includes(q) ||
      s.arabic.includes(q) ||
      String(s.number) === q,
    );
  }, [query]);

  // Duplicate SURAHS for seamless infinite vertical scroll; use filtered when searching
  const scrollItems = useMemo(
    () => (isSearching ? filtered : [...SURAHS, ...SURAHS]),
    [isSearching, filtered],
  );

  const isPaused = listHovered || isSearching;

  return (
    <div
      className={`-m-5 sm:-m-8 flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:min-h-0 lg:h-full overflow-hidden ${isDark ? 'text-parchment' : 'text-ink'}`}
      style={isDark
        ? { background: 'linear-gradient(180deg,#060f0a 0%,#08140d 100%)' }
        : { background: '#EEF5F0' }}
    >

      {/* ═══════════════ LEFT — Player section (60%) ═══════════════ */}
      <div className="relative flex flex-col lg:w-[60%] lg:min-h-0 lg:overflow-y-auto">

        {/* Background: features-bg.jpg + colour overlay */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage: 'url(/features-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            opacity: isDark ? 0.78 : 0.38,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'linear-gradient(170deg,rgba(4,12,8,0.52) 0%,rgba(6,18,12,0.58) 100%)'
              : 'linear-gradient(170deg,rgba(238,248,242,0.72) 0%,rgba(224,244,233,0.78) 100%)',
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
            <span className="flex items-center gap-1.5">
              <motion.span
                className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                animate={{ opacity: [1, 0.2, 1], scale: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className={`text-[11px] font-medium ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/80'}`}>
                CDN Streaming · 114 Surahs · 7 Reciters
              </span>
            </span>
          </div>

          {/* Player */}
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

          {translation === 'bn.bengali' && (
            <BnAudioManager surahNumber={surah} isDark={isDark} />
          )}
        </div>
      </div>

      {/* ═══════════════ RIGHT — Surah list (40%) ═══════════════ */}
      <div
        className={`relative flex flex-col lg:w-[40%] lg:min-h-0 border-t lg:border-t-0 lg:border-l ${
          isDark ? 'border-white/[0.06]' : 'border-emerald-100'
        }`}
      >
        {/* islamic_Library_bg.png background */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{
            backgroundImage: 'url(/islamic_Library_bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: isDark ? 0.42 : 0.30,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? 'rgba(3,8,5,0.76)'
              : 'rgba(244,250,246,0.80)',
          }}
        />
        {/* ── Header / Search ── */}
        <div className={`relative shrink-0 px-4 pt-4 pb-3 border-b ${
          isDark ? 'border-white/[0.06] bg-[rgba(3,8,5,0.75)]' : 'border-emerald-100 bg-white/85'
        }`}
          style={{ backdropFilter: isDark ? 'blur(8px)' : undefined, WebkitBackdropFilter: isDark ? 'blur(8px)' : undefined }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={`font-display font-bold text-base leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>
                All Surahs
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-parchment/38' : 'text-ink/45'}`}>
                {isSearching ? `${filtered.length} of ` : ''}{SURAHS.length} · tap to play
              </p>
            </div>
            <span className={`font-arabic text-2xl leading-none ${isDark ? 'text-gold-400/35' : 'text-emerald-200'}`}>
              القرآن
            </span>
          </div>

          <div className="relative">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/28' : 'text-ink/32'}`} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search surah name or number…"
              className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition ${
                isDark
                  ? 'bg-white/[0.05] border border-white/[0.08] text-parchment placeholder:text-parchment/25 focus:border-emerald-600/50'
                  : 'bg-emerald-50 border border-emerald-100 text-ink placeholder:text-ink/32 focus:border-emerald-300'
              }`}
            />
          </div>
        </div>

        {/* ── Scrolling surah list ── */}
        <div
          className="relative flex-1 overflow-hidden min-h-0"
          style={{
            maskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          }}
          onMouseEnter={() => setListHovered(true)}
          onMouseLeave={() => setListHovered(false)}
        >
          <style>{`
            @keyframes surahScrollUp {
              from { transform: translateY(0); }
              to   { transform: translateY(-50%); }
            }
            .surah-list-scroller {
              animation: surahScrollUp 300s linear infinite;
              will-change: transform;
            }
            .surah-list-scroller.paused {
              animation-play-state: paused;
            }
          `}</style>

          <div className={`surah-list-scroller${isPaused ? ' paused' : ''} px-3 py-3 space-y-1.5`}>
            {scrollItems.map((s, idx) => {
              const active = s.number === surah;
              const pop    = POPULAR.has(s.number);
              return (
                <motion.button
                  key={`${s.number}-${idx}`}
                  whileHover={{ x: 5, transition: { duration: 0.14 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSurah(s.number)}
                  className={`group w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${
                    active
                      ? isDark
                        ? 'border-gold-400/45 shadow-[0_0_22px_-5px_rgba(221,185,75,0.35)]'
                        : 'border-emerald-400/70 shadow-[0_2px_14px_rgba(16,185,129,0.18)]'
                      : isDark
                        ? 'border-white/[0.04] hover:border-emerald-800/50 hover:bg-emerald-950/30'
                        : 'border-transparent bg-white hover:border-emerald-200 hover:shadow-sm'
                  }`}
                  style={{
                    background: active
                      ? isDark
                        ? 'linear-gradient(135deg,rgba(16,44,30,0.85) 0%,rgba(8,24,16,0.9) 100%)'
                        : 'linear-gradient(135deg,rgba(209,250,229,0.75) 0%,rgba(167,243,208,0.35) 100%)'
                      : undefined,
                  }}
                >
                  {/* Number badge */}
                  <span className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-display font-bold shrink-0 transition-all ${
                    active
                      ? 'bg-gold-gradient text-midnight-900 shadow-[0_0_16px_rgba(221,185,75,0.5)]'
                      : isDark
                        ? 'bg-emerald-950/70 border border-emerald-800/40 text-emerald-400/80 group-hover:border-emerald-600/50 group-hover:text-emerald-300'
                        : 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                  }`}>
                    {pop && !active && (
                      <span className="absolute -top-[2px] -right-[2px] w-[7px] h-[7px] rounded-full bg-gold-400 shadow-[0_0_5px_rgba(221,185,75,0.7)]" />
                    )}
                    {s.number}
                  </span>

                  {/* Name + meta */}
                  <span className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm leading-tight truncate transition-colors ${
                      active
                        ? isDark ? 'text-gold-300' : 'text-emerald-800'
                        : isDark ? 'text-parchment/88' : 'text-ink'
                    }`}>
                      {s.englishName}
                    </p>
                    <p className={`text-[10.5px] mt-0.5 truncate ${isDark ? 'text-parchment/35' : 'text-ink/42'}`}>
                      {s.englishTranslation} · {s.ayahs}v · {s.revelation === 'Meccan' ? 'Makki' : 'Madani'}
                    </p>
                  </span>

                  {/* Arabic name */}
                  <span className={`font-arabic text-[1.1rem] leading-none shrink-0 transition-colors ${
                    active
                      ? isDark ? 'text-gold-300' : 'text-emerald-700'
                      : isDark ? 'text-emerald-600/60' : 'text-emerald-700/75'
                  }`}>
                    {s.arabic}
                  </span>

                  {/* Active pulse indicator */}
                  {active && (
                    <motion.span
                      className={`shrink-0 ${isDark ? 'text-gold-400' : 'text-emerald-600'}`}
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Play size={12} fill="currentColor" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
