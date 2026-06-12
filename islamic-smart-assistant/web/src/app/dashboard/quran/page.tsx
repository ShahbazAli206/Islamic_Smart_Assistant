'use client';

// Quran reader page: curated quick-pick surahs, the audio/translation player,
// and a searchable index of all 114 surahs. Selected surah + reciter +
// translation are held in local state and handed down to <QuranPlayer />.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, BookOpenCheck } from 'lucide-react';
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
  { number: 67, label: 'Al-Mulk',    tag: 'Before sleep' },
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
  // useLocalStorage returns its default ('ur') on first render and reads the
  // real value a tick later, so this effect re-runs to sync the translation.
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  useEffect(() => {
    setTranslation(langToTranslation(language));
  }, [language]);

  // Filter the full surah list by the search box. Matches English name,
  // English meaning, the Arabic name, or an exact surah-number match.
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

  return (
    <div className="space-y-6">
      {/* page header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="chip-gold mb-2"><Sparkles size={12}/> Holy Quran</p>
          <h1 className="h-display text-4xl font-bold">The Noble Quran</h1>
          <p className="text-ink/60 mt-1">All 114 Surahs · 7 world-class reciters · Arabic + Urdu/English translation</p>
        </div>
        <span className="chip"><BookOpenCheck size={14}/> Streaming from verified islamic.network CDN</span>
      </div>

      {/* quick picks */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_PICKS.map((p, i) => (
          <motion.button
            key={p.number}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => setSurah(p.number)}
            className={`card card-pad text-left transition ${surah === p.number ? 'ring-2 ring-emerald-500 shadow-glow-emerald' : ''}`}
          >
            <p className="text-xs text-ink/55">Surah {p.number}</p>
            <p className="font-display font-bold text-lg">{p.label}</p>
            <p className="text-xs text-emerald-700 mt-1">{p.tag}</p>
          </motion.button>
        ))}
      </div>

      {/* player */}
      <QuranPlayer
        surahNumber={surah}
        reciter={reciter}
        translation={translation}
        translationMode={translationMode}
        onReciterChange={setReciter}
        onTranslationChange={setTranslation}
        onTranslationModeChange={setTranslationMode}
      />

      {/* full surah index */}
      <div className="card">
        <div className="p-5 flex items-center justify-between gap-3 border-b border-emerald-900/5">
          <div>
            <h3 className="font-bold">All Surahs</h3>
            <p className="text-xs text-ink/55">{filtered.length} of {SURAHS.length}</p>
          </div>
          <label className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or number…"
              className="pl-9 pr-3 py-2 rounded-lg border border-emerald-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-64"
            />
          </label>
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0">
          {filtered.map((s) => {
            const active = s.number === surah;
            return (
              <li key={s.number}>
                <button
                  onClick={() => setSurah(s.number)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-emerald-50/60 transition text-left
                              ${active ? 'bg-emerald-50/80' : ''}`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold
                                    ${active ? 'bg-gold-gradient text-midnight-900' : 'bg-emerald-100 text-emerald-800'}`}>
                    {s.number}
                  </span>
                  <span className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.englishName}</p>
                    <p className="text-xs text-ink/55 truncate">{s.englishTranslation} · {s.ayahs} ayahs · {s.revelation}</p>
                  </span>
                  <span className="font-arabic text-2xl text-emerald-800 shrink-0">{s.arabic}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
