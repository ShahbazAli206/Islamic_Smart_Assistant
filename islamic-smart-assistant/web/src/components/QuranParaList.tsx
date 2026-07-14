'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Play } from 'lucide-react';
import { JUZ, juzStartLabel } from '@/lib/juz';

type Props = {
  activeJuz: number;
  onSelect: (juzNumber: number) => void;
  isDark: boolean;
};

/** Right-panel "Para (Juz)" browsing list — sibling of QuranSurahList, shown
 *  when the tab switcher is set to Para. Styled to match QuranSurahList so the
 *  two tabs feel like one continuous panel. */
export function QuranParaList({ activeJuz, onSelect, isDark }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JUZ;
    return JUZ.filter(j =>
      juzStartLabel(j).toLowerCase().includes(q) ||
      String(j.number) === q,
    );
  }, [query]);

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
              All Para
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-parchment/45' : 'text-ink/50'}`}>
              {query.trim() ? `${filtered.length} of ` : ''}{JUZ.length} · tap to read
            </p>
          </div>
          <span className={`font-arabic text-4xl leading-none ${isDark ? 'text-gold-400/45' : 'text-amber-700/60'}`}>
            الجزء
          </span>
        </div>

        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/28' : 'text-ink/32'}`} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search para number or surah…"
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition ${
              isDark
                ? 'bg-white/[0.05] border border-white/[0.08] text-parchment placeholder:text-parchment/25 focus:border-emerald-600/50'
                : 'bg-emerald-50 border border-emerald-100 text-ink placeholder:text-ink/32 focus:border-emerald-300'
            }`}
          />
        </div>
      </div>

      {/* ── Para list ── */}
      <div
        className="relative flex-1 overflow-y-auto min-h-0"
        style={{
          maskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="px-3 py-3 space-y-1.5">
          {filtered.map((j) => {
            const active = j.number === activeJuz;
            return (
              <motion.button
                key={j.number}
                whileHover={{ x: 5, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(j.number)}
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
                <span className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-display font-bold shrink-0 transition-all ${
                  active
                    ? 'bg-gold-gradient text-midnight-900 shadow-[0_0_16px_rgba(221,185,75,0.5)]'
                    : isDark
                      ? 'bg-emerald-950/70 border border-emerald-800/40 text-emerald-400/80 group-hover:border-emerald-600/50 group-hover:text-emerald-300'
                      : 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                }`}>
                  {j.number}
                </span>

                <span className="flex-1 min-w-0">
                  <p className={`font-semibold text-[17px] leading-tight truncate transition-colors ${
                    active
                      ? isDark ? 'text-gold-300' : 'text-amber-800'
                      : isDark ? 'text-parchment' : 'text-emerald-950'
                  }`}>
                    Para {j.number}
                  </p>
                  <p className={`text-[14px] mt-0.5 truncate ${isDark ? 'text-parchment/80' : 'text-ink/80'}`}>
                    Starts at {juzStartLabel(j)}
                  </p>
                </span>

                <span
                  dir="rtl"
                  title={j.arabic}
                  className={`shrink-0 font-arabic text-[1.3rem] leading-tight max-w-[40%] text-right truncate transition-colors ${
                    active
                      ? isDark ? 'text-gold-200' : 'text-amber-800'
                      : isDark ? 'text-amber-100/85' : 'text-amber-900/80'
                  }`}
                >
                  {j.arabic}
                </span>

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
