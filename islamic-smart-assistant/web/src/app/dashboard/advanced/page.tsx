'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked, BookOpen, Search, Calculator, X, ChevronDown, ChevronRight, ChevronLeft,
  Filter, Globe, Star, AlertCircle, Loader2, Library, Heart, Scale,
  Moon, Sparkles, Hash, CheckCircle2, Info, Languages, RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { DUAS, DUA_GROUP_LABELS, type Dua, type DuaGroup, type DuaSection } from '@/lib/duas-data';
import { HADEES_BOOKS, HADEES_CDN } from '@/lib/hadees-books';

// ── Flower SVG (same pattern as other pages) ────────────────────────────────
function Flower({ size = 18, color = '#f9a8d4' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <g fill={color} opacity="0.9">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="12" cy="6" rx="3" ry="5.2" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2.6" fill="#F6D67A" />
    </svg>
  );
}

// ── Tab definition ───────────────────────────────────────────────────────────
type Tab = 'duas' | 'hadees' | 'masail' | 'calculators';
const TABS: { id: Tab; label: string; icon: typeof BookMarked; color: string }[] = [
  { id: 'duas',        label: 'Duas & Supplications', icon: Heart,      color: 'text-rose-500' },
  { id: 'hadees',      label: 'Hadees Library',        icon: BookOpen,   color: 'text-emerald-600' },
  { id: 'masail',      label: 'Islamic Masail',         icon: Scale,      color: 'text-amber-600' },
  { id: 'calculators', label: 'Islamic Calculators',    icon: Calculator, color: 'text-violet-600' },
];

// ═══════════════════════════════════════════════════════════════════════════
// DUAS SECTION
// ═══════════════════════════════════════════════════════════════════════════
function getDuaSection(d: Dua): DuaSection {
  return d.group === 'ramadan' ? 'ramadan' : 'masnoon';
}

