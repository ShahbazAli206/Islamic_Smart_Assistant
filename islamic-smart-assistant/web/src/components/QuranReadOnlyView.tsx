'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { useMushafPage, useMushafIndex, usePrefetchMushafNeighbors, MUSHAF_TOTAL_PAGES, type MushafWord } from '@/lib/mushaf';
import { SURAHS } from '@/lib/surahs';

type Props = {
  page: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
};

/** 3 → ٣ — printed mushaf headers/roundels use Arabic-Indic digits. */
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

/**
 * Page-by-page reading view of the 16-line Indo-Pak mushaf — a real "read the
 * page as printed" experience, distinct from QuranPlayer's ayah-by-ayah audio
 * player. Data comes from public/data/mushaf-indopak16/*.json (see
 * scripts/ingest-mushaf-indopak16.ts) via useMushafPage, which itself checks
 * the offline IndexedDB cache (mushafCache.ts) before hitting the network.
 */
export function QuranReadOnlyView({ page, onPageChange, isDark }: Props) {
  const { data, isLoading, isError } = useMushafPage(page);
  const { data: index } = useMushafIndex();
  const prefetchNeighbors = usePrefetchMushafNeighbors(page);

  useEffect(() => { prefetchNeighbors(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (n: number) => onPageChange(Math.min(MUSHAF_TOTAL_PAGES, Math.max(1, n)));

  const juzLabel = data?.juz.length ? `Juz ${data.juz[0]}` : '';
  // The surah the page opens with (smallest number on the page) — what a
  // printed mushaf shows in the page's top corner cartouche.
  const headerSurah = data ? SURAHS.find((s) => s.number === data.surahs[0]) : undefined;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      {/* ── Header: Juz · Page + navigation ── */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition disabled:opacity-30 disabled:cursor-not-allowed ${
            isDark
              ? 'border-gold-400/25 bg-emerald-950/55 text-gold-200 hover:border-gold-400/50'
              : 'border-emerald-200 bg-white/75 text-emerald-800 hover:border-emerald-300'
          }`}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className={isDark ? 'text-parchment/60' : 'text-ink/55'}>{juzLabel}</span>
          <span className={isDark ? 'text-parchment/30' : 'text-ink/25'}>·</span>
          <span className={`font-semibold ${isDark ? 'text-parchment' : 'text-ink'}`}>Page</span>
          <input
            type="number"
            min={1}
            max={MUSHAF_TOTAL_PAGES}
            value={page}
            onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) goTo(n); }}
            className={`w-16 text-center rounded-lg border py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${
              isDark
                ? 'bg-white/[0.06] border-white/10 text-parchment'
                : 'bg-emerald-50 border-emerald-100 text-ink'
            }`}
          />
          <span className={isDark ? 'text-parchment/40' : 'text-ink/40'}>/ {MUSHAF_TOTAL_PAGES}</span>
        </div>

        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= MUSHAF_TOTAL_PAGES}
          aria-label="Next page"
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition disabled:opacity-30 disabled:cursor-not-allowed ${
            isDark
              ? 'border-gold-400/25 bg-emerald-950/55 text-gold-200 hover:border-gold-400/50'
              : 'border-emerald-200 bg-white/75 text-emerald-800 hover:border-emerald-300'
          }`}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Tajweed rule → color legend. Class names come from Quran Foundation's
          text_uthmani_tajweed markup (sanitized to tajweed-RULE at ingest time);
          colors follow the standard tajweed-quran color convention. Several
          rules list two spellings because different tajweed datasets in the
          wild disagree on spelling (e.g. "laam_shamsiyah" vs "…yyah") — both
          are mapped so whichever one the API actually returns still resolves. */}
      <style>{`
        .tajweed-ham_wasl, .tajweed-silent,
        .tajweed-laam_shamsiyah, .tajweed-laam_shamsiyyah { color: #AAAAAA; }
        .tajweed-madda_normal { color: #537FFF; }
        .tajweed-madda_permissible { color: #4050FF; }
        .tajweed-madda_necessary, .tajweed-madda_obligatory { color: #000EBC; }
        .tajweed-qalqalah, .tajweed-qalaqah { color: #DD0008; }
        .tajweed-ikhafa_shafawi, .tajweed-ikhfa_shafawi { color: #D500B7; }
        .tajweed-ikhafa, .tajweed-ikhfa { color: #9400A8; }
        .tajweed-idgham_shafawi { color: #58B800; }
        .tajweed-iqlab { color: #26BFFD; }
        .tajweed-idgham_with_ghunnah, .tajweed-idgham_ghunnah { color: #169777; }
        .tajweed-idgham_without_ghunnah, .tajweed-idgham_no_ghunnah { color: #169200; }
        .tajweed-idgham_mutajanisayn, .tajweed-idgham_mutajaanisain { color: #A1A1A1; }
        .tajweed-idgham_mutaqaribayn, .tajweed-idgham_mutaqaaribain { color: #A1A1A1; }
        .tajweed-ghunnah { color: #FF7E1E; }
      `}</style>

      {/* ── The mushaf page itself — layered frame like a printed mushaf:
             gold band → double rule → thin inner rule → plain cream page ── */}
      <div className="relative rounded-2xl p-[5px] shadow-card-soft bg-gold-gradient">
        <div
          className={`rounded-xl border-4 border-double p-[3px] ${
            isDark ? 'border-gold-400/60' : 'border-amber-700/60'
          }`}
        >
          <div
            className={`relative rounded-lg border px-5 py-5 sm:px-8 sm:py-6 ${
              isDark
                ? 'border-gold-400/25 bg-emerald-950/90'
                : 'border-amber-700/25 bg-[#FBF4E2]'
            }`}
          >
          {/* Page-top cartouches, printed-mushaf style: surah name+number (left),
              page number in Arabic digits (center), para/juz number (right). */}
          {data && (
            <div className={`flex items-center justify-between gap-2 mb-4 pb-3 border-b ${isDark ? 'border-gold-400/25' : 'border-amber-700/25'}`}>
              <span
                dir="rtl"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-0.5 font-arabic text-lg leading-relaxed ${
                  isDark
                    ? 'border-gold-400/40 bg-emerald-950/60 text-gold-200'
                    : 'border-amber-700/40 bg-amber-50/80 text-amber-900'
                }`}
              >
                {headerSurah ? `${headerSurah.arabic} ${toArabicDigits(headerSurah.number)}` : ''}
              </span>

              <span className="inline-flex items-center justify-center rounded-full px-4 py-0.5 font-arabic text-lg font-bold bg-gold-gradient text-midnight-900 shadow-[0_0_10px_rgba(221,185,75,0.35)]">
                {toArabicDigits(page)}
              </span>

              <span
                dir="rtl"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-0.5 font-arabic text-lg leading-relaxed ${
                  isDark
                    ? 'border-gold-400/40 bg-emerald-950/60 text-gold-200'
                    : 'border-amber-700/40 bg-amber-50/80 text-amber-900'
                }`}
              >
                {`پارہ ${toArabicDigits(data.juz[0])}`}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PageSkeleton isDark={isDark} />
              </motion.div>
            )}

            {isError && !isLoading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex flex-col items-center gap-2 py-16 text-center ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}
              >
                <WifiOff size={28} />
                <p className="font-semibold">This page isn&apos;t available offline yet</p>
                <p className="text-sm max-w-xs">
                  Connect to the internet once to load it — after that it stays available offline.
                </p>
              </motion.div>
            )}

            {data && !isLoading && (
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col justify-between gap-0 overflow-hidden"
                style={{ minHeight: '48vh' }}
              >
                {data.lines.map((line, i) => (
                  <MushafLine key={i} line={line} isLast={i === data.lines.length - 1} isDark={isDark} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Base font size for a mushaf line; dense lines are shrunk from here to fit.
const LINE_BASE_REM = 1.9;

/**
 * One printed line of the page. A real mushaf line never wraps, so this
 * renders at full size, measures actual overflow, and shrinks just this
 * line's font precisely enough to fit its row — the digital equivalent of a
 * typesetter condensing a dense line. Fixed font-size thresholds can't cover
 * all 548 pages (word width varies too much), and clipping would silently
 * hide words, so fit-to-measure is the only safe option. Line-height is a
 * fixed rem so shrunken lines still sit on the same evenly-spaced rules.
 */
function MushafLine({ line, isLast, isDark }: { line: MushafWord[]; isLast: boolean; isDark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      // Iterative: the gap between words is fixed rem (doesn't shrink with the
      // font), so a single proportional pass undershoots on dense lines —
      // repeat until it actually fits (or the floor is reached).
      let size = LINE_BASE_REM;
      el.style.fontSize = `${size}rem`;
      for (let pass = 0; pass < 8; pass++) {
        if (el.clientWidth <= 0 || el.scrollWidth <= el.clientWidth) break;
        size = Math.max(0.85, size * (el.clientWidth / el.scrollWidth) * 0.97);
        el.style.fontSize = `${size}rem`;
        if (size <= 0.85) break;
      }
    };
    fit();
    // The Arabic webfont may finish loading after the first measurement — its
    // glyphs are wider than the fallback font's, so re-fit once fonts settle.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }
    // Container width changes (window resize, sidebar toggle) need a re-fit.
    // Font-size changes don't alter the row's own box (line-height and padding
    // are in fixed rem), so this doesn't feed back into itself.
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [line]);

  return (
    <div
      ref={ref}
      dir="rtl"
      // min-h keeps blank lines (e.g. page 1's decorative Al-Fatihah header,
      // which the API doesn't return content for) taking up their real
      // vertical space instead of collapsing — an empty flex row has no
      // intrinsic height on its own. Every row except the last carries a
      // thin rule underneath, like the ruled lines of a printed page.
      // gap is em-based so word spacing shrinks along with the font — a fixed
      // px gap makes very dense lines (19-20 words) unfittable at any size.
      className={`font-arabic flex flex-nowrap justify-between items-baseline gap-x-[0.3em] py-1.5 font-bold leading-[2.6rem] min-h-[2.6rem] whitespace-nowrap ${
        isDark ? 'text-parchment' : 'text-ink'
      } ${
        isLast ? '' : isDark ? 'border-b border-gold-400/15' : 'border-b border-amber-800/15'
      }`}
      style={{ fontSize: `${LINE_BASE_REM}rem` }}
    >
      {line.map((word, wi) =>
        word.charType === 'end' ? (
          <span
            key={wi}
            className={`inline-flex shrink-0 items-center justify-center w-[1.35em] h-[1.35em] rounded-full border-2 text-[0.55em] font-semibold align-middle ${
              isDark
                ? 'border-gold-400/70 text-gold-200 bg-emerald-950/60'
                : 'border-amber-700/50 text-amber-800 bg-amber-50/80'
            }`}
          >
            {toArabicDigits(Number(word.verseKey.split(':')[1]) || 0)}
          </span>
        ) : (
          // tajweedHtml is pre-sanitized at ingest time to `<span
          // class="tajweed-RULE">…</span>` + plain text only — see
          // sanitizeTajweedFragment in the ingestion script.
          <span
            key={wi}
            className="shrink whitespace-nowrap"
            dangerouslySetInnerHTML={{ __html: word.tajweedHtml }}
          />
        ),
      )}
    </div>
  );
}

function PageSkeleton({ isDark }: { isDark: boolean }) {
  const bg = isDark ? 'bg-white/10' : 'bg-black/10';
  return (
    <div className="flex flex-col gap-4 py-2" style={{ minHeight: '52vh' }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className={`h-6 rounded animate-pulse ${bg}`} style={{ width: `${70 + (i % 4) * 8}%`, marginLeft: i % 2 ? 'auto' : undefined }} />
      ))}
    </div>
  );
}
