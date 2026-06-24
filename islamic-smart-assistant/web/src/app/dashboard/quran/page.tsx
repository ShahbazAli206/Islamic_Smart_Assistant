'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, ShieldCheck } from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { QuranPlayer } from '@/components/QuranPlayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { langToTranslation, type ReciterId, type TranslationId } from '@/lib/quran';
import { useTheme } from '@/lib/ThemeContext';

const QUICK_PICKS = [
  { number: 1,  label: 'Al-Fatihah', tag: 'The Opening'      },
  { number: 36, label: 'Yaseen',     tag: 'Heart of the Quran' },
  { number: 55, label: 'Ar-Rahman',  tag: 'The Beneficent'    },
  { number: 56, label: 'Al-Waqiah',  tag: 'After Maghrib'     },
  { number: 67, label: 'Al-Mulk',    tag: 'Before Sleep'      },
  { number: 18, label: 'Al-Kahf',    tag: 'Friday'            },
];

// Ticker items: surah cards + "View All" card, typed for discriminated union
type TickerSurah   = { kind: 'surah';   number: number; label: string; tag: string };
type TickerViewAll = { kind: 'viewall' };
type TickerItem    = TickerSurah | TickerViewAll;

const TICKER_ITEMS: TickerItem[] = [
  ...QUICK_PICKS.map((p) => ({ kind: 'surah' as const, ...p })),
  { kind: 'viewall' as const },
];

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