function DuasSection({ isDark }: { isDark: boolean }) {
  const [activeSection, setActiveSection] = useState<DuaSection>('masnoon');
  const [selectedDua, setSelectedDua] = useState<Dua | null>(null);
  const [search, setSearch] = useState('');

  const ramadanCount = useMemo(() => DUAS.filter((d) => getDuaSection(d) === 'ramadan').length, []);
  const masnoonCount = useMemo(() => DUAS.filter((d) => getDuaSection(d) === 'masnoon').length, []);

  const listDuas = useMemo(() => {
    const base = DUAS.filter((d) => getDuaSection(d) === activeSection);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.english.toLowerCase().includes(q) ||
      d.tags?.some((t) => t.includes(q)),
    );
  }, [activeSection, search]);

  const panel = isDark
    ? { background: 'rgba(8,22,15,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.18)' }
    : { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.25)' };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Sidebar */}
      <div className="lg:w-72 shrink-0 flex flex-col gap-3">
        {/* Section tabs */}
        <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-neutral-100'}`}>
          {([['ramadan', '🌙', 'Ramadan', ramadanCount], ['masnoon', '📿', 'Masnoon', masnoonCount]] as const).map(([sec, icon, label, count]) => (
            <button key={sec}
              onClick={() => { setActiveSection(sec); setSelectedDua(null); setSearch(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition ${activeSection === sec ? 'bg-emerald-600 text-white shadow-sm' : isDark ? 'text-parchment/70 hover:text-parchment' : 'text-neutral-600 hover:text-neutral-800'}`}>
              <span>{icon}</span>
              <span>{label}</span>
              <span className={`text-xs ${activeSection === sec ? 'opacity-70' : 'text-emerald-500'}`}>({count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search duas..."
            className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${isDark ? 'bg-white/[0.06] border border-white/10 text-parchment placeholder:text-parchment/40' : 'bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-400'}`}
          />
        </div>

        {/* Flat scrollable list */}
        <div className="overflow-y-auto max-h-[55vh] lg:max-h-[calc(100vh-340px)] space-y-0.5 pr-0.5">
          {listDuas.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`}>No duas found</p>
          ) : listDuas.map((dua, i) => (
            <button key={dua.id}
              onClick={() => setSelectedDua(dua)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-start gap-2 ${selectedDua?.id === dua.id ? 'bg-emerald-600 text-white' : isDark ? 'text-parchment/80 hover:bg-white/[0.06]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
              <span className={`shrink-0 text-xs font-mono w-5 pt-0.5 text-right ${selectedDua?.id === dua.id ? 'text-white/60' : isDark ? 'text-parchment/30' : 'text-neutral-400'}`}>{i + 1}</span>
              <span className="leading-snug">{dua.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0">
        {selectedDua ? (
          <motion.div key={selectedDua.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6" style={panel}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-emerald-700/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                  {DUA_GROUP_LABELS[selectedDua.group]}
                </span>
                <h3 className={`mt-2 font-display font-bold text-xl ${isDark ? 'text-white' : 'text-emerald-950'}`}>{selectedDua.title}</h3>
              </div>
              <button onClick={() => setSelectedDua(null)}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-parchment/60' : 'hover:bg-neutral-100 text-neutral-400'}`}>
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl p-5 mb-4 text-right" style={{ background: isDark ? 'rgba(233,207,122,0.06)' : 'rgba(233,207,122,0.12)', border: '1px solid rgba(233,207,122,0.2)' }}>
              <p className={`font-arabic text-2xl lg:text-3xl leading-[2.1] ${isDark ? 'text-[#E9CF7A]' : 'text-emerald-950'}`} dir="rtl">
                {selectedDua.arabic}
              </p>
            </div>

            <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-white/[0.04]' : 'bg-neutral-50'}`}>
              <p className={`text-sm font-medium italic ${isDark ? 'text-parchment/70' : 'text-neutral-500'}`}>{selectedDua.transliteration}</p>
            </div>

            <p className={`text-base leading-relaxed ${isDark ? 'text-parchment/90' : 'text-neutral-700'}`}>
              &ldquo;{selectedDua.english}&rdquo;
            </p>

            <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-gold-300/80' : 'text-amber-700'}`}>
              <BookMarked size={13} />
              <span>{selectedDua.reference}</span>
            </div>

            {selectedDua.tags && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedDua.tags.map((t) => (
                  <span key={t} className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-white/[0.07] text-parchment/55' : 'bg-neutral-100 text-neutral-500'}`}>{t}</span>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`}>
            <Heart size={40} className="mb-4 opacity-30" />
            <p className="font-semibold text-lg mb-1">Select a Dua</p>
            <p className="text-sm">Choose any dua from the list on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HADEES SECTION
// ═══════════════════════════════════════════════════════════════════════════
interface HadithItem { hadithnumber: number; text: string; }
interface ChapterItem { chapterno: number; chaptername: string; }

function HadeesSection({ isDark }: { isDark: boolean }) {
  const [selectedBook, setSelectedBook] = useState(HADEES_BOOKS[0]);
  const [selectedLang, setSelectedLang] = useState(HADEES_BOOKS[0].languages.find((l) => l.code === 'eng') ?? HADEES_BOOKS[0].languages[0]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [hadiths, setHadiths] = useState<HadithItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingHadiths, setLoadingHadiths] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'sehah-sittah' | 'other' | 'all'>('all');
  const [expandedHadith, setExpandedHadith] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const books = useMemo(() =>
    filterCategory === 'all' ? HADEES_BOOKS : HADEES_BOOKS.filter((b) => b.category === filterCategory),
    [filterCategory],
  );

  const selectBook = (book: typeof HADEES_BOOKS[0]) => {
    setSelectedBook(book);
    const defaultLang = book.languages.find((l) => l.code === 'eng') ?? book.languages[0];
    setSelectedLang(defaultLang);
    setChapters([]);
    setHadiths([]);
    setSelectedChapter(1);
    setError(null);
    setPage(0);
  };

  const selectLang = (lang: typeof selectedLang) => {
    setSelectedLang(lang);
    setHadiths([]);
    setError(null);
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingChapters(true);
    setError(null);
    const engEdition = selectedBook.languages.find((l) => l.code === 'eng')?.edition ?? selectedBook.languages[0].edition;
    fetch(`${HADEES_CDN}/${engEdition}/chapters.min.json`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          // Some editions return {chapters: [{chapterno, chaptername},...]}
          // Others return {metadata: {section: {"1": "Name", ...}}}
          if (Array.isArray(data?.chapters) && data.chapters.length > 0) {
            setChapters(data.chapters);
          } else {
            const section: Record<string, string> = data?.metadata?.section ?? data?.section ?? {};
            const parsed: ChapterItem[] = Object.entries(section)
              .map(([no, name]) => ({ chapterno: Number(no), chaptername: String(name) }))
              .sort((a, b) => a.chapterno - b.chapterno);
            setChapters(parsed.length > 0 ? parsed : []);
          }
        }
      })
      .catch(() => { if (!cancelled) setChapters([]); })
      .finally(() => { if (!cancelled) setLoadingChapters(false); });
    return () => { cancelled = true; };
  }, [selectedBook]);

  useEffect(() => {
    if (!selectedChapter) return;
    let cancelled = false;
    setLoadingHadiths(true);
    setError(null);
    setHadiths([]);
    // Correct path: /chapters/{chapterNo}.min.json — NOT /{chapterNo}.min.json
    // (/{n}.min.json fetches a single hadith by global number, not a chapter)
    fetch(`${HADEES_CDN}/${selectedLang.edition}/chapters/${selectedChapter}.min.json`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const raw = data?.hadiths ?? data ?? [];
          setHadiths(Array.isArray(raw) ? raw : []);
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load hadiths. Please try again.'); })
      .finally(() => { if (!cancelled) setLoadingHadiths(false); });
    return () => { cancelled = true; };
  }, [selectedBook, selectedLang, selectedChapter]);

  const filteredHadiths = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hadiths;
    return hadiths.filter((h) => h.text?.toLowerCase().includes(q) || String(h.hadithnumber).includes(q));
  }, [hadiths, search]);

  useEffect(() => { setPage(0); setExpandedHadith(null); }, [filteredHadiths]);

  const totalPages = Math.ceil(filteredHadiths.length / PAGE_SIZE);
  const pageHadiths = filteredHadiths.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const chapterIdx = chapters.findIndex((c) => c.chapterno === selectedChapter);
  const prevChapter = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const nextChapter = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;

  const panel = isDark
    ? { background: 'rgba(8,22,15,0.78)', border: '1px solid rgba(233,207,122,0.18)' }
    : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(16,185,129,0.12)' };

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold ${isDark ? 'text-parchment/60' : 'text-neutral-500'}`}>Show:</span>
        {([['all', 'All Books'], ['sehah-sittah', 'Sehah-e-Sittah'], ['other', 'Other Books']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilterCategory(v as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${filterCategory === v ? 'bg-emerald-600 border-emerald-600 text-white' : isDark ? 'border-white/15 text-parchment/70 hover:bg-white/[0.07]' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Book selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {books.map((book) => (
          <motion.button key={book.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => selectBook(book)}
            className={`text-left p-4 rounded-2xl border-2 transition ${selectedBook.id === book.id ? 'border-emerald-500 bg-emerald-600/10' : isDark ? 'border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.04]' : 'border-neutral-100 hover:border-emerald-200 bg-white shadow-sm'}`}>
            <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-2 ${book.category === 'sehah-sittah' ? isDark ? 'bg-gold-300/15 text-gold-300' : 'bg-amber-100 text-amber-700' : isDark ? 'bg-emerald-700/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
              {book.category === 'sehah-sittah' ? 'Sehah-e-Sittah' : 'Popular Book'}
            </div>
            <p className={`font-display font-bold text-sm leading-tight mb-0.5 ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{book.name}</p>
            <p className={`font-arabic text-base ${isDark ? 'text-[#E9CF7A]/70' : 'text-emerald-700'}`}>{book.arabicName}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-parchment/50' : 'text-neutral-500'}`}>{book.totalHadiths.toLocaleString()} hadiths · {book.languages.length} languages</p>
          </motion.button>
        ))}
      </div>

      {/* Selected book detail + language + chapter */}
      <div className="rounded-2xl p-5 space-y-4" style={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>{selectedBook.name}</h3>
            <p className={`text-sm ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>{selectedBook.author}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-parchment/50' : 'text-neutral-500'}`}>{selectedBook.description}</p>
          </div>
          <div className={`text-right ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>
            <p className="font-arabic text-xl">{selectedBook.arabicName}</p>
            <p className="font-arabic text-sm mt-0.5">{selectedBook.authorArabic}</p>
          </div>
        </div>

        {/* Language selector */}
        <div>
          <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-parchment/60' : 'text-neutral-500'}`}>
            <Languages size={13} /> Translation Language ({selectedBook.languages.length} available)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedBook.languages.map((lang) => (
              <button key={lang.code} onClick={() => selectLang(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selectedLang.code === lang.code ? 'bg-emerald-600 border-emerald-600 text-white' : isDark ? 'border-white/15 text-parchment/70 hover:bg-white/[0.07]' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
                {lang.native} ({lang.label})
              </button>
            ))}
          </div>
        </div>

        {/* Chapter selector */}
        {loadingChapters ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500"><Loader2 size={16} className="animate-spin" /> Loading chapters…</div>
        ) : chapters.length > 0 ? (
          <div>
            <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-parchment/60' : 'text-neutral-500'}`}>
              <Filter size={13} /> Chapter / Book
              <span className={`ml-auto text-xs font-normal ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`}>
                {chapterIdx + 1} / {chapters.length}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => prevChapter && setSelectedChapter(prevChapter.chapterno)}
                disabled={!prevChapter}
                className={`shrink-0 p-2 rounded-xl border transition ${!prevChapter ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-600/10'} ${isDark ? 'border-white/10 text-parchment/70' : 'border-neutral-200 text-neutral-600'}`}>
                <ChevronLeft size={15} />
              </button>
              <div className="relative flex-1">
                <select value={selectedChapter} onChange={(e) => setSelectedChapter(Number(e.target.value))}
                  className={`w-full appearance-none px-3 py-2.5 pr-8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${isDark ? 'bg-white/[0.06] border border-white/10 text-parchment' : 'bg-white border border-neutral-200 text-neutral-800'}`}>
                  {chapters.map((c) => (
                    <option key={c.chapterno} value={c.chapterno}>
                      {c.chapterno}. {c.chaptername}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-parchment/50' : 'text-neutral-400'}`} />
              </div>
              <button
                onClick={() => nextChapter && setSelectedChapter(nextChapter.chapterno)}
                disabled={!nextChapter}
                className={`shrink-0 p-2 rounded-xl border transition ${!nextChapter ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-600/10'} ${isDark ? 'border-white/10 text-parchment/70' : 'border-neutral-200 text-neutral-600'}`}>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search within chapter…"
          className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${isDark ? 'bg-white/[0.06] border border-white/10 text-parchment placeholder:text-parchment/40' : 'bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-400'}`} />
      </div>

      {/* Hadith list */}
      {loadingHadiths ? (
        <div className="flex items-center justify-center py-16 gap-3 text-emerald-500">
          <Loader2 size={22} className="animate-spin" />
          <span>Loading hadiths…</span>
        </div>
      ) : error ? (
        <div className={`flex items-center gap-2 p-4 rounded-xl text-sm ${isDark ? 'bg-rose-900/20 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>
          <AlertCircle size={16} />{error}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHadiths.length === 0 && !loadingHadiths && (
            <p className={`text-center py-10 text-sm ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`}>No hadiths found.</p>
          )}
          {/* page count row */}
          {filteredHadiths.length > 0 && (
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-parchment/50' : 'text-neutral-500'}`}>
              <span>Hadiths {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredHadiths.length)} of {filteredHadiths.length}</span>
              {search && <span>{filteredHadiths.length} results for &ldquo;{search}&rdquo;</span>}
            </div>
          )}
          {pageHadiths.map((h) => (
            <motion.div key={h.hadithnumber} layout
              className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-neutral-100 bg-white shadow-sm'}`}>
              <button className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setExpandedHadith(expandedHadith === h.hadithnumber ? null : h.hadithnumber)}>
                <span className={`mt-0.5 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${isDark ? 'bg-emerald-700/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                  {h.hadithnumber}
                </span>
                <p className={`flex-1 text-sm leading-relaxed ${isDark ? 'text-parchment/85' : 'text-neutral-700'} ${expandedHadith === h.hadithnumber ? '' : 'line-clamp-3'}`}>
                  {h.text}
                </p>
                <ChevronDown size={16} className={`shrink-0 mt-1 transition-transform ${isDark ? 'text-parchment/40' : 'text-neutral-400'} ${expandedHadith === h.hadithnumber ? 'rotate-180' : ''}`} />
              </button>
              {expandedHadith === h.hadithnumber && (
                <div className={`px-4 pb-3 pt-0 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-50'}`}>
                  <span className={`text-xs font-semibold ${isDark ? 'text-gold-300/70' : 'text-amber-700'}`}>
                    {selectedBook.name} — Hadith #{h.hadithnumber}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => { setPage((p) => p - 1); setExpandedHadith(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${page === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-600/10'} ${isDark ? 'border-white/10 text-parchment/80' : 'border-neutral-200 text-neutral-700'}`}>
                <ChevronLeft size={15} /> Previous
              </button>
              <span className={`text-xs font-semibold ${isDark ? 'text-parchment/50' : 'text-neutral-500'}`}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => { setPage((p) => p + 1); setExpandedHadith(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page >= totalPages - 1}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${page >= totalPages - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-600/10'} ${isDark ? 'border-white/10 text-parchment/80' : 'border-neutral-200 text-neutral-700'}`}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MASAIL SECTION
// ═══════════════════════════════════════════════════════════════════════════
interface MasailTopic {
  id: string;
  title: string;
  arabicTitle: string;
  icon: string;
  source: string;
  items: { q: string; a: string }[];
}

const MASAIL_TOPICS: MasailTopic[] = [
  {
    id: 'wudu',
    title: 'Wuzu (Ablution)',
    arabicTitle: 'الوضوء',
    icon: '💧',
    source: 'Darul Uloom Deoband / Fatawa-e-Alamgiri',
    items: [
      { q: 'What are the Fardh (obligatory) acts of Wuzu?', a: 'There are 4 Fardh in Wuzu: (1) Washing the face once, from the top of the forehead to the chin and from earlobe to earlobe. (2) Washing both arms including elbows once. (3) Doing Masah (wiping) of one-quarter of the head once. (4) Washing both feet including the ankles once. (Quran 5:6, Fatawa-e-Alamgiri)' },
      { q: 'What are the Sunan of Wuzu?', a: 'Key Sunan include: Beginning with Bismillah, washing hands 3 times before starting, doing Miswak (if available), rinsing the mouth (Maddmaddah) 3 times, rinsing the nostrils (Istinshaq) 3 times, making Masah of the entire head once, making Masah of both ears, washing each part 3 times, performing acts in order (Tartib), and maintaining continuity (Muwaalat).' },
      { q: 'What breaks Wuzu?', a: 'Wuzu is broken by: (1) Any discharge from the private parts (urine, stool, wind, pre-sexual fluid). (2) Loss of consciousness through sleep or fainting. (3) Flowing of blood or pus from any wound. (4) Vomiting a mouthful. (5) Touching the private parts without a barrier (according to some scholars). (Fatawa-e-Darul Uloom Deoband)' },
      { q: 'Is Wuzu valid without intention (niyyah)?', a: 'According to the Hanafi madhab, niyyah (intention) is Sunnah for Wuzu but not Fardh. Wuzu is valid without intention, but one does not receive the full reward. This differs from the Shafi\'i and Maliki schools who consider niyyah Fardh. (Al-Hidayah, Imam Marginani)' },
      { q: 'What is the ruling on using Wuzu water from a tap?', a: 'Modern tap water is pure (Tahir) and can be used for Wuzu and Ghusl, provided it is clean and has not changed in smell, colour or taste due to impurity. Flowing running water has the same ruling as a large body of water. (Contemporary Fatawa from Darul Uloom Deoband)' },
    ],
  },
  {
    id: 'ghusl',
    title: 'Ghusl (Bath)',
    arabicTitle: 'الغسل',
    icon: '🚿',
    source: 'Fatawa-e-Alamgiri / Bahar-e-Shariat',
    items: [
      { q: 'What are the Fardh acts of Ghusl?', a: 'There are 3 Fardh in Ghusl: (1) Gargling the mouth — water must reach all parts of the mouth including the molars and gums. (2) Cleaning the nostrils — water must reach the soft part of the nose. (3) Washing the entire body — every hair, every skin fold must be reached by water. Even a nail-breadth area left dry invalidates Ghusl. (Fatawa-e-Alamgiri, Vol 1)' },
      { q: 'When does Ghusl become Wajib (obligatory)?', a: 'Ghusl becomes Wajib upon: (1) Ejaculation (Inzal) — whether during intercourse, sleep (wet dream) or otherwise. (2) Sexual intercourse (even if ejaculation does not occur). (3) Completion of menstruation (Haydh). (4) Postnatal bleeding (Nifaas) ending. (5) Embracing Islam. (Quran 4:43, 5:6; Bukhari, Muslim)' },
      { q: 'What is the Sunnah method of Ghusl?', a: 'Sunnah Ghusl method: (1) Make niyyah. (2) Say Bismillah. (3) Wash hands 3 times. (4) Wash private parts. (5) Perform complete Wuzu (without washing feet — leave for the end). (6) Pour water over the right shoulder 3 times, then left, then entire body. (7) Make sure water reaches every body part. (8) Wash feet. (Bukhari 248, Muslim 316)' },
      { q: 'Is it permissible to perform Ghusl under a shower?', a: 'Yes, it is permissible to perform Ghusl under a shower as long as the 3 Fardh are fulfilled: water reaches the mouth (gargle), the nostrils, and the entire body. One should ensure water reaches every part of the body including between the fingers and toes, the navel, and areas under folds of skin. (Fatawa-e-Darul Uloom Deoband)' },
    ],
  },
  {
    id: 'tayammum',
    title: 'Tayammum',
    arabicTitle: 'التيمم',
    icon: '🏜️',
    source: 'Fatawa-e-Alamgiri / Hidayah',
    items: [
      { q: 'When is Tayammum permissible?', a: 'Tayammum is permitted when: (1) Water is not available within one mile (approximately 1.6 km) and is not expected to be found. (2) One is ill and using water would worsen the illness or significantly delay recovery. (3) The water is so cold it may cause harm and no means of heating exists. (4) Water is available but one fears an enemy, thirst, or a dangerous animal near the water. (Quran 4:43, 5:6; Fatawa-e-Alamgiri)' },
      { q: 'What is the method of performing Tayammum?', a: 'Method: (1) Make niyyah (intention). (2) Say Bismillah. (3) Strike clean earth (or anything from the earth — sand, stone, clay) with both palms simultaneously. (4) Blow off excess dust and wipe the entire face once. (5) Strike the earth again, wipe the right arm including elbow with the left hand, then the left arm with the right hand. Note: According to some narrations, both strikes can be done together. (Abu Dawood 322, Bukhari 336)' },
      { q: 'What invalidates Tayammum?', a: 'Tayammum is invalidated by: (1) Everything that invalidates Wuzu. (2) Finding water (if the Tayammum was due to absence of water). (3) Recovering from illness (if Tayammum was due to illness). (4) The start of the prayer time ends (there is scholarly difference on this). Tayammum is a temporary purification and one must perform Wuzu or Ghusl when the reason for Tayammum is removed. (Al-Hidayah)' },
    ],
  },
  {
    id: 'salah',
    title: 'Salah (Prayer)',
    arabicTitle: 'الصلاة',
    icon: '🕌',
    source: 'Fatawa-e-Alamgiri / Darul Uloom Deoband',
    items: [
      { q: 'What are the conditions (Shurut) for Salah to be valid?', a: 'Conditions include: (1) Being Muslim. (2) Being sane and of mature age. (3) Having Wuzu or Ghusl (Taharah). (4) Body, clothes and place of prayer being clean (Tahir). (5) Covering the Awrah — for men: navel to knee; for women: entire body except face, hands and feet. (6) Facing the Qibla. (7) Entering the prayer time. (8) Making niyyah.' },
      { q: 'What are the Fardh acts within Salah?', a: 'Six Fardh: (1) Takbeer-e-Tahreema (opening Allahu Akbar). (2) Qiyam (standing when able). (3) Qiraat (reciting Quran in the first two rak\'ahs). (4) Ruku (bowing). (5) Sujood (two prostrations per rak\'ah). (6) Final sitting (Qa\'dah Akhirah) for the duration of Tashahhud. (Fatawa-e-Alamgiri, Kitab as-Salah)' },
      { q: 'What are the Wajibaat of Salah?', a: 'Wajibaat include: Reciting Al-Fatihah in every rak\'ah; adding a Surah after Al-Fatihah in the first two rak\'ahs of Fardh (and in Witr and Nafl); saying Allahu Akbar for going into Ruku and Sujood; saying Sami Allahu Liman Hamidah; saying Subhana Rabbiyal Azim in Ruku (minimum once); Subhana Rabbiyal A\'la in Sujood; Qa\'dah Ula in 3 or 4 rak\'ah prayers; reciting Tashahhud in Qa\'dah; performing the Witr prayer.' },
      { q: 'What invalidates Salah?', a: 'Salah is invalidated by: (1) Speaking (even a word). (2) Laughing (if heard by others). (3) Eating or drinking. (4) Wuzu breaking. (5) Turning away from Qibla without necessity. (6) Adding an extra Fardh act (extra Ruku or Sujood). (7) Making major errors in recitation that change meaning. (8) Showing one\'s Awrah. (Fatawa-e-Alamgiri)' },
      { q: 'Can women pray in congregation?', a: 'According to the Hanafi school, it is Makruh Tahreemi (highly disliked, approaching prohibited) for women to pray in a mixed congregation with men (outside of Hajj). However, women may pray in their own congregation with a female Imam. Prayers at home are superior for women in terms of reward. This ruling comes from multiple hadiths and is the standard Hanafi fatwa from Darul Uloom Deoband.' },
    ],
  },
  {
    id: 'nikah',
    title: 'Nikah (Marriage)',
    arabicTitle: 'النكاح',
    icon: '💍',
    source: 'Banuri Town / Darul Uloom Deoband',
    items: [
      { q: 'What are the conditions for a valid Nikah?', a: 'A Nikah is valid when: (1) Both parties are Muslim (or as applicable by fiqh). (2) The bride and groom are clearly identified. (3) Iyab (proposal) and Qubool (acceptance) are uttered in the same sitting. (4) Two adult Muslim male witnesses are present (or one male and two female witnesses). (5) Mahr (dowry) is fixed (even if not paid immediately). (6) The wali (guardian) consents — especially important for a virgin girl according to the Hanafi school though her consent is essential.' },
      { q: 'Is a Nikah without a wali (guardian) valid in the Hanafi school?', a: 'According to the majority Hanafi position (and this is the fatwa of Darul Uloom Deoband), an adult sane woman can perform her own Nikah without a wali in terms of legal validity. However, it is Makruh to do so without her guardian\'s consent. The Shafi\'i, Maliki and Hanbali schools require the wali. Girls should involve their families for barakah and proper Islamic practice.' },
      { q: 'What is the minimum Mahr?', a: 'According to the Hanafi school, the minimum Mahr is 10 dirhams (equivalent to approximately 30.618g of silver). There is no maximum limit. The Mahr is the exclusive right of the wife. The husband may not deduct expenses from it. Mahr-e-Fatimi (the amount given to Hazrat Fatimah RA) was 400-500 dirhams and is Mustahab to give.' },
      { q: 'What is the ruling on Nikah Mut\'ah (temporary marriage)?', a: 'Nikah Mut\'ah is strictly Haram (forbidden) in the Sunni (Hanafi, Maliki, Shafi\'i, Hanbali) schools. It was prohibited by the Prophet Muhammad ﷺ himself at the battle of Khaybar and the prohibition is confirmed. It is only practised by certain Shia groups. Any such marriage is invalid and amounts to Zina. (Bukhari 5115, Muslim 1406)' },
    ],
  },
  {
    id: 'talaq',
    title: 'Talaq (Divorce)',
    arabicTitle: 'الطلاق',
    icon: '⚖️',
    source: 'Banuri Town / Darul Uloom Deoband',
    items: [
      { q: 'What are the types of Talaq?', a: 'Main types: (1) Talaq-e-Raj\'i (Revocable): First or second Talaq where the husband can take the wife back during Iddah without a new Nikah. (2) Talaq-e-Ba\'in (Irrevocable): Third Talaq, or Talaq given in lieu of payment (Khul\'). Requires new Nikah to reunite. (3) Talaq-e-Mughallazah: Three Talaqs — the wife becomes Haram. Remarriage only possible after Halala (she marries, consummates and then that marriage ends naturally). (Quran 2:229-230; Fatawa-e-Alamgiri)' },
      { q: 'Is three Talaqs in one sitting counted as three?', a: 'This is a matter of major scholarly difference. The Hanafi school (and the position of Darul Uloom Deoband, Banuri Town) holds that if a man gives three Talaqs in one sitting, all three are valid and the Mughallazah (complete) Talaq takes effect. Remarriage requires Halala. This is based on the decision of Hazrat Umar (RA) and the majority of classical scholars. (Fatawa-e-Deoband 2/154)' },
      { q: 'What is Khul\' (divorce initiated by the wife)?', a: 'Khul\' is when a wife requests separation from her husband, usually by returning her Mahr. It is irrevocable (Ba\'in). The husband must agree for it to be valid in the Hanafi school. If he refuses, the wife can go to a Qadhi (Islamic judge) or arbitration panel for them to dissolve the marriage. The wife does not need to prove fault in Khul\'.' },
      { q: 'What is the Iddah period after Talaq?', a: 'For a woman whose marriage was consummated: (1) If she has menstrual cycles: 3 complete menstrual cycles. (2) If post-menopausal: 3 months. (3) If pregnant: until delivery. During Iddah, the wife stays in the husband\'s home (Talaq-e-Raj\'i), the husband is obligated to maintain her, and Rajat (taking back) is possible. (Quran 65:1-4; Fatawa-e-Alamgiri)' },
    ],
  },
  {
    id: 'warasat',
    title: 'Warasat (Inheritance)',
    arabicTitle: 'الميراث',
    icon: '📜',
    source: 'Quran 4:11-12 / Fatawa-e-Alamgiri',
    items: [
      { q: 'What are the fixed shares in Islamic inheritance?', a: '6 fixed shares mentioned in Quran 4:11-12: (1) 1/2 — husband (if no child); daughter (if only one); uterine sister (if only one). (2) 1/4 — husband (with child); wife (if no child). (3) 1/8 — wife (with child). (4) 2/3 — two or more daughters; two or more full sisters. (5) 1/3 — mother (if no child or two+ siblings); uterine siblings (if two or more). (6) 1/6 — father (with son); mother (with child); grandfather; grandmother.' },
      { q: 'What is the son\'s share compared to daughter\'s?', a: 'A son receives double the share of a daughter (Quran 4:11: "for the male the equivalent of the share of two females"). This is because the son bears financial obligations — he must provide Nafaqah (maintenance) for his wife and family. The daughter is not financially obligated. The apparent "inequality" is actually equity when all financial duties are considered.' },
      { q: 'Who is excluded from inheritance?', a: 'A person is excluded from inheritance (Mahrum) if: (1) They are a non-Muslim (Muslim does not inherit from non-Muslim and vice versa). (2) They murdered the deceased. (3) They were born of Zina (illegitimate). Note: An adopted child does not inherit — only biological relatives inherit. However, a gift (wasiyyah) can be given, up to 1/3 of the estate, to non-heirs.' },
      { q: 'What is the wife\'s share in the husband\'s property?', a: 'If husband dies without children: wife gets 1/4. If he leaves children (from any wife): wife gets 1/8. If there are multiple wives: they share the 1/4 or 1/8 equally. The wife also keeps her own property, Mahr and any gifts she received. The husband\'s debts and funeral expenses are paid first, then bequests (up to 1/3), then the remainder is divided. (Quran 4:12)' },
    ],
  },
  {
    id: 'zakat',
    title: 'Zakat',
    arabicTitle: 'الزكاة',
    icon: '🌙',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'Who is Zakat obligatory (Fardh) upon?', a: 'Zakat is Fardh on every adult (baligh), sane Muslim who possesses the Nisab for a complete lunar year (Hawl). The person must be free (not in debt that reduces their wealth below Nisab) and the wealth must be in excess of basic needs.' },
      { q: 'What is the Nisab for Zakat?', a: 'Two Nisab standards: (1) Gold: 87.48 grams of gold. (2) Silver: 612.36 grams of silver. If one has gold only, use the gold standard. If one has a mix of gold, silver, cash and trade goods, scholars differ — the Deoband fatwa recommends using the silver Nisab (lower threshold) as it is more beneficial to the poor. Zakat is 2.5% of total zakatable wealth.' },
      { q: 'On what types of wealth is Zakat due?', a: 'Zakat is due on: (1) Gold and silver (including jewellery — Hanafi position). (2) Cash and bank balances. (3) Business inventory (at current market value). (4) Loans given (on amount expected to be received). (5) Shares (on the zakatable portion). Zakat is NOT due on: personal use items (home, car, clothing, furniture), fixed assets not for trade, diamonds/gemstones per Hanafi school.' },
      { q: 'Who are the 8 eligible recipients of Zakat?', a: 'Quran 9:60 specifies 8 categories: (1) Fuqara — the poor (below Nisab). (2) Masakeen — the destitute (needier than the poor). (3) Amil — Zakat collectors/administrators. (4) Mu\'allafat al-Qulub — those whose hearts are being reconciled to Islam. (5) Riqab — to free slaves (historical). (6) Gharimeen — those in debt. (7) Fi Sabilillah — for the cause of Allah (includes Islamic education in Hanafi school). (8) Ibn as-Sabil — stranded travellers.' },
    ],
  },
  {
    id: 'sawm',
    title: 'Sawm (Fasting)',
    arabicTitle: 'الصوم',
    icon: '🌙',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'What are the Fardh conditions of Sawm?', a: 'Fasting in Ramadan is Fardh upon every adult, sane, healthy Muslim (male or female) who is not travelling. It begins at Subh Sadiq (true dawn) and ends at sunset. The intention (niyyah) must be made before Subh Sadiq for Fardh fasts.' },
      { q: 'What breaks the fast (Mufsidat)?', a: 'The fast is broken (and both Qadha and Kaffarah are required for deliberate breaking) by: (1) Eating or drinking intentionally. (2) Sexual intercourse. Only Qadha (make-up) is required for: medicine or drops in ears/nose, vomiting intentionally, eating under compulsion, forgetting and eating (no Qadha in Hanafi — if you realise while eating, stop). (Fatawa-e-Alamgiri, Kitab as-Sawm)' },
      { q: 'Who is exempt from fasting?', a: 'Exempt from fasting: (1) Travellers (Musafir — journey over 77km): may break and make Qadha later. (2) Ill persons: may break and make Qadha. (3) Pregnant/breastfeeding women (if fear for self or baby): make Qadha. (4) Very elderly unable to fast: pay Fidyah (one meal or its equivalent per day). (5) Menstruating/post-natal women: must break, make Qadha later (not Kaffarah).' },
      { q: 'What is the Kaffarah for breaking a Ramadan fast?', a: 'The Kaffarah for deliberately breaking a Ramadan fast (by eating, drinking or sexual intercourse): (1) Free a slave (not applicable today). (2) If unable — fast continuously for 60 days. (3) If unable — feed 60 poor people two meals each. This is in addition to making Qadha of the missed fast. (Bukhari 1936)' },
    ],
  },
  {
    id: 'qurbani',
    title: 'Qurbani (Animal Sacrifice)',
    arabicTitle: 'القربان',
    icon: '🐑',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'On whom is Qurbani Wajib?', a: 'Qurbani is Wajib upon every Muslim who: (1) Is adult (baligh) and sane. (2) Is a resident (Muqeem — not a traveller). (3) Possesses the Nisab amount (87.48g gold or 612.36g silver or equivalent) on the 10th of Dhul Hijjah, even if for just one day — the wealth does not need to have been held for a full year (unlike Zakat). (Fatawa-e-Alamgiri, Fatawa-e-Deoband)' },
      { q: 'What animals are valid for Qurbani?', a: 'Valid animals: Goat and sheep (1 counts for 1 person); Cow, bull, buffalo, camel (1 counts for up to 7 persons). Minimum ages: sheep/goat — 1 year; cow/bull/buffalo — 2 years; camel — 5 years. A lamb that appears mature (over 6 months) can substitute for a 1-year sheep. Animals must be free of major defects (blind in one eye, severely lame, very lean, missing more than 1/3 of an ear).' },
      { q: 'When are the days of Qurbani?', a: 'Qurbani is valid on: 10th, 11th and 12th of Dhul Hijjah. The 10th is most meritorious. Qurbani must be done after the Eid prayer — before the prayer, it is not valid (and becomes Sadaqah). The time ends at sunset on the 12th of Dhul Hijjah (some scholars include 13th). (Bukhari 5562, Abu Dawood 2795)' },
      { q: 'How should the meat of Qurbani be distributed?', a: 'The Mustahab (recommended) distribution: 1/3 for the family, 1/3 for relatives and friends, 1/3 for the poor and needy. However, the entire animal can be given in charity if desired. It is Makruh to sell the meat. The skin can be used personally (for a prayer mat etc.) or given to the poor, but cannot be sold and money kept for personal use (it must be given in charity if sold).' },
    ],
  },
  {
    id: 'zina-food',
    title: 'Halal & Haram Food',
    arabicTitle: 'الحلال والحرام',
    icon: '🍽️',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'What meats are Halal?', a: 'Halal meats include: All domesticated animals slaughtered correctly (cow, goat, sheep, camel, chicken, turkey, duck). Wild game (deer, rabbit, etc.) slaughtered correctly. Halal fish (all fish with scales are halal — no slaughter needed). Insects: locusts are halal. Key conditions for halal slaughter (Dhabh): Muslim/Kitabi (Jew or Christian) slaughters, Bismillah is said, throat and jugular veins are cut, blood flows out, animal is alive at slaughter.' },
      { q: 'What is haram to eat?', a: 'Haram to eat: (1) Pork in all forms. (2) Blood. (3) Dead animals (died without slaughter). (4) Animals slaughtered in names other than Allah. (5) Predatory animals with fangs (lions, dogs, wolves). (6) Birds of prey with talons (eagles, hawks). (7) Donkeys. (8) Alcohol/intoxicants. (9) Insects (except locusts). (10) Machine-slaughtered chicken where Bismillah is not individually said. (Quran 5:3; Fatawa-e-Deoband)' },
      { q: 'What is the ruling on machine-slaughtered chicken?', a: 'The standard fatwa of Darul Uloom Deoband and most Deobandi scholars: Machine-slaughtered chicken is NOT halal unless: (1) A Muslim manually controls each bird and says Bismillah for each one. A blanket Bismillah for the whole batch is not sufficient. The Hanafi condition of individual Tasmiyah (Bismillah per animal) is not met by machine slaughter in most factories. Verify with your local Mufti for specific brands.' },
    ],
  },
  {
    id: 'janazah',
    title: 'Janazah (Funeral)',
    arabicTitle: 'الجنازة',
    icon: '🕊️',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'What are the obligations (Fardh Kifayah) regarding the deceased?', a: 'Four obligations on the Muslim community (Fardh Kifayah): (1) Ghusl (washing) — the body must be washed according to Islamic method. (2) Kafan (shrouding) — in white cloth (men: 3 pieces; women: 5 pieces). (3) Salat al-Janazah (funeral prayer). (4) Burial (dafn) — in the ground, facing Qibla, without a coffin if possible. (Bukhari, Muslim — multiple hadiths)' },
      { q: 'How is Salat al-Janazah performed?', a: 'Salat al-Janazah has 4 Takbeers: (1) First Takbeer — recite Thana (Subhanakallahumma). (2) Second Takbeer — recite Darood-e-Ibrahim. (3) Third Takbeer — recite Dua for the deceased. (4) Fourth Takbeer — then give Salaam to both sides. There is no Ruku or Sujood. It is Fardh Kifayah. The imam stands near the chest of males or the middle of females. (Abu Dawood, Tirmidhi)' },
      { q: 'Is it permissible to cry at a funeral?', a: 'Shedding tears out of grief is permissible and natural — the Prophet ﷺ himself cried at the death of his son Ibrahim. What is not permissible: wailing (Na\'ah), beating oneself, tearing clothes, crying loudly in a lamenting manner. The Prophet ﷺ said: "The deceased is punished by the wailing of his family." (Bukhari 1291). Quiet tears of mercy are different from forbidden wailing.' },
    ],
  },
  {
    id: 'interest',
    title: 'Riba (Interest/Usury)',
    arabicTitle: 'الربا',
    icon: '💰',
    source: 'Darul Uloom Deoband / Banuri Town',
    items: [
      { q: 'Is bank interest (riba) haram?', a: 'Yes. All forms of interest (riba) — whether on savings accounts, loans, mortgages, credit cards or bonds — are Haram according to the consensus (Ijma) of Islamic scholars including Darul Uloom Deoband and Banuri Town. The Quran declares war against those who take riba (2:278-279). One should avoid interest-bearing transactions and explore Islamic finance alternatives wherever possible.' },
      { q: 'Is taking a mortgage to buy a house permissible?', a: 'Taking a conventional interest-based mortgage is Haram. However, many scholars (including some from Deoband and Banuri Town) permit it in cases of Dharura (necessity) when: (1) No halal alternative exists. (2) One lacks accommodation entirely. (3) Renting is not feasible. However, it must be avoided when possible. Islamic mortgage products (diminishing Musharakah) are preferable where available. Consult your local Mufti for a specific fatwa.' },
    ],
  },
  {
    id: 'haidh',
    title: 'Haidh & Istihadah',
    arabicTitle: 'الحيض والاستحاضة',
    icon: '🌸',
    source: 'Bahar-e-Shariat / Fatawa-e-Alamgiri',
    items: [
      { q: 'What is the minimum and maximum duration of Haidh (menstruation)?', a: 'In the Hanafi school: Minimum: 3 days and nights (72 hours). Maximum: 10 days and nights (240 hours). If bleeding continues beyond 10 days, the excess is Istihadah (dysfunctional bleeding). The woman should revert to her previous habit (Aadah) to determine her Haidh period. A girl\'s minimum age for Haidh is 9 lunar years; maximum: 55 years (after which it is Istihadah).' },
      { q: 'What is forbidden during Haidh?', a: 'During Haidh, the following are forbidden: (1) Salah (prayer) — and Qadha is NOT required after purity. (2) Fasting — Qadha IS required. (3) Tawaf (circumambulation of Ka\'bah). (4) Intercourse. (5) Entering the Mosque (Hanafi ruling — standing inside). (6) Reciting Quran from memory with intention of Tilawah (there is scholarly difference on this). Reading Quran from the Mushaf as a physical touch requires Wuzu. (Fatawa-e-Alamgiri)' },
    ],
  },
  {
    id: 'hajj-basic',
    title: 'Hajj & Umrah Basics',
    arabicTitle: 'الحج والعمرة',
    icon: '🕋',
    source: 'Fatawa-e-Darul Uloom Deoband',
    items: [
      { q: 'When does Hajj become Fardh?', a: 'Hajj is Fardh once in a lifetime upon every adult, sane Muslim who: (1) Possesses sufficient wealth for the journey and back, after fulfilling all debts and family needs. (2) Is physically able to travel. (3) Is safe from danger. (4) Is not in debt that they cannot repay. Women additionally require a Mahram (male guardian) for the journey according to the Hanafi and Hanbali schools (Bukhari 3006). The Hanafi school does not permit a woman to travel for Hajj without a Mahram even with a group of trustworthy women.' },
      { q: 'What are the Fardh (pillars) of Hajj?', a: 'Three Fardh of Hajj: (1) Ihram (entering the state of pilgrimage with intention). (2) Wuquf at Arafat — standing at Arafat on 9th Dhul Hijjah from Zawal (noon) until sunset (leaving before sunset requires Dam/penalty). (3) Tawaf-e-Ziyarah (Tawaf al-Ifadha) — performed after returning from Arafat, from 10th Dhul Hijjah onwards. If any Fardh is missing, Hajj is invalid.' },
    ],
  },
];

function MasailSection({ isDark }: { isDark: boolean }) {
  const [selectedTopic, setSelectedTopic] = useState(MASAIL_TOPICS[0]);
  const [openItem, setOpenItem] = useState<number>(0);

  const panel = isDark
    ? { background: 'rgba(8,22,15,0.78)', border: '1px solid rgba(233,207,122,0.18)' }
    : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(16,185,129,0.12)' };

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Topic sidebar */}
      <div className="lg:w-56 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {MASAIL_TOPICS.map((topic) => (
            <button key={topic.id}
              onClick={() => { setSelectedTopic(topic); setOpenItem(0); }}
              className={`text-left px-3.5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 ${selectedTopic.id === topic.id ? 'bg-emerald-600 text-white font-semibold' : isDark ? 'text-parchment/75 hover:bg-white/[0.06]' : 'text-neutral-700 hover:bg-neutral-100'}`}>
              <span className="text-base leading-none">{topic.icon}</span>
              <span className="leading-tight">{topic.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Masail detail */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl p-5 mb-4" style={panel}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className={`font-display font-bold text-xl ${isDark ? 'text-white' : 'text-emerald-950'}`}>
                {selectedTopic.title}
              </h3>
              <p className={`font-arabic text-lg ${isDark ? 'text-[#E9CF7A]/70' : 'text-emerald-700'}`}>{selectedTopic.arabicTitle}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 ${isDark ? 'bg-emerald-700/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
              <CheckCircle2 size={12} /> {selectedTopic.source}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {selectedTopic.items.map((item, idx) => (
            <motion.div key={idx} layout
              className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-neutral-100 bg-white shadow-sm'}`}>
              <button className="w-full text-left p-4 flex items-start gap-3" onClick={() => setOpenItem(openItem === idx ? -1 : idx)}>
                <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isDark ? 'bg-amber-700/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                  Q
                </span>
                <p className={`flex-1 text-sm font-semibold ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{item.q}</p>
                <ChevronDown size={16} className={`shrink-0 mt-0.5 transition-transform ${isDark ? 'text-parchment/40' : 'text-neutral-400'} ${openItem === idx ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openItem === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className={`px-4 pb-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-neutral-50'}`}>
                      <div className="flex gap-2 pt-3">
                        <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isDark ? 'bg-emerald-700/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>A</span>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-parchment/80' : 'text-neutral-700'}`}>{item.a}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className={`mt-4 flex items-start gap-2 text-xs rounded-xl p-3 ${isDark ? 'bg-amber-900/20 text-amber-300/80' : 'bg-amber-50 text-amber-700'}`}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <p>These masail are based on the Hanafi madhab and authenticated sources (Darul Uloom Deoband, Banuri Town, Fatawa-e-Alamgiri). For personal matters, please consult a qualified Mufti.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATORS SECTION
// ═══════════════════════════════════════════════════════════════════════════
type CalcId = 'zakat' | 'qurbani' | 'ushr' | 'warasat' | 'fidyah' | 'qazaroza';

interface CalcCard { id: CalcId; title: string; arabicTitle: string; icon: string; desc: string; }
const CALC_CARDS: CalcCard[] = [
  { id: 'zakat',    title: 'Zakat Calculator',           arabicTitle: 'حساب الزكاة',            icon: '🌙', desc: 'Calculate 2.5% on zakatable assets above Nisab' },
  { id: 'qurbani',  title: 'Qurbani Nisab Checker',      arabicTitle: 'حساب القربان',           icon: '🐑', desc: 'Check if Qurbani (sacrifice) is obligatory on you' },
  { id: 'ushr',     title: 'Ushr Calculator',            arabicTitle: 'حساب العشر',             icon: '🌾', desc: '5% or 10% on agricultural produce' },
  { id: 'warasat',  title: 'Warasat (Inheritance)',      arabicTitle: 'حساب الميراث',           icon: '📜', desc: 'Distribute estate according to Islamic shares' },
  { id: 'fidyah',   title: 'Namaz / Roza Fidyah',        arabicTitle: 'حساب الفدية',            icon: '🕌', desc: 'Fidyah for missed prayers or fasts' },
  { id: 'qazaroza', title: 'Qaza Roza Counter',          arabicTitle: 'حساب قضاء الصيام',      icon: '📅', desc: 'Track and calculate missed fasts' },
];

function CalculatorsSection({ isDark }: { isDark: boolean }) {
  const [activeCalc, setActiveCalc] = useState<CalcId | null>(null);

  // ── Zakat state ──
  const [zakatGold,     setZakatGold]     = useState('');
  const [zakatSilver,   setZakatSilver]   = useState('');
  const [zakatCash,     setZakatCash]     = useState('');
  const [zakatGoods,    setZakatGoods]    = useState('');
  const [zakatReceiv,   setZakatReceiv]   = useState('');
  const [zakatDebt,     setZakatDebt]     = useState('');
  const [goldPrice,     setGoldPrice]     = useState('9500');   // PKR per gram (approx)
  const [silverPrice,   setSilverPrice]   = useState('110');    // PKR per gram (approx)
  const [currency,      setCurrency]      = useState('PKR');

  // ── Ushr state ──
  const [ushrProduce,   setUshrProduce]   = useState('');
  const [ushrIrrigated, setUshrIrrigated] = useState<'rain' | 'manual' | 'mixed'>('rain');

  // ── Warasat state ──
  const [wEstate,       setWEstate]       = useState('');
  const [wDebt,         setWDebt]         = useState('');
  const [wBequest,      setWBequest]      = useState('');
  const [wHusband,      setWHusband]      = useState(false);
  const [wWives,        setWWives]        = useState('0');
  const [wSons,         setWSons]         = useState('0');
  const [wDaughters,    setWDaughters]    = useState('0');
  const [wFather,       setWFather]       = useState(false);
  const [wMother,       setWMother]       = useState(false);

  // ── Fidyah state ──
  const [fidyahPrayers,   setFidyahPrayers]   = useState('');
  const [fidyahFasts,     setFidyahFasts]     = useState('');
  const [wheatPriceKg,    setWheatPriceKg]    = useState('120');  // PKR per kg

  // ── Qaza roza state ──
  const [qazaYears,       setQazaYears]       = useState('');
  const [qazaMonths,      setQazaMonths]      = useState('');
  const [qazaDays,        setQazaDays]        = useState('');

  const n = (v: string) => parseFloat(v) || 0;

  // Zakat calculation
  const goldNisabGrams  = 87.48;
  const silverNisabGrams = 612.36;
  const goldNisabValue  = goldNisabGrams  * n(goldPrice);
  const silverNisabValue = silverNisabGrams * n(silverPrice);
  const zakatTotalAssets = n(zakatGold) * n(goldPrice) + n(zakatSilver) * n(silverPrice) + n(zakatCash) + n(zakatGoods) + n(zakatReceiv);
  const zakatNet         = Math.max(0, zakatTotalAssets - n(zakatDebt));
  const zakatNisabMet    = zakatNet >= silverNisabValue;
  const zakatDue         = zakatNisabMet ? zakatNet * 0.025 : 0;

  // Qurbani
  const qurbaniNisabMet = zakatNet >= silverNisabValue;

  // Ushr
  const ushrRate   = ushrIrrigated === 'rain' ? 0.10 : ushrIrrigated === 'manual' ? 0.05 : 0.075;
  const ushrAmount = n(ushrProduce) * ushrRate;

  // Warasat
  const netEstate = Math.max(0, n(wEstate) - n(wDebt) - Math.min(n(wEstate) * 0.333, n(wBequest)));
  const sons = Math.max(0, parseInt(wSons) || 0);
  const daughters = Math.max(0, parseInt(wDaughters) || 0);
  const wives = Math.max(0, parseInt(wWives) || 0);
  const hasChildren = sons + daughters > 0;
  interface Share { label: string; fraction: string; amount: number; }
  const warasatShares: Share[] = [];
  if (netEstate > 0) {
    let remainder = netEstate;
    // Spouse share
    if (wHusband) { const s = netEstate * (hasChildren ? 0.25 : 0.5); warasatShares.push({ label: 'Husband', fraction: hasChildren ? '1/4' : '1/2', amount: s }); remainder -= s; }
    if (wives > 0) { const wf = netEstate * (hasChildren ? 0.125 : 0.25); warasatShares.push({ label: `Wife/Wives (${wives})`, fraction: hasChildren ? '1/8 (shared)' : '1/4 (shared)', amount: wf }); remainder -= wf; }
    // Father
    if (wFather) { const s = netEstate / 6; warasatShares.push({ label: 'Father', fraction: '1/6', amount: s }); remainder -= s; }
    // Mother
    if (wMother) { const s = netEstate / 6; warasatShares.push({ label: 'Mother', fraction: '1/6', amount: s }); remainder -= s; }
    // Children — Asabah distribution
    if (sons > 0 || daughters > 0) {
      const units = sons * 2 + daughters;
      const perUnit = remainder / units;
      if (sons > 0) warasatShares.push({ label: `Son(s) (${sons})`, fraction: '2× daughter', amount: perUnit * 2 * sons });
      if (daughters > 0) warasatShares.push({ label: `Daughter(s) (${daughters})`, fraction: '1× unit', amount: perUnit * daughters });
    }
  }

  // Fidyah
  const halfSaWheat = 1.75;   // kg per prayer or fast
  const fidyahPerUnit = halfSaWheat * n(wheatPriceKg);
  const fidyahPrayerTotal = n(fidyahPrayers) * fidyahPerUnit;
  const fidyahFastTotal   = n(fidyahFasts)   * fidyahPerUnit;

  // Qaza roza
  const totalQazaDays = n(qazaYears) * 354 + n(qazaMonths) * 29.5 + n(qazaDays);

  const panel = isDark
    ? { background: 'rgba(8,22,15,0.78)', border: '1px solid rgba(233,207,122,0.18)' }
    : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(16,185,129,0.12)' };

  const inputCls = isDark
    ? 'bg-white/[0.06] border border-white/10 text-parchment placeholder:text-parchment/40 focus:ring-emerald-400/50'
    : 'bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:ring-emerald-300';
  const labelCls = isDark ? 'text-parchment/70' : 'text-neutral-600';
  const resultCls = isDark ? 'bg-emerald-700/20 text-emerald-200 border border-emerald-600/30' : 'bg-emerald-50 text-emerald-900 border border-emerald-200';

  const fmtNum = (v: number) => v.toLocaleString('en-PK', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      {/* Calc cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CALC_CARDS.map((c) => (
          <motion.button key={c.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveCalc(activeCalc === c.id ? null : c.id)}
            className={`text-left p-4 rounded-2xl border-2 transition ${activeCalc === c.id ? 'border-emerald-500 bg-emerald-600/10' : isDark ? 'border-white/[0.08] hover:border-emerald-500/40 bg-white/[0.04]' : 'border-neutral-100 hover:border-emerald-200 bg-white shadow-sm'}`}>
            <span className="text-2xl mb-2 block">{c.icon}</span>
            <p className={`font-display font-bold text-sm leading-tight mb-0.5 ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{c.title}</p>
            <p className={`font-arabic text-base ${isDark ? 'text-[#E9CF7A]/60' : 'text-emerald-700'}`}>{c.arabicTitle}</p>
            <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-parchment/50' : 'text-neutral-500'}`}>{c.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Calculator panels */}
      <AnimatePresence>
        {activeCalc === 'zakat' && (
          <motion.div key="zakat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>🌙 Zakat Calculator</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`}>
                  {['PKR','USD','GBP','EUR','AED','SAR'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Gold Price (per gram in {currency})</label>
                <input type="number" value={goldPrice} onChange={(e) => setGoldPrice(e.target.value)} placeholder="e.g. 9500"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Silver Price (per gram in {currency})</label>
                <input type="number" value={silverPrice} onChange={(e) => setSilverPrice(e.target.value)} placeholder="e.g. 110"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ['Gold owned (grams)',       zakatGold,    setZakatGold,   'e.g. 87.48'],
                ['Silver owned (grams)',     zakatSilver,  setZakatSilver, 'e.g. 612'],
                ['Cash / Bank balance',      zakatCash,    setZakatCash,   currency],
                ['Business goods (value)',   zakatGoods,   setZakatGoods,  currency],
                ['Receivables (loans given)',zakatReceiv,  setZakatReceiv, currency],
                ['Debts owed by you',        zakatDebt,    setZakatDebt,   currency],
              ].map(([label, val, setter, ph]) => (
                <div key={label as string}>
                  <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>{label as string}</label>
                  <input type="number" value={val as string} onChange={(e) => (setter as any)(e.target.value)} placeholder={ph as string}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
                </div>
              ))}
            </div>

            <div className={`rounded-xl p-4 space-y-2 ${resultCls}`}>
              <p className="text-sm font-semibold">Results</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="opacity-70">Silver Nisab:</span> <strong>{fmtNum(silverNisabValue)} {currency}</strong></div>
                <div><span className="opacity-70">Net Zakatable:</span> <strong>{fmtNum(zakatNet)} {currency}</strong></div>
                <div><span className="opacity-70">Nisab Met:</span> <strong>{zakatNisabMet ? '✅ Yes' : '❌ No'}</strong></div>
                <div><span className="opacity-70">Zakat Due (2.5%):</span> <strong className="text-lg">{fmtNum(zakatDue)} {currency}</strong></div>
              </div>
            </div>
          </motion.div>
        )}

        {activeCalc === 'qurbani' && (
          <motion.div key="qurbani" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>🐑 Qurbani Nisab Checker</h3>
            <p className={`text-sm ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>
              Qurbani is Wajib on the same Nisab as Zakat. Fill the Zakat calculator first, then check here.
            </p>
            <div className={`rounded-xl p-4 text-sm space-y-3 ${resultCls}`}>
              <p><strong>Net Assets:</strong> {fmtNum(zakatNet)} {currency}</p>
              <p><strong>Silver Nisab:</strong> {fmtNum(silverNisabValue)} {currency}</p>
              <p className="text-base font-bold">{qurbaniNisabMet ? '✅ Qurbani is Wajib upon you' : '❌ Qurbani is not yet Wajib (below Nisab)'}</p>
              {qurbaniNisabMet && (
                <div className={`mt-2 text-xs rounded-lg p-3 ${isDark ? 'bg-white/[0.06]' : 'bg-white'}`}>
                  <p className="font-semibold mb-1">Qurbani Options:</p>
                  <p>• 1 goat / sheep = 1 person</p>
                  <p>• 1 cow / buffalo / camel = up to 7 persons (shares must be equal, not less than 1/7)</p>
                  <p>• Days: 10th, 11th, 12th Dhul Hijjah (after Eid prayer)</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeCalc === 'ushr' && (
          <motion.div key="ushr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>🌾 Ushr Calculator</h3>
            <p className={`text-sm ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>
              Ushr is due on agricultural produce. Rate depends on irrigation method.
            </p>
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-semibold block mb-2 ${labelCls}`}>Irrigation Method</label>
                <div className="flex flex-wrap gap-2">
                  {([['rain', 'Rain-fed (10%)'], ['manual', 'Artificially irrigated (5%)'], ['mixed', 'Mixed (7.5%)']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setUshrIrrigated(v)}
                      className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition ${ushrIrrigated === v ? 'bg-emerald-600 border-emerald-600 text-white' : isDark ? 'border-white/15 text-parchment/70' : 'border-neutral-200 text-neutral-600'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Total Produce Value ({currency})</label>
                <input type="number" value={ushrProduce} onChange={(e) => setUshrProduce(e.target.value)} placeholder={currency}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
            </div>
            <div className={`rounded-xl p-4 text-sm ${resultCls}`}>
              <p><strong>Rate Applied:</strong> {(ushrRate * 100).toFixed(1)}%</p>
              <p className="text-base font-bold mt-1"><strong>Ushr Due:</strong> {fmtNum(ushrAmount)} {currency}</p>
            </div>
          </motion.div>
        )}

        {activeCalc === 'warasat' && (
          <motion.div key="warasat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>📜 Warasat (Inheritance) Calculator</h3>
            <p className={`text-xs ${isDark ? 'text-amber-300/70' : 'text-amber-700'}`}>
              Simplified calculator. Complex cases (e.g. grandparents, uncles, multiple wife categories) require a qualified Mufti.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[['Total Estate Value', wEstate, setWEstate], ['Total Debts', wDebt, setWDebt], ['Bequest (Wasiyyah) — max 1/3', wBequest, setWBequest]].map(([l, v, s]) => (
                <div key={l as string}>
                  <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>{l as string} ({currency})</label>
                  <input type="number" value={v as string} onChange={(e) => (s as any)(e.target.value)} placeholder={currency}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="husband" checked={wHusband} onChange={(e) => setWHusband(e.target.checked)} className="accent-emerald-600" />
                <label htmlFor="husband" className={`text-sm ${isDark ? 'text-parchment' : 'text-neutral-700'}`}>Husband (deceased is female)</label>
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>No. of Wives</label>
                <input type="number" min="0" max="4" value={wWives} onChange={(e) => setWWives(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>No. of Sons</label>
                <input type="number" min="0" value={wSons} onChange={(e) => setWSons(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>No. of Daughters</label>
                <input type="number" min="0" value={wDaughters} onChange={(e) => setWDaughters(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="father" checked={wFather} onChange={(e) => setWFather(e.target.checked)} className="accent-emerald-600" />
                <label htmlFor="father" className={`text-sm ${isDark ? 'text-parchment' : 'text-neutral-700'}`}>Father</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mother" checked={wMother} onChange={(e) => setWMother(e.target.checked)} className="accent-emerald-600" />
                <label htmlFor="mother" className={`text-sm ${isDark ? 'text-parchment' : 'text-neutral-700'}`}>Mother</label>
              </div>
            </div>
            {warasatShares.length > 0 && (
              <div className={`rounded-xl p-4 ${resultCls}`}>
                <p className="text-sm font-semibold mb-3">Distribution of Net Estate: {fmtNum(netEstate)} {currency}</p>
                <div className="space-y-2">
                  {warasatShares.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span>{s.label} <span className="opacity-60 text-xs">({s.fraction})</span></span>
                      <strong>{fmtNum(s.amount)} {currency}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeCalc === 'fidyah' && (
          <motion.div key="fidyah" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>🕌 Namaz / Roza Fidyah Calculator</h3>
            <p className={`text-sm ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>
              Fidyah = ½ Saa (≈1.75 kg wheat or its monetary value) per missed prayer / fast. For those unable to make Qadha due to permanent illness or old age.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Wheat price per kg ({currency})</label>
                <input type="number" value={wheatPriceKg} onChange={(e) => setWheatPriceKg(e.target.value)} placeholder="e.g. 120"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Missed Prayers (count)</label>
                <input type="number" value={fidyahPrayers} onChange={(e) => setFidyahPrayers(e.target.value)} placeholder="e.g. 100"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Missed Fasts (count)</label>
                <input type="number" value={fidyahFasts} onChange={(e) => setFidyahFasts(e.target.value)} placeholder="e.g. 30"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
            </div>
            <div className={`rounded-xl p-4 text-sm space-y-2 ${resultCls}`}>
              <p><strong>Fidyah per unit:</strong> 1.75 kg × {n(wheatPriceKg)} = {fmtNum(fidyahPerUnit)} {currency}</p>
              {n(fidyahPrayers) > 0 && <p><strong>Prayer Fidyah:</strong> {n(fidyahPrayers)} × {fmtNum(fidyahPerUnit)} = <strong>{fmtNum(fidyahPrayerTotal)} {currency}</strong></p>}
              {n(fidyahFasts) > 0 && <p><strong>Roza Fidyah:</strong> {n(fidyahFasts)} × {fmtNum(fidyahPerUnit)} = <strong>{fmtNum(fidyahFastTotal)} {currency}</strong></p>}
              <p className="text-base font-bold border-t pt-2 mt-2" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                <strong>Total Fidyah:</strong> {fmtNum(fidyahPrayerTotal + fidyahFastTotal)} {currency}
              </p>
            </div>
          </motion.div>
        )}

        {activeCalc === 'qazaroza' && (
          <motion.div key="qazaroza" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-6 space-y-5" style={panel}>
            <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-emerald-950'}`}>📅 Qaza Roza Counter</h3>
            <p className={`text-sm ${isDark ? 'text-parchment/70' : 'text-neutral-600'}`}>
              Calculate total missed fasts. Based on lunar calendar: 1 year ≈ 354 days, 1 month ≈ 29.5 days.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Years</label>
                <input type="number" min="0" value={qazaYears} onChange={(e) => setQazaYears(e.target.value)} placeholder="0"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Months</label>
                <input type="number" min="0" max="11" value={qazaMonths} onChange={(e) => setQazaMonths(e.target.value)} placeholder="0"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${labelCls}`}>Extra Days</label>
                <input type="number" min="0" value={qazaDays} onChange={(e) => setQazaDays(e.target.value)} placeholder="0"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 ${inputCls}`} />
              </div>
            </div>
            {totalQazaDays > 0 && (
              <div className={`rounded-xl p-4 text-sm space-y-3 ${resultCls}`}>
                <p className="text-lg font-bold">Total Qaza Fasts: {Math.ceil(totalQazaDays)}</p>
                <div className={`rounded-lg p-3 text-xs ${isDark ? 'bg-white/[0.06]' : 'bg-white'}`}>
                  <p className="font-semibold mb-1">Options to fulfil:</p>
                  <p>• Make up ({Math.ceil(totalQazaDays)}) fasts one by one as Qadha</p>
                  <p>• If permanently unable: Fidyah = {Math.ceil(totalQazaDays)} × 1.75 kg wheat each</p>
                  <p>• Fidyah at {n(wheatPriceKg)} {currency}/kg: <strong>{fmtNum(Math.ceil(totalQazaDays) * fidyahPerUnit)} {currency}</strong></p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const HERO_AYAT = [
  { ar: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', en: 'Call upon Me; I will respond to you.', ref: 'Quran 40:60' },
  { ar: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', en: 'When My servants ask about Me, I am indeed close.', ref: 'Quran 2:186' },
  { ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ', en: 'Remember Me; I will remember you.', ref: 'Quran 2:152' },
];

export default function IslamicLibraryPage() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useLocalStorage<Tab>('isa:advancedTab', 'duas');
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_AYAT.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}>

      {/* ── Full-bleed header ── */}
      <div className="relative">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: isDark ? 'linear-gradient(120deg,#0c2418 0%,#08160f 72%)' : 'linear-gradient(120deg,#fdf8ec 0%,#f4ead7 72%)' }} />

          <div className="absolute inset-y-0 right-0 w-[62%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/islamic_Library_bg.png" alt="" className="w-full h-full object-cover object-center" style={isDark ? { filter: 'brightness(0.82)' } : undefined} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${isDark ? '#08160f' : '#f4ead7'} 0%, transparent 26%)` }} />
          </div>

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

          <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: isDark ? 'linear-gradient(to bottom, transparent, #08160F)' : 'linear-gradient(to bottom, transparent, #FAF7EE)' }} />

          <motion.div aria-hidden className="absolute hidden lg:block" style={{ right: '20%', top: 26 }}
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="#F1D588" style={{ filter: 'drop-shadow(0 0 12px rgba(233,207,122,0.7))' }}>
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
            </svg>
          </motion.div>
        </div>

        <div className="relative px-6 sm:px-10 pt-8 pb-3 flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur border ${isDark ? 'border-gold-300/50 bg-black/30 text-gold-200' : 'border-gold-500/40 bg-white/70 text-emerald-800'}`}>
              <Library size={12} /> Islamic Library
            </span>
            <h1 className={`mt-4 font-display font-bold text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl leading-[1.05] ${isDark ? 'text-white' : 'text-emerald-950'}`}
              style={{ textShadow: isDark ? '0 2px 16px rgba(0,0,0,0.6)' : '0 1px 8px rgba(255,255,255,0.7)' }}>
              Advanced Islamic Features
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl px-4 py-2.5"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.2)' }}>
              <p className="text-base sm:text-lg leading-relaxed text-white/90">
                Duas · Hadees Library · Islamic Masail · Calculators
              </p>
              <p className="mt-1 text-xs text-white/55">Hanafi | Deoband | Authentic Sources</p>
            </div>
          </div>

          <div className="hidden md:block max-w-[17rem]">
            <div className="rounded-2xl px-4 py-4 text-right"
              style={{ background: isDark ? 'rgba(8,22,15,0.78)' : 'rgba(10,30,20,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(233,207,122,0.22)' }}>
              <AnimatePresence mode="wait">
                <motion.div key={heroIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                  <p className={`font-arabic text-xl lg:text-2xl leading-[1.9] ${isDark ? 'text-[#E9CF7A]' : 'text-black'}`} dir="rtl">{HERO_AYAT[heroIdx].ar}</p>
                  <p className="mt-1.5 text-sm leading-relaxed font-medium text-white/90">&ldquo;{HERO_AYAT[heroIdx].en}&rdquo;</p>
                  <p className="mt-1 text-xs font-bold text-[#F1D588]">{HERO_AYAT[heroIdx].ref}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                {HERO_AYAT.map((_, i) => (
                  <button key={i} onClick={() => setHeroIdx(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIdx ? 'w-6 bg-gold-300' : 'w-1.5 bg-white/30'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      {/* ── Tab navigation — inside hero so background extends to here ── */}
      <div className={`sticky top-0 z-20 px-6 sm:px-10 py-3 flex gap-1 overflow-x-auto ${isDark ? 'bg-[#0B231A]/90' : 'bg-white/90'} backdrop-blur`}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-emerald-600 text-white shadow-glow-emerald' : isDark ? 'text-parchment/70 hover:bg-white/[0.07]' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              <Icon size={15} className={active ? 'text-white' : tab.color} />
              {tab.label}
            </button>
          );
        })}
      </div>
      </div>{/* closes hero section */}

      {/* ── Tab content ── */}
      <div className="px-6 sm:px-10 pb-12 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {activeTab === 'duas'        && <DuasSection       isDark={isDark} />}
            {activeTab === 'hadees'      && <HadeesSection     isDark={isDark} />}
            {activeTab === 'masail'      && <MasailSection     isDark={isDark} />}
            {activeTab === 'calculators' && <CalculatorsSection isDark={isDark} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
