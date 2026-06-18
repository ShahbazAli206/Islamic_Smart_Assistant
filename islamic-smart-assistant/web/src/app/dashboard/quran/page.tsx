'use client';

// Quran reader page: curated quick-pick surahs, the audio/translation player,
// and a searchable index of all 114 surahs. Selected surah + reciter +
// translation are held in local state and handed down to <QuranPlayer />.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, BookOpenCheck, BookOpen } from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { QuranPlayer } from '@/components/QuranPlayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { langToTranslation, type ReciterId, type TranslationId } from '@/lib/quran';

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

/** Quran reader: quick picks, player, and a searchable full surah index. */
export default function QuranPage() {
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
    <div className="-m-5 sm:-m-8 min-h-full text-parchment"
      style={{ background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' }}>

      {/* ── header banner: mosque photo + title + CDN pill ── */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <img src="/quran-bg.png" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(8,22,15,0.94) 0%, rgba(8,22,15,0.7) 42%, rgba(8,22,15,0.45) 66%, rgba(8,22,15,0.2) 100%)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08160F]" />
          {/* twinkling stars over the sky */}
          {[
            { r: 360, t: 30, s: 2 }, { r: 280, t: 60, s: 1.5 }, { r: 200, t: 26, s: 1.6 }, { r: 150, t: 70, s: 1.3 },
          ].map((st, i) => (
            <motion.span key={i} className="absolute rounded-full hidden lg:block"
              style={{ right: st.r, top: st.t, width: st.s, height: st.s, background: '#E9CF7A' }}
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <div className="relative px-6 sm:px-10 pt-8 pb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur">
              <Sparkles size={12} /> Holy Quran
            </span>
            <h1 className="mt-4 font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.02] text-parchment">
              The Noble Quran
            </h1>
            <p className="mt-3 text-parchment/70 leading-relaxed">
              All 114 Surahs · 7 world-class reciters · Arabic + Urdu/English translation
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-parchment/85 backdrop-blur">
            <motion.span className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
            <BookOpenCheck size={14} className="text-gold-300" /> Streaming from verified CDN
          </span>
        </div>
      </header>

      <div className="px-6 sm:px-10 pb-10 space-y-6">

        {/* ── quick picks ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {QUICK_PICKS.map((p, i) => {
            const active = surah === p.number;
            return (
              <motion.button
                key={p.number}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSurah(p.number)}
                className={`relative overflow-hidden rounded-2xl p-4 text-center transition border-2
                  ${active
                    ? 'border-gold-400 text-parchment shadow-glow-gold'
                    : 'border-black/5 bg-[#F3EFDF] text-ink hover:border-gold-300/60'}`}
                style={active ? { background: 'linear-gradient(160deg,#103024 0%,#0B2017 100%)' } : undefined}
              >
                {/* ornate number badge */}
                <span className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2
                  ${active ? 'border-gold-300/70 text-gold-200' : 'border-gold-500/40 text-gold-700'}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border font-display font-bold text-base ${active ? 'border-gold-300/40' : 'border-gold-500/30'}`}>
                    {p.number}
                  </span>
                </span>
                <p className={`text-[11px] ${active ? 'text-parchment/60' : 'text-ink/50'}`}>Surah {p.number}</p>
                <p className={`font-display font-bold text-lg leading-tight ${active ? 'text-gold-200' : 'text-ink'}`}>{p.label}</p>
                <p className={`text-[11px] mt-0.5 ${active ? 'text-parchment/55' : 'text-emerald-700'}`}>{p.tag}</p>
              </motion.button>
            );
          })}

          {/* View All card — expands the index and scrolls to it */}
          <button
            onClick={() => {
              setShowAll(true);
              requestAnimationFrame(() => document.getElementById('all-surahs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            }}
            className="rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-2 p-4 text-center text-parchment hover:border-gold-300/50 transition"
            style={{ background: 'linear-gradient(160deg,#0F2A1C 0%,#091510 100%)' }}
          >
            <BookOpen size={26} className="text-gold-300" />
            <span className="text-sm font-semibold leading-tight">View All<br /><span className="text-parchment/60 text-xs">114 Surahs</span></span>
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
              <button
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-mosque-gradient text-parchment px-6 py-3 text-sm font-semibold shadow-lg hover:brightness-110 transition"
              >
                <BookOpen size={16} className="text-gold-300" /> {showAll ? 'Show fewer Surahs' : 'Browse All 114 Surahs'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
