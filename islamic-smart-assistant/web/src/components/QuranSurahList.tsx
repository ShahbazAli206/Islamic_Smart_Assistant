'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Play } from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { distinctSurahName } from '@/lib/surahNames';

// Highlight frequently recited surahs with a gold dot
const POPULAR = new Set([1, 2, 18, 36, 55, 56, 67, 78, 112, 113, 114]);

type Props = {
  surah: number;
  onSelect: (surahNumber: number) => void;
  language: string;
  isDark: boolean;
};

/** Right-panel "All Surahs" browsing list — extracted from the Quran page so it
 *  can sit alongside QuranParaList behind a tab switcher. Behavior unchanged
 *  from its original inline version in page.tsx. */
export function QuranSurahList({ surah, onSelect, language, isDark }: Props) {
  const [query, setQuery] = useState('');
  const [listHovered, setListHovered] = useState(false);

  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.englishTranslation.toLowerCase().includes(q) ||
      s.arabic.includes(q) ||
      (distinctSurahName(s.number, language)?.toLowerCase().includes(q) ?? false) ||
      String(s.number) === q,
    );
  }, [query, language]);

  // Duplicate SURAHS for seamless infinite vertical scroll; use filtered when searching
  const scrollItems = useMemo(
    () => (isSearching ? filtered : [...SURAHS, ...SURAHS]),
    [isSearching, filtered],
  );

  const isPaused = listHovered || isSearching;

  return (
    <>
      {/* ── Header / Search ── */}
      <div className={`relative shrink-0 px-4 pt-4 pb-3 border-b ${
        isDark ? 'border-white/[0.06]' : 'border-amber-200/60'
      }`}
        style={{
          background: isDark ? 'rgba(8,5,2,0.70)' : 'rgba(255,250,238,0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`font-display font-bold text-3xl leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>
              All Surahs
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-parchment/45' : 'text-ink/50'}`}>
              {isSearching ? `${filtered.length} of ` : ''}{SURAHS.length} · tap to play
            </p>
          </div>
          <span className={`font-arabic text-4xl leading-none ${isDark ? 'text-gold-400/45' : 'text-amber-700/60'}`}>
            القرآن
          </span>
        </div>

        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/28' : 'text-ink/32'}`} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search surah name or number…"
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition ${
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
          // Fade only at the bottom — a top fade made the first visible rows
          // under the header look washed-out/semi-transparent.
          maskImage: 'linear-gradient(180deg, black 0%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 94%, transparent 100%)',
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
            // Arabic name is always shown; the user's selected-language name is
            // shown right below it when a distinct translation exists.
            const localName = distinctSurahName(s.number, language);
            const localIsArabic = localName ? /[؀-ۿ]/.test(localName) : false;
            return (
              <motion.button
                key={`${s.number}-${idx}`}
                whileHover={{ x: 5, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(s.number)}
                className={`group w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150 ${
                  active
                    ? isDark
                      ? 'border-gold-400/55 shadow-[0_0_26px_-4px_rgba(221,185,75,0.45)]'
                      : 'border-amber-400/70 shadow-[0_2px_14px_rgba(221,185,75,0.22)]'
                    : isDark
                      ? 'border-white/[0.10] hover:border-gold-500/40'
                      : 'border-white/40 hover:border-amber-200 hover:shadow-sm'
                }`}
                style={{
                  background: active
                    ? isDark
                      ? 'linear-gradient(135deg,rgba(34,22,6,0.90) 0%,rgba(22,14,3,0.92) 100%)'
                      : 'linear-gradient(135deg,rgba(255,243,200,0.78) 0%,rgba(254,235,150,0.52) 100%)'
                    : isDark
                      ? 'rgba(6,10,8,0.72)'
                      : 'rgba(255,255,255,0.35)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                {/* Number badge */}
                <span className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-display font-bold shrink-0 transition-all ${
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
                  <p className={`font-semibold text-[17px] leading-tight truncate transition-colors ${
                    active
                      ? isDark ? 'text-gold-300' : 'text-amber-800'
                      : isDark ? 'text-parchment' : 'text-emerald-950'
                  }`}>
                    {s.englishName}
                  </p>
                  <p className={`text-[14px] mt-0.5 truncate ${isDark ? 'text-parchment/80' : 'text-ink/80'}`}>
                    {s.englishTranslation} · {s.ayahs}v · {s.revelation === 'Meccan' ? 'Makki' : 'Madani'}
                  </p>
                </span>

                {/* Right: Arabic name (top) + user-language name (below).
                    Warm neutral: dark in light mode, light in dark mode. */}
                <span className="shrink-0 flex flex-col items-end gap-0.5 max-w-[46%]">
                  {/* Arabic surah name — always shown */}
                  <span
                    dir="rtl"
                    title={s.arabic}
                    className={`font-arabic text-[1.4rem] leading-tight w-full text-right truncate transition-colors ${
                      active
                        ? isDark ? 'text-gold-200' : 'text-amber-800'
                        : isDark ? 'text-amber-100/85' : 'text-amber-900/80'
                    }`}
                  >
                    {s.arabic}
                  </span>
                  {/* User's selected-language name — shown below when translated */}
                  {localName && (
                    <span
                      dir={localIsArabic ? 'rtl' : 'ltr'}
                      title={localName}
                      className={`leading-tight w-full text-right truncate transition-colors ${
                        localIsArabic ? 'font-arabic text-[1.05rem]' : 'font-medium text-[12px]'
                      } ${
                        active
                          ? isDark ? 'text-gold-300/85' : 'text-amber-700/90'
                          : isDark ? 'text-parchment/60' : 'text-ink/55'
                      }`}
                    >
                      {localName}
                    </span>
                  )}
                </span>

                {/* Active pulse indicator */}
                {active && (
                  <motion.span
                    className={`shrink-0 ${isDark ? 'text-gold-400' : 'text-emerald-600'}`}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Play size={16} fill="currentColor" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
}
