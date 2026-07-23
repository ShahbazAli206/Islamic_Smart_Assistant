'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
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

  // Cartouche header + page content — identical in both the dark (CSS-framed)
  // and light (border-image-framed) variants, only the frame around it differs.
  const pageBody = (
    <>
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

      {/* No exit animations here — an exit that fails to complete can leave
          the PREVIOUS page's lines stuck on screen while the header above
          (outside this block) already shows the new page. Enter-only fades
          keyed by page cannot get into that state. */}
      {isLoading && <PageSkeleton isDark={isDark} />}

      {isError && !isLoading && (
        <div className={`flex flex-col items-center gap-2 py-16 text-center ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}>
          <WifiOff size={28} />
          <p className="font-semibold">This page isn&apos;t available offline yet</p>
          <p className="text-sm max-w-xs">
            Connect to the internet once to load it — after that it stays available offline.
          </p>
        </div>
      )}

      {data && !isLoading && (
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22 }}
        >
          <MushafPageLines lines={data.lines} isDark={isDark} />
        </motion.div>
      )}
    </>
  );

  return (
    // On phones the mushaf page runs edge-to-edge: the negative margin cancels
    // the two ancestor x-paddings (px-5 content wrapper + px-2 player wrapper
    // in page.tsx = 1.75rem per side); ≥sm it re-centers with the usual gutter.
    <div className="w-[calc(100%+3.5rem)] -mx-7 sm:w-full sm:mx-auto max-w-3xl flex flex-col gap-4">
      {/* ── Header: Juz · Page + navigation ── */}
      <div className="flex items-center justify-between px-3 sm:px-1">
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
        /* Light-mode page frame: the ornate border is a single image
           (public/border_blank_page.png), applied via border-image so it wraps
           whatever height the page content ends up being — no aspect-ratio lock
           or JS measurement needed. Slice % come from sampling the source image's
           actual blank-vs-ornate boundary (see git history for the sampling
           script); repeat:stretch avoids visible seams on the long edges. */
        .mushaf-ornate-frame {
          border-style: solid;
          border-width: 20px 36px;
          border-image-source: url('/border_blank_page.png');
          border-image-slice: 6.99% 13.96% 6.53% 13.67%;
          border-image-repeat: stretch;
          background-color: #FBF4E2;
          background-clip: padding-box;
        }
        @media (min-width: 640px) {
          .mushaf-ornate-frame { border-width: 28px 52px; }
        }
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

      {/* ── The mushaf page itself. Dark mode keeps the CSS-drawn layered frame
             (gold band → double rule → thin inner rule) since no dark variant of
             the ornate border image exists yet, and the image's baked-in cream
             background would make dark mode's light text unreadable. Light mode
             uses the border image directly (see .mushaf-ornate-frame above).

             The frame is fixed to the column width (w-full) so it's ALWAYS fully
             visible; only the inner page content scrolls horizontally when a
             (fixed-font, never-wrapping, never-shrinking) mushaf line is wider
             than the frame. Previously the whole framed page lived inside
             overflow-x-auto sized to its widest line (w-max), so any overflow
             pinned it at scrollLeft:0 and clipped the trailing (right) border
             out of view. ── */}
      {isDark ? (
        <div className="relative rounded-2xl p-[5px] shadow-card-soft bg-gold-gradient w-full">
          <div className="rounded-xl border-4 border-double p-[3px] border-gold-400/60">
            <div className="relative rounded-lg border px-2 py-5 sm:px-8 sm:py-6 border-gold-400/25 bg-emerald-950/90">
              <div className="overflow-x-auto">
                <div className="w-max min-w-full">{pageBody}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mushaf-ornate-frame relative shadow-card-soft w-full px-2 py-5 sm:px-8 sm:py-6">
          <div className="overflow-x-auto">
            <div className="w-max min-w-full">{pageBody}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * All 16 printed lines of the page, at one FIXED font size — like real print.
 * A mushaf line never wraps; instead of shrinking text to fit small windows,
 * the container is width:max-content, so the page is exactly as wide as its
 * widest line and every other line justifies to that same width. Ancestors
 * scroll when the window is narrower than the page.
 */
function MushafPageLines({ lines, isDark }: { lines: MushafWord[][]; isDark: boolean }) {
  return (
    <div className="flex flex-col w-max min-w-full">
      {lines.map((line, i) => (
        <MushafLine key={i} line={line} isLast={i === lines.length - 1} isDark={isDark} />
      ))}
    </div>
  );
}

/** One printed line — fixed font size, never wraps, never shrinks. */
function MushafLine({ line, isLast, isDark }: { line: MushafWord[]; isLast: boolean; isDark: boolean }) {
  return (
    <div
      dir="rtl"
      // min-h keeps blank lines (e.g. page 1's decorative Al-Fatihah header,
      // which the API doesn't return content for) taking up their real
      // vertical space instead of collapsing — an empty flex row has no
      // intrinsic height on its own. Every row except the last carries a
      // thin rule underneath, like the ruled lines of a printed page.
      className={`font-arabic flex flex-nowrap justify-between items-baseline gap-x-2 py-1.5 text-[1.5rem] font-bold leading-[2.6rem] min-h-[2.6rem] whitespace-nowrap ${
        isDark ? 'text-parchment' : 'text-ink'
      } ${
        isLast ? '' : isDark ? 'border-b border-gold-400/15' : 'border-b border-amber-800/15'
      }`}
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
            className="whitespace-nowrap"
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