export default function QuranPage() {
  const { isDark } = useTheme();
  const [query, setQuery]               = useState('');
  const [surah, setSurah]               = useState(1);
  const [reciter, setReciter]           = useState<ReciterId>('ar.abdulbasitmurattal');
  const [translation, setTranslation]   = useState<TranslationId>('ur.jalandhry');
  const [translationMode, setTranslationMode] = useState(true);

  const [language] = useLocalStorage<string>('isa:language', 'en');
  useEffect(() => { setTranslation(langToTranslation(language)); }, [language]);

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

  const [showAll, setShowAll]   = useState(false);
  const isSearching             = query.trim().length > 0;
  const visibleSurahs           = isSearching ? filtered : (showAll ? SURAHS : SURAHS.slice(0, 6));

  const scrollToIndex = () => {
    setShowAll(true);
    requestAnimationFrame(() =>
      document.getElementById('all-surahs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  return (
    <div
      className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}
    >

      {/* ── hero ── */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Overview_Light_Theme_Updated background images first section.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        {/* header text */}
        <div className="relative px-6 sm:px-10 pt-8 pb-3 flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
              <BookOpen size={12} /> Holy Quran
            </span>
            <h1
              className="mt-4 font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] whitespace-nowrap text-black"
              style={{ textShadow: '0 1px 8px rgba(255,255,255,0.7)' }}
            >
              The Noble Quran
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-base sm:text-lg leading-relaxed text-black/85">
                All 114 Surahs · 7 world-class reciters · Arabic · Urdu/English translation
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-black/60">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                <ShieldCheck size={12} className="text-emerald-600" /> Streaming from verified CDN
              </span>
            </div>
          </div>

          <div className="hidden md:block" style={{ maxWidth: '360px' }}>
            <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                    ٢٠٤
                  </span>
                  <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                    وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ
                  </p>
                </div>
                <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                  And when the Quran is recited, listen to it and pay attention that you may receive mercy.
                </p>
                <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-A&apos;raf (7:204)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── quick-pick ticker — continuous right-to-left scroll ── */}
        <div
          className="relative pb-10 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(90deg, transparent 0%, black 3%, black 97%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 3%, black 97%, transparent 100%)',
          }}
        >
          <style>{`
            @keyframes quranTicker {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            .quran-ticker {
              animation: quranTicker 34s linear infinite;
              will-change: transform;
            }
            .quran-ticker:hover { animation-play-state: paused; }
          `}</style>

          {/* Duplicate TICKER_ITEMS for seamless infinite loop */}
          <div className="quran-ticker flex gap-3 w-max py-1 px-6 sm:px-10">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => {
              if (item.kind === 'viewall') {
                return (
                  <button
                    key={`va-${i}`}
                    onClick={scrollToIndex}
                    className={`shrink-0 rounded-2xl border-2 flex items-center gap-3 p-3 text-left transition
                      ${isDark
                        ? 'border-white/10 text-parchment hover:border-gold-300/50'
                        : 'border-emerald-200/70 text-emerald-900 hover:border-gold-300/60 shadow-[0_3px_14px_rgba(11,20,16,0.07)]'}`}
                    style={{ background: isDark ? 'linear-gradient(160deg,#0F2A1C 0%,#091510 100%)' : 'linear-gradient(160deg,#EEF3EC 0%,#E6EFE5 100%)' }}
                  >
                    <span className="shrink-0 flex h-24 w-24 items-center justify-center">
                      <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                        <BookOpen size={40} className={isDark ? 'text-gold-300' : 'text-gold-600'} />
                      </motion.span>
                    </span>
                    <span className="font-semibold text-sm leading-tight">
                      View All<br />
                      <span className={`text-xs font-normal ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}>114 Surahs</span>
                    </span>
                  </button>
                );
              }

              // TickerSurah
              const active = surah === item.number;
              return (
                <motion.button
                  key={`${item.number}-${i}`}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSurah(item.number)}
                  className={`shrink-0 relative overflow-hidden rounded-2xl p-3 flex items-center gap-3 text-left transition border-2
                    ${active
                      ? 'border-gold-400 shadow-glow-gold'
                      : isDark
                        ? 'border-white/8 hover:border-gold-300/50'
                        : 'border-black/5 hover:border-gold-300/60 shadow-[0_3px_14px_rgba(11,20,16,0.07)]'}`}
                  style={{
                    background: active
                      ? 'linear-gradient(160deg,#103024 0%,#0B2017 100%)'
                      : isDark
                        ? 'linear-gradient(160deg,#13241c 0%,#0c1813 100%)'
                        : '#FFFFFF',
                  }}
                >
                  {active && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'radial-gradient(circle at 30% 50%, rgba(221,185,75,0.18), transparent 70%)' }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* animated ring badge */}
                  <span className="relative shrink-0 flex h-24 w-24 items-center justify-center">
                    {/* outer dashed ring — bolder stroke + higher opacity */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-[3px] border-dashed"
                      style={{
                        borderColor: active
                          ? 'rgba(233,207,122,0.90)'
                          : isDark
                            ? 'rgba(221,185,75,0.70)'
                            : 'rgba(201,162,39,0.70)',
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    />
                    <span
                      className={`relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 font-display font-bold text-3xl
                        ${active
                          ? 'border-[#E9CF7A]/50 text-[#E9CF7A]'
                          : isDark
                            ? 'border-gold-400/30 text-gold-300'
                            : 'border-gold-500/30 text-gold-700'}`}
                    >
                      {item.number}
                    </span>
                  </span>

                  {/* text */}
                  <div className="relative min-w-0">
                    <p className={`text-[11px] ${active ? 'text-white/60' : isDark ? 'text-parchment/45' : 'text-ink/50'}`}>Surah {item.number}</p>
                    <p className={`font-display font-bold text-lg leading-tight truncate ${active ? 'text-[#E9CF7A]' : isDark ? 'text-parchment' : 'text-ink'}`}>{item.label}</p>
                    <p className={`text-[11px] mt-0.5 ${active ? 'text-white/55' : isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>{item.tag}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>{/* closes hero */}

      <div className="px-6 sm:px-10 pb-10 space-y-6">
        {/* ── player ── */}
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

        {/* ── full surah index ── */}
        <div id="all-surahs" className="rounded-3xl bg-parchment text-ink p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h3 className="font-display text-2xl font-bold">All Surahs</h3>
              <p className="text-xs text-ink/55">{isSearching ? filtered.length : SURAHS.length} of {SURAHS.length} Surahs</p>
            </div>
            <label className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or number…"
                className="pl-9 pr-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-72 max-w-full"
              />
            </label>
          </div>

          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleSurahs.map((s) => {
              const active = s.number === surah;
              return (
                <li key={s.number}>
                  <button
                    onClick={() => setSurah(s.number)}
                    className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition
                      ${active ? 'border-emerald-400 bg-emerald-50' : 'border-black/5 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'}`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold shrink-0
                      ${active ? 'bg-gold-gradient text-midnight-900' : 'bg-emerald-600 text-white'}`}>
                      {s.number}
                    </span>
                    <span className="flex-1 min-w-0">
                      <p className="font-bold truncate text-ink">{s.englishName}</p>
                      <p className="text-xs text-ink/55 truncate">{s.englishTranslation} · {s.ayahs} ayahs · {s.revelation}</p>
                    </span>
                    <span className="font-arabic text-2xl text-emerald-800 shrink-0">{s.arabic}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-center pt-5">
            {isSearching ? (
              <button
                onClick={() => setQuery('')}
                className="inline-flex items-center gap-2 rounded-full bg-mosque-gradient text-parchment px-6 py-3 text-sm font-semibold shadow-lg hover:brightness-110 transition"
              >
                <BookOpen size={16} className="text-gold-300" /> Clear search
              </button>
            ) : (
              <motion.button
                onClick={() => setShowAll((v) => !v)}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-shadow ${
                  isDark
                    ? 'bg-emerald-900/50 border border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-900/40 hover:bg-emerald-800/60 hover:border-emerald-400/50'
                    : 'bg-white/70 border-2 border-emerald-500 text-emerald-800 shadow-lg shadow-emerald-200 hover:bg-emerald-50 backdrop-blur-sm'
                }`}
              >
                <BookOpen size={16} className={isDark ? 'text-gold-300' : 'text-emerald-600'} />
                {showAll ? 'Show fewer Surahs' : 'Browse All 114 Surahs'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
