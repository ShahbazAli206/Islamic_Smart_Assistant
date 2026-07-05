'use client';

// ── Tafsir-ul-Quran section (Islamic Library page) ───────────────────────────
// Bookshelf of official Dawat-e-Islami tafsir books + an in-app page-by-page
// PDF reader + ayah search.
//
// The PDFs are page scans (no text layer), so the reader streams the original
// book pages via pdf.js (HTTP range requests — no full download needed), while
// search runs over the STRUCTURED Kanzul Iman translation text from
// alquran.cloud and maps each hit to its Parah so the reader can jump there.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronLeft, ChevronRight, ChevronDown, X, Search, Loader2,
  ZoomIn, ZoomOut, Download, ExternalLink, BookMarked, AlertCircle, Layers,
  Check, ListFilter,
} from 'lucide-react';
import {
  TAFSIR_BOOKS, bookPdfUrl, bookStreamUrl, bookSizeMb, sizeLabel, volumeForPara,
  fetchKanzulImanText, searchKanz,
  type TafsirBook, type TafsirVolume, type KanzAyah,
} from '@/lib/tafsirBooks';
import { SURAHS } from '@/lib/surahs';

// ── Themed chapter (surah) dropdown ──────────────────────────────────────────
// The native <select> renders with OS styling that ignores the app theme (and
// was near-invisible in light mode), so the filter uses a custom scrollable
// listbox styled like the rest of the dashboard dropdowns, with a quick
// type-to-filter box for the 114 chapters.

