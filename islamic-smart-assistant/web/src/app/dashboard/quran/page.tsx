'use client';

// Quran reader page: curated quick-pick surahs, the audio/translation player,
// and a searchable index of all 114 surahs. Selected surah + reciter +
// translation are held in local state and handed down to <QuranPlayer />.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, ShieldCheck } from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { QuranPlayer } from '@/components/QuranPlayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { langToTranslation, type ReciterId, type TranslationId } from '@/lib/quran';
import { useTheme } from '@/lib/ThemeContext';

// Hand-picked popular surahs surfaced as shortcut cards above the full index.
// `tag` is the contextual reason it's a common pick (e.g. recited on Friday).
const QUICK_PICKS = [
  { number: 1,  label: 'Al-Fatihah', tag: 'The Opening' },
  { number: 36, label: 'Yaseen',     tag: 'Heart of the Quran' },
  { number: 55, label: 'Ar-Rahman',  tag: 'The Beneficent' },
  { number: 56, label: 'Al-Waqiah',  tag: 'After Maghrib' },
  { number: 67, label: 'Al-Mulk',    tag: 'Before Sleep' },
  { number: 18, label: 'Al-Kahf',    tag: 'Friday' },
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

/** Quran reader: quick picks, player, and a searchable full surah index. */
export default function QuranPage() {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');                       // search box text for the surah index
  const [surah, setSurah] = useState(1);                        // currently selected surah number (drives the player)
  const [reciter, setReciter] = useState<ReciterId>('ar.abdulbasitmurattal');
  const [translation, setTranslation] = useState<TranslationId>('ur.jalandhry');
  const [translationMode, setTranslationMode] = useState(true);

  // Apply the user's preferred language once it loads from localStorage.
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  useEffect(() => {
    setTranslation(langToTranslation(language));
  }, [language]);

  // Filter the full surah list by the search box.
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

  // Show only the first two rows (6 surahs) by default; reveal all 114 when the
  // user taps "Browse All". A search always shows the full set of matches.
  const [showAll, setShowAll] = useState(false);
  const isSearching = query.trim().length > 0;
  const visibleSurahs = isSearching ? filtered : (showAll ? SURAHS : SURAHS.slice(0, 6));

  return (
    // Break out of the dashboard's padding so the dark theme + photo header fill
    // the content area edge-to-edge, matching the reference design.
    <div className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}>

      {/* ── header banner: pastel blobs left + mosque photo right ── */}
      <header className="relative overflow-hidden min-h-[300px]">
        <div aria-hidden className="absolute inset-0">
          {/* base pastel / dark gradient */}
          <div className="absolute inset-0" style={{ background: isDark ? 'linear-gradient(120deg,#0c2418 0%,#08160f 72%)' : 'linear-gradient(120deg,#fdf8ec 0%,#f4ead7 72%)' }} />

          {/* right ~62%: mosque photo */}
          <div className="absolute inset-y-0 right-0 w-[62%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masjid_img.png" alt="" className="w-full h-full object-cover object-center" style={isDark ? { filter: 'brightness(0.82)' } : undefined} />
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
          {/* left: badge + title + description */}
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur border ${isDark ? 'border-gold-300/50 bg-black/30 text-gold-200' : 'border-gold-500/40 bg-white/70 text-emerald-800'}`}>
              <BookOpen size={12} /> Holy Quran
            </span>
            <h1 className={`mt-4 font-display font-bold text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl leading-[1.05] whitespace-nowrap ${isDark ? 'text-white' : 'text-emerald-950'}`}
              style={{ textShadow: isDark ? '0 2px 16px rgba(0,0,0,0.6)' : '0 1px 8px rgba(255,255,255,0.7)' }}>
              The Noble Quran
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl px-4 py-2.5"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.2)' }}>
              <p className="text-base sm:text-lg leading-relaxed text-white/90">
                All 114 Surahs · 7 world-class reciters · Arabic · Urdu/English translation
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                <ShieldCheck size={12} className="text-emerald-400" /> Streaming from verified CDN
              </span>
            </div>
          </div>

          {/* right: Quran ayah */}
          <div className="hidden md:block max-w-[16rem]">
            <div className="rounded-2xl px-4 py-3 text-right"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.22)' }}>
              <p className={`font-arabic text-xl lg:text-2xl leading-[1.9] ${isDark ? 'text-[#E9CF7A]' : 'text-black'}`} dir="rtl">
                وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ
              </p>
              <p className="mt-1.5 text-sm lg:text-base leading-relaxed font-medium text-white/90">
                And when the Quran is recited, listen to it and pay attention that you may receive mercy.
              </p>
              <p className="mt-1 text-xs font-bold text-[#F1D588]">Surah Al-A&apos;raf (7:204)</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-10 pb-10 space-y-6">

        {/* ── quick picks ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {QUICK_PICKS.map((p, i) => {
            const active = surah === p.number;
            return (
              <motion.button
                key={p.number}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSurah(p.number)}
                className={`relative overflow-hidden rounded-2xl p-3 flex items-center gap-3 text-left transition border-2
                  ${active
                    ? 'border-gold-400 shadow-glow-gold'
                    : isDark
                      ? 'border-white/8 hover:border-gold-300/50'
                      : 'border-black/5 hover:border-gold-300/60 shadow-[0_3px_14px_rgba(11,20,16,0.07)]'}`}
                style={{ background: active
                  ? 'linear-gradient(160deg,#103024 0%,#0B2017 100%)'
                  : isDark ? 'linear-gradient(160deg,#13241c 0%,#0c1813 100%)' : '#FFFFFF' }}
              >
                {active && (
                  <motion.span aria-hidden className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 30% 50%, rgba(221,185,75,0.18), transparent 70%)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
                )}
                {/* ornate animated number badge — left side, doubled size */}
                <span className="relative shrink-0 flex h-24 w-24 items-center justify-center">
                  <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed"
                    style={{ borderColor: active ? 'rgba(233,207,122,0.55)' : isDark ? 'rgba(221,185,75,0.3)' : 'rgba(201,162,39,0.35)' }}
                    animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
                  <span className={`relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 font-display font-bold text-3xl
                    ${active ? 'border-[#E9CF7A]/50 text-[#E9CF7A]' : isDark ? 'border-gold-400/30 text-gold-300' : 'border-gold-500/30 text-gold-700'}`}>
                    {p.number}
                  </span>
                </span>
                {/* text stack — right side */}
                <div className="relative min-w-0">
                  <p className={`text-[11px] ${active ? 'text-white/60' : isDark ? 'text-parchment/45' : 'text-ink/50'}`}>Surah {p.number}</p>
                  <p className={`font-display font-bold text-lg leading-tight truncate ${active ? 'text-[#E9CF7A]' : isDark ? 'text-parchment' : 'text-ink'}`}>{p.label}</p>
                  <p className={`text-[11px] mt-0.5 ${active ? 'text-white/55' : isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>{p.tag}</p>
                </div>
              </motion.button>
            );
          })}

          {/* View All card */}
          <button
            onClick={() => {
              setShowAll(true);
              requestAnimationFrame(() => document.getElementById('all-surahs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            }}
            className={`rounded-2xl border-2 flex items-center gap-3 p-3 text-left transition
              ${isDark ? 'border-white/10 text-parchment hover:border-gold-300/50' : 'border-emerald-200/70 text-emerald-900 hover:border-gold-300/60 shadow-[0_3px_14px_rgba(11,20,16,0.07)]'}`}
            style={{ background: isDark ? 'linear-gradient(160deg,#0F2A1C 0%,#091510 100%)' : 'linear-gradient(160deg,#EEF3EC 0%,#E6EFE5 100%)' }}
          >
            <span className="shrink-0 flex h-24 w-24 items-center justify-center">
              <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <BookOpen size={40} className={isDark ? 'text-gold-300' : 'text-gold-600'} />
              </motion.span>
            </span>
            <span className="font-semibold text-sm leading-tight">View All<br /><span className={`text-xs font-normal ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}>114 Surahs</span></span>
          </button>
        </div>

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

        {/* ── full surah index (cream panel) ── */}
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
