'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { useMushafPage, useMushafIndex, usePrefetchMushafNeighbors, MUSHAF_TOTAL_PAGES } from '@/lib/mushaf';

type Props = {
  page: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
};

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

      {/* ── The mushaf page itself ── */}
      <div
        className={`relative rounded-2xl border px-6 py-8 sm:px-10 sm:py-10 shadow-card-soft ${
          isDark
            ? 'border-gold-400/15 bg-emerald-950/40'
            : 'border-amber-200/60 bg-[rgba(255,250,238,0.85)]'
        }`}
      >
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
              className="flex flex-col justify-between gap-0"
              style={{ minHeight: '52vh' }}
            >
              {data.lines.map((line, i) => (
                <div
                  key={i}
                  dir="rtl"
                  // min-h keeps blank lines (e.g. page 1's decorative Al-Fatihah header,
                  // which the API doesn't return content for) taking up their real
                  // vertical space instead of collapsing — an empty flex row has no
                  // intrinsic height on its own.
                  className={`font-mushaf flex flex-nowrap justify-between items-baseline gap-x-2 text-[1.7rem] sm:text-[1.9rem] leading-[2.6rem] min-h-[2.6rem] whitespace-nowrap ${
                    isDark ? 'text-parchment' : 'text-ink'
                  }`}
                  style={{
                    // Real mushaf lines never wrap — a printed line is exactly one row.
                    // If the placeholder/substitute font renders wider than the source
                    // dataset assumed, compress words to fit rather than wrapping.
                    fontSize: line.length > 9 ? '1.35rem' : undefined,
                  }}
                >
                  {line.map((word, wi) => (
                    <span key={wi} className="shrink whitespace-nowrap">{word.textIndopak}</span>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