function ChapterDropdown({ value, onChange, isDark }: {
  value: number; onChange: (v: number) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) => s.englishName.toLowerCase().includes(q) || String(s.number) === q || s.arabic.includes(filter.trim()),
    );
  }, [filter]);

  const selected = value ? SURAHS.find((s) => s.number === value) : null;
  const label = selected ? `${selected.number}. ${selected.englishName}` : 'All chapters';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFilter(''); }}
        aria-label="Filter by chapter"
        className={`w-full sm:w-52 flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition ${
          isDark
            ? 'bg-white/[0.06] border-white/12 text-parchment hover:bg-white/[0.10] hover:border-white/20'
            : 'bg-white border-emerald-200 text-emerald-950 hover:bg-emerald-50'
        }`}
      >
        <ListFilter size={14} className={`shrink-0 ${isDark ? 'text-gold-300' : 'text-gold-600'}`} />
        <span className="flex-1 min-w-0 truncate text-left">{label}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-parchment/50' : 'text-emerald-700/50'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 left-0 z-50 w-64 rounded-2xl border shadow-2xl overflow-hidden ${
              isDark ? 'bg-[#0d2018] border-emerald-500/25 shadow-black/60' : 'bg-white border-emerald-100 shadow-emerald-900/15'
            }`}
          >
            {/* quick filter */}
            <div className={`p-2 border-b ${isDark ? 'border-white/8' : 'border-emerald-50'}`}>
              <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${isDark ? 'bg-white/[0.06]' : 'bg-emerald-50/60'}`}>
                <Search size={12} className={isDark ? 'text-parchment/40' : 'text-emerald-700/40'} />
                <input
                  autoFocus
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Find a chapter…"
                  className={`w-full bg-transparent text-xs focus:outline-none ${
                    isDark ? 'text-parchment placeholder:text-parchment/35' : 'text-emerald-950 placeholder:text-emerald-900/35'
                  }`}
                />
              </div>
            </div>

            {/* scrollable list */}
            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
              {[null, ...options].map((s) => {
                const num = s?.number ?? 0;
                const isSel = num === value;
                if (s === null && filter.trim()) return null;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => { onChange(num); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition ${
                      isSel
                        ? (isDark ? 'bg-emerald-600 text-white font-semibold' : 'bg-emerald-500 text-white font-semibold')
                        : (isDark ? 'text-parchment/85 hover:bg-emerald-500/10' : 'text-emerald-950 hover:bg-emerald-50')
                    }`}
                  >
                    {s === null ? (
                      <span className="flex-1">All chapters</span>
                    ) : (
                      <>
                        <span className={`w-7 shrink-0 text-[11px] font-bold tabular-nums ${isSel ? 'text-white/80' : isDark ? 'text-gold-300/80' : 'text-gold-600'}`}>
                          {s.number}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{s.englishName}</span>
                        <span dir="rtl" className={`font-arabic text-sm shrink-0 ${isSel ? 'text-white/90' : isDark ? 'text-parchment/55' : 'text-emerald-900/50'}`}>
                          {s.arabic}
                        </span>
                      </>
                    )}
                    {isSel && <Check size={13} className="shrink-0" />}
                  </button>
                );
              })}
              {options.length === 0 && (
                <p className={`px-3.5 py-3 text-xs ${isDark ? 'text-parchment/45' : 'text-ink/45'}`}>No chapter matches.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page-by-page PDF reader (modal) ──────────────────────────────────────────

type ReaderTarget = { book: TafsirBook; volume: TafsirVolume; page?: number };

function PdfReader({ target, onClose, isDark }: {
  target: ReaderTarget; onClose: () => void; isDark: boolean;
}) {
  const { book, volume } = target;
  const storageKey = `isa:tafsir-page:${book.id}:${volume.n}`;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(target.page ?? 1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);      // document loading
  const [rendering, setRendering] = useState(false); // page rendering
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState('');

  // Restore last-read page (unless a jump target was given)
  useEffect(() => {
    if (target.page) return;
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved > 1) setPage(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Load the PDF document (pdf.js streams it with range requests)
  useEffect(() => {
    let cancelled = false;
    let doc: any = null;
    (async () => {
      try {
        setLoading(true); setError(null);
        const pdfjs = await import('pdfjs-dist');
        // Worker is served from /public (copied from pdfjs-dist/build) — bundling
        // it via new URL() makes Next's compiler choke on the minified file.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        // TRUE page-by-page streaming: without these flags pdf.js keeps the
        // initial request open and downloads the ENTIRE file in the background
        // (hundreds of MB for these scans). disableStream aborts that request
        // once headers confirm range support, and disableAutoFetch stops the
        // background full fetch — after that pdf.js requests only the byte
        // ranges needed for the page being viewed (~2-4 chunks per page).
        const task = pdfjs.getDocument({
          url: bookStreamUrl(volume.file),
          disableStream: true,
          disableAutoFetch: true,
          rangeChunkSize: 262144, // 256 KB — scanned pages span 1-2 chunks
        });
        doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage((p) => Math.min(Math.max(1, p), doc.numPages));
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setLoading(false);
          setError(
            e?.message?.includes('Failed to fetch') || e?.name === 'UnexpectedResponseException'
              ? 'The book file is not reachable yet. It may still be uploading — try again shortly, or use "Original source" below.'
              : `Couldn't open the book: ${e?.message ?? 'unknown error'}`,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
      docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, [volume.file]);

  // Render the current page to canvas
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || loading) return;
    let cancelled = false;
    (async () => {
      try {
        setRendering(true);
        renderTaskRef.current?.cancel?.();
        const pg = await doc.getPage(page);
        if (cancelled) return;
        // Fit-to-width base scale, then apply user zoom (crisp on HiDPI)
        const holder = canvas.parentElement!;
        const base = (holder.clientWidth - 8) / pg.getViewport({ scale: 1 }).width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pg.getViewport({ scale: base * zoom });
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext('2d')!;
        const task = pg.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
        renderTaskRef.current = task;
        await task.promise;

        // Quietly warm the NEXT page's byte ranges (tiny offscreen render) so
        // flipping forward is instant. Chunks land in pdf.js's transport cache.
        if (!cancelled && page < doc.numPages) {
          doc.getPage(page + 1).then((nx: any) => {
            if (cancelled) return;
            const vp = nx.getViewport({ scale: 0.15 });
            const off = document.createElement('canvas');
            off.width = Math.ceil(vp.width); off.height = Math.ceil(vp.height);
            nx.render({ canvasContext: off.getContext('2d')!, viewport: vp }).promise.catch(() => {});
          }).catch(() => {});
        }
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') console.error(e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, zoom, loading]);

  // Persist last-read page
  useEffect(() => {
    if (numPages > 0) try { localStorage.setItem(storageKey, String(page)); } catch {}
  }, [page, numPages, storageKey]);

  const go = useCallback((delta: number) => {
    setPage((p) => Math.min(Math.max(1, p + delta), numPages || 1));
  }, [numPages]);

  // Keyboard: arrows flip pages (RTL book — left arrow = next page)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(1);
      else if (e.key === 'ArrowRight') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // Approximate page for a Parah (linear across the volume's Parah span).
  // Scanned books have no reliable per-Parah bookmarks, so this lands close by.
  const paraJump = (para: number) => {
    if (!numPages) return;
    const [from, to] = volume.paras;
    const span = to - from + 1;
    const frac = (para - from) / span;
    setPage(Math.min(numPages, Math.max(1, Math.round(8 + frac * (numPages - 8)))));
  };

  const jumpToInput = () => {
    const n = Number(pageInput);
    if (Number.isFinite(n) && n >= 1) setPage(Math.min(numPages || 1, Math.round(n)));
    setPageInput('');
  };

  const paras = useMemo(() => {
    const [from, to] = volume.paras;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [volume.paras]);

  // Theme tokens — the reader is a themed in-app panel, not a stark takeover.
  const t = isDark
    ? {
        panel: 'border-white/12 text-parchment',
        panelBg: 'linear-gradient(165deg, rgba(16,42,28,0.96) 0%, rgba(9,24,16,0.97) 100%)',
        bar: 'border-white/10',
        sub: 'text-parchment/50',
        chip: 'bg-white/8 hover:bg-emerald-500/20 text-parchment/85',
        chipLabel: 'text-parchment/45',
        iconBtn: 'hover:bg-white/10 text-parchment/70',
        ctrl: 'bg-white/8 hover:bg-white/[0.14] text-parchment',
        pageWell: 'bg-black/25',
        input: 'bg-white/8 border-white/15 text-parchment placeholder:text-parchment/50 focus:border-gold-300/60',
        faint: 'text-parchment/45',
      }
    : {
        panel: 'border-emerald-900/[0.10] text-emerald-950',
        panelBg: 'linear-gradient(165deg, rgba(255,255,255,0.97) 0%, rgba(240,250,244,0.98) 100%)',
        bar: 'border-emerald-900/[0.08]',
        sub: 'text-emerald-900/50',
        chip: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100',
        chipLabel: 'text-emerald-900/45',
        iconBtn: 'hover:bg-emerald-50 text-emerald-800/70',
        ctrl: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-100',
        pageWell: 'bg-emerald-900/[0.05]',
        input: 'bg-white border-emerald-200 text-emerald-950 placeholder:text-emerald-900/45 focus:border-emerald-400',
        faint: 'text-emerald-900/45',
      };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-5"
      style={{ background: isDark ? 'rgba(3,10,6,0.60)' : 'rgba(8,20,14,0.38)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className={`relative w-full max-w-5xl h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${t.panel}`}
        style={{ background: t.panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        {/* gold accent — same signature as the app's cards */}
        <div className="shrink-0 h-[3px] bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-600" />

        {/* ── top bar ── */}
        <div className={`shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3 border-b ${t.bar}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${book.cover}`}>
            <BookOpen size={16} className="text-white/90" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-sm truncate">{book.title}</p>
            <p className={`text-[11px] truncate ${t.sub}`}>
              {book.volumes.length > 1 ? `Volume ${volume.n} · Parah ${volume.paras[0]}–${volume.paras[1]} · ` : ''}
              {book.author}
            </p>
          </div>

          {/* Parah jump */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${t.chipLabel}`}>Parah:</span>
            {paras.map((p) => (
              <button key={p} onClick={() => paraJump(p)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${t.chip}`}>
                {p}
              </button>
            ))}
          </div>

          <a href={bookPdfUrl(volume.file)} download target="_blank" rel="noreferrer"
            title={`Download PDF (${sizeLabel(volume.sizeMb)})`}
            className={`p-2 rounded-lg transition ${t.iconBtn}`}>
            <Download size={16} />
          </a>
          <button onClick={onClose} className={`p-2 rounded-lg transition ${t.iconBtn}`} aria-label="Close reader">
            <X size={18} />
          </button>
        </div>

        {/* ── page canvas ── */}
        <div className={`flex-1 overflow-auto flex items-start justify-center p-3 sm:p-5 ${t.pageWell}`}>
          {loading && !error && (
            <div className="m-auto flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm font-medium">Opening book…</p>
              <p className={`text-[11px] ${t.faint}`}>Only the page you read is fetched — never the whole {sizeLabel(volume.sizeMb)} file.</p>
            </div>
          )}
          {error && (
            <div className="m-auto max-w-sm text-center space-y-3">
              <AlertCircle size={26} className="mx-auto text-amber-500" />
              <p className="text-sm leading-relaxed">{error}</p>
              <a href={book.sourceUrl} target="_blank" rel="noreferrer"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${isDark ? 'text-gold-300' : 'text-gold-700'}`}>
                <ExternalLink size={12} /> Original source ({book.source})
              </a>
            </div>
          )}
          {!loading && !error && (
            <div className={`relative rounded-lg overflow-hidden bg-white ${isDark ? 'shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]' : 'shadow-[0_18px_50px_-16px_rgba(16,40,30,0.35)] ring-1 ring-emerald-900/[0.06]'}`}>
              <canvas ref={canvasRef} />
              {rendering && (
                <div className="absolute inset-0 grid place-items-center bg-white/40">
                  <Loader2 size={22} className="animate-spin text-emerald-700" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── bottom controls ── */}
        {!loading && !error && (
          <div className={`shrink-0 flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 border-t ${t.bar}`}>
            {/* RTL book: "next page" moves left */}
            <button onClick={() => go(1)} disabled={page >= numPages}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl disabled:opacity-30 transition text-sm font-semibold ${t.ctrl}`}>
              <ChevronLeft size={16} /> Next
            </button>

            <div className="flex items-center gap-1.5 text-sm tabular-nums">
              <input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && jumpToInput()}
                onBlur={() => pageInput && jumpToInput()}
                placeholder={String(page)}
                className={`w-14 px-2 py-1.5 rounded-lg border text-center text-sm focus:outline-none ${t.input}`}
                aria-label="Go to page"
              />
              <span className={t.faint}>/ {numPages}</span>
            </div>

            <button onClick={() => go(-1)} disabled={page <= 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl disabled:opacity-30 transition text-sm font-semibold ${t.ctrl}`}>
              Prev <ChevronRight size={16} />
            </button>

            <span className={`mx-1 h-6 w-px hidden sm:block ${isDark ? 'bg-white/15' : 'bg-emerald-900/10'}`} />
            <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}
              className={`p-2 rounded-xl transition ${t.ctrl}`} title="Zoom out"><ZoomOut size={15} /></button>
            <span className={`text-xs tabular-nums w-10 text-center ${t.faint}`}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
              className={`p-2 rounded-xl transition ${t.ctrl}`} title="Zoom in"><ZoomIn size={15} /></button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── Book card ────────────────────────────────────────────────────────────────

function BookCard({ book, onRead, isDark, delay }: {
  book: TafsirBook; onRead: (volume: TafsirVolume) => void; isDark: boolean; delay: number;
}) {
  const multi = book.volumes.length > 1;
  const [volOpen, setVolOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl border p-5 ${
        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-emerald-900/[0.08] bg-white shadow-[0_1px_3px_rgba(16,40,30,0.04),0_16px_38px_-18px_rgba(16,40,30,0.18)]'
      }`}
    >
      <div className="flex gap-4">
        {/* book spine */}
        <div className={`relative shrink-0 w-24 h-32 rounded-xl bg-gradient-to-br ${book.cover} shadow-lg grid place-items-center`}>
          <BookMarked size={26} className="text-white/85" />
          <span className="absolute inset-x-0 bottom-2 text-center text-[9px] font-bold text-white/75 px-1">
            {multi ? `${book.volumes.length} VOLUMES` : `${book.pages?.toLocaleString()} PAGES`}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p dir="rtl" className={`font-arabic text-xl leading-snug ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{book.urduTitle}</p>
          <h3 className={`mt-1 text-sm font-bold leading-snug ${isDark ? 'text-parchment/90' : 'text-emerald-950'}`}>{book.title}</h3>
          <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-parchment/60' : 'text-ink/60'}`}>
            by: {book.author}{book.tafsirBy ? ` · ${book.tafsirBy}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-white/8 text-parchment/70' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{book.language}</span>
            <span className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-white/8 text-parchment/70' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{sizeLabel(bookSizeMb(book))}</span>
            <span className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-gold-400/10 text-gold-300' : 'bg-gold-50 text-gold-700 border border-gold-200/60'}`}>{book.source}</span>
          </div>
        </div>
      </div>

      <p className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-parchment/65' : 'text-ink/65'}`}>{book.blurb}</p>
      <p className={`mt-1.5 text-[11px] leading-relaxed font-medium ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
        Soft copy — read page by page in this book, or search any chapter and filter by topic below.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {multi ? (
          <div className="relative flex-1">
            <button onClick={() => setVolOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 transition">
              <Layers size={15} /> Read — choose volume <ChevronDown size={14} className={`transition-transform ${volOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {volOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                  className={`absolute bottom-full mb-2 left-0 right-0 z-30 rounded-2xl border shadow-2xl overflow-hidden max-h-64 overflow-y-auto ${
                    isDark ? 'bg-[#0d2018] border-emerald-500/20' : 'bg-white border-emerald-100'
                  }`}
                >
                  {book.volumes.map((v) => (
                    <button key={v.n} onClick={() => { setVolOpen(false); onRead(v); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition ${
                        isDark ? 'text-parchment/85 hover:bg-emerald-500/10' : 'text-emerald-950 hover:bg-emerald-50'
                      }`}>
                      <span className="font-semibold">Volume {v.n}</span>
                      <span className={`text-xs ${isDark ? 'text-parchment/50' : 'text-ink/45'}`}>
                        Parah {v.paras[0]}–{v.paras[1]} · {sizeLabel(v.sizeMb)}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button onClick={() => onRead(book.volumes[0])}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 transition">
            <BookOpen size={15} /> Read this book
          </button>
        )}
        <a href={book.sourceUrl} target="_blank" rel="noreferrer" title={`Original source: ${book.source}`}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition ${
            isDark ? 'border-white/15 text-parchment/60 hover:bg-white/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}>
          <ExternalLink size={15} />
        </a>
      </div>
    </motion.div>
  );
}

// ── Search panel (structured Kanzul Iman text) ───────────────────────────────

function TafsirSearch({ onOpenPara, isDark }: {
  onOpenPara: (book: TafsirBook, para: number) => void; isDark: boolean;
}) {
  const [query, setQuery] = useState('');
  const [surahFilter, setSurahFilter] = useState(0); // 0 = all chapters
  const [results, setResults] = useState<KanzAyah[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true); setError(null);
    try {
      const text = await fetchKanzulImanText();
      setResults(searchKanz(text, query, surahFilter || undefined));
    } catch {
      setError('Search is unavailable right now (Quran text service unreachable). Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const inputCls = isDark
    ? 'bg-white/[0.06] border-white/12 text-parchment placeholder:text-parchment/35'
    : 'bg-white border-emerald-200 text-emerald-950 placeholder:text-emerald-900/35';

  return (
    <div className={`rounded-3xl border p-5 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-emerald-900/[0.08] bg-white shadow-sm'}`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${isDark ? 'bg-gold-400/15 text-gold-300' : 'bg-gold-100 text-gold-600'}`}>
          <Search size={16} />
        </span>
        <div>
          <h3 className={`font-bold leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Search inside the tafsir</h3>
          <p className={`text-xs ${isDark ? 'text-parchment/55' : 'text-ink/55'}`}>
            Searches the Kanzul Iman translation text (Urdu) — every match links to its Parah in the books.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          dir="auto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="e.g. رحمت — type any Urdu word or phrase"
          className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${inputCls}`}
        />
        {/* chapter (surah) filter — themed scrollable dropdown */}
        <ChapterDropdown value={surahFilter} onChange={setSurahFilter} isDark={isDark} />
        <button onClick={runSearch} disabled={searching || query.trim().length < 2}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 transition">
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search
        </button>
      </div>

      {error && (
        <p className={`mt-3 text-xs flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {results !== null && !error && (
        <div className="mt-4 space-y-2 max-h-[26rem] overflow-y-auto pr-1">
          <p className={`text-xs font-semibold ${isDark ? 'text-parchment/55' : 'text-ink/55'}`}>
            {results.length === 0 ? 'No matches found.' : `${results.length}${results.length >= 60 ? '+' : ''} matching ayahs`}
          </p>
          {results.map((r, i) => (
            <div key={`${r.surah}:${r.ayah}-${i}`}
              className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/8 bg-white/[0.03]' : 'border-emerald-900/[0.06] bg-emerald-50/40'}`}>
              <p dir="rtl" className={`font-arabic text-lg leading-relaxed ${isDark ? 'text-parchment/90' : 'text-emerald-950'}`}>{r.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold ${isDark ? 'text-gold-300' : 'text-gold-700'}`}>
                  {r.surahName} {r.surah}:{r.ayah} · Parah {r.juz}
                </span>
                <span className="flex-1" />
                {TAFSIR_BOOKS.map((b) => (
                  <button key={b.id} onClick={() => onOpenPara(b, r.juz)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                      isDark ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}>
                    <BookOpen size={10} /> {b.id === 'kanzul-iman' ? 'Kanzul Iman' : 'Sirat-ul-Jinan'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section root ─────────────────────────────────────────────────────────────

export function TafsirSection({ isDark }: { isDark: boolean }) {
  const [reader, setReader] = useState<ReaderTarget | null>(null);

  const openPara = (book: TafsirBook, para: number) => {
    const volume = volumeForPara(book, para);
    // Approximate page within the volume for this Parah (reader refines via its own jump)
    setReader({ book, volume });
  };

  return (
    <div className="space-y-5">
      {/* bookshelf */}
      <div className="grid gap-5 lg:grid-cols-2">
        {TAFSIR_BOOKS.map((book, i) => (
          <BookCard key={book.id} book={book} isDark={isDark} delay={i * 0.06}
            onRead={(volume) => setReader({ book, volume })} />
        ))}
      </div>

      {/* search */}
      <TafsirSearch isDark={isDark} onOpenPara={openPara} />

      {/* reader modal */}
      {reader && <PdfReader target={reader} onClose={() => setReader(null)} isDark={isDark} />}
    </div>
  );
}
