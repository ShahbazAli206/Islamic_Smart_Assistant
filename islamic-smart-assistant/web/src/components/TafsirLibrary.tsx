'use client';

// ── Tafsir-ul-Quran section (Islamic Library page) ───────────────────────────
// ONE uniform library: every tafsir — scanned book (PDF) or structured text —
// is a card in the same grid, opening the same themed reader popup with the
// same controls (chapter/parah navigation, next/prev, current/total, zoom,
// download where a file exists).
//
// PDF books stream page-by-page via pdf.js range requests through the
// same-origin /api/tafsir-book proxy; text tafsirs read verse-wise from the
// Quran.com API (CORS-open). Search runs over the structured Kanzul Iman
// translation text and links every hit into the books.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronLeft, ChevronRight, ChevronDown, X, Search, Loader2,
  ZoomIn, ZoomOut, Download, ExternalLink, BookMarked, AlertCircle,
  Check, ListFilter, RefreshCw, Layers, FileText,
} from 'lucide-react';
import {
  TAFSIR_BOOKS, bookPdfUrl, bookStreamUrl, bookSizeMb, sizeLabel, volumeForPara,
  fetchKanzulImanText, searchKanz, AYAH_TAFSIRS, fetchAyahTafsir,
  type TafsirBook, type TafsirVolume, type KanzAyah, type AyahTafsir,
} from '@/lib/tafsirBooks';
import { SURAHS } from '@/lib/surahs';

// ── Unified library catalogue ────────────────────────────────────────────────

type LibBook =
  | { kind: 'pdf'; id: string; pdf: TafsirBook }
  | { kind: 'text'; id: string; taf: AyahTafsir; urduTitle: string; cover: string };

const TEXT_META: Record<number, { urduTitle: string; cover: string }> = {
  169: { urduTitle: 'تفسير ابن كثير', cover: 'from-midnight-600 via-midnight-700 to-midnight-900' },
  160: { urduTitle: 'تفسير ابن كثير', cover: 'from-emerald-600 via-emerald-700 to-emerald-950' },
  14:  { urduTitle: 'تفسير ابن كثير', cover: 'from-midnight-700 via-midnight-800 to-black' },
  168: { urduTitle: 'معارف القرآن',   cover: 'from-gold-500 via-gold-600 to-gold-900' },
  159: { urduTitle: 'بیان القرآن',    cover: 'from-emerald-700 via-emerald-800 to-midnight-900' },
  818: { urduTitle: 'تذکیر القرآن',   cover: 'from-rose-600 via-rose-700 to-rose-950' },
};

const LIB_BOOKS: LibBook[] = [
  ...TAFSIR_BOOKS.map((pdf): LibBook => ({ kind: 'pdf', id: pdf.id, pdf })),
  ...AYAH_TAFSIRS.map((taf): LibBook => ({
    kind: 'text', id: `text-${taf.id}`, taf,
    urduTitle: TEXT_META[taf.id]?.urduTitle ?? taf.name,
    cover: TEXT_META[taf.id]?.cover ?? 'from-emerald-700 to-emerald-950',
  })),
];

// ── Shared reader theme tokens ───────────────────────────────────────────────

function readerTokens(isDark: boolean) {
  return isDark
    ? {
        panel: 'border-white/12 text-parchment',
        panelBg: 'linear-gradient(165deg, rgba(16,42,28,0.96) 0%, rgba(9,24,16,0.97) 100%)',
        bar: 'border-white/10',
        sub: 'text-parchment/50',
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
        iconBtn: 'hover:bg-emerald-50 text-emerald-800/70',
        ctrl: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-100',
        pageWell: 'bg-emerald-900/[0.05]',
        input: 'bg-white border-emerald-200 text-emerald-950 placeholder:text-emerald-900/45 focus:border-emerald-400',
        faint: 'text-emerald-900/45',
      };
}

// ── Small themed listbox helpers ─────────────────────────────────────────────

function useClickAway(ref: React.RefObject<HTMLDivElement | null>, onAway: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onAway();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [active, ref, onAway]);
}

const popCls = (isDark: boolean) =>
  `absolute top-full mt-2 right-0 z-50 rounded-2xl border shadow-2xl overflow-hidden ${
    isDark ? 'bg-[#0d2018] border-emerald-500/25 shadow-black/60' : 'bg-white border-emerald-100 shadow-emerald-900/15'
  }`;

const rowCls = (isDark: boolean, sel: boolean) =>
  `w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-[13px] transition ${
    sel
      ? (isDark ? 'bg-emerald-600 text-white font-semibold' : 'bg-emerald-500 text-white font-semibold')
      : (isDark ? 'text-parchment/85 hover:bg-emerald-500/10' : 'text-emerald-950 hover:bg-emerald-50')
  }`;

const trigCls = (isDark: boolean) =>
  `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
    isDark
      ? 'bg-white/8 border-white/12 text-parchment/85 hover:bg-white/[0.14]'
      : 'bg-white border-emerald-200 text-emerald-900 hover:bg-emerald-50'
  }`;

// ── Themed chapter (surah) dropdown ──────────────────────────────────────────

function ChapterDropdown({ value, onChange, isDark, allowAll = true, compact = false }: {
  value: number; onChange: (v: number) => void; isDark: boolean; allowAll?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickAway(wrapRef, () => setOpen(false), open);

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) => s.englishName.toLowerCase().includes(q) || String(s.number) === q || s.arabic.includes(filter.trim()),
    );
  }, [filter]);

  const selected = value ? SURAHS.find((s) => s.number === value) : null;
  const label = selected ? `${selected.number}. ${selected.englishName}` : allowAll ? 'All chapters' : 'Choose chapter';

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setFilter(''); }}
        aria-label="Filter by chapter"
        className={compact
          ? trigCls(isDark)
          : `w-full sm:w-52 flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition ${
              isDark
                ? 'bg-white/[0.06] border-white/12 text-parchment hover:bg-white/[0.10] hover:border-white/20'
                : 'bg-white border-emerald-200 text-emerald-950 hover:bg-emerald-50'
            }`}
      >
        <ListFilter size={compact ? 12 : 14} className={`shrink-0 ${isDark ? 'text-gold-300' : 'text-gold-600'}`} />
        <span className={`min-w-0 truncate text-left ${compact ? 'max-w-[9rem]' : 'flex-1'}`}>{label}</span>
        <ChevronDown size={compact ? 12 : 14} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-parchment/50' : 'text-emerald-700/50'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`${popCls(isDark)} ${compact ? '' : 'left-0 right-auto'} w-64`}
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
              {[...(allowAll ? [null] : []), ...options].map((s) => {
                const num = s?.number ?? 0;
                const isSel = num === value;
                if (s === null && filter.trim()) return null;
                return (
                  <button key={num} type="button" onClick={() => { onChange(num); setOpen(false); }} className={rowCls(isDark, isSel)}>
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

// ── Parah jump dropdown (PDF reader top bar) ─────────────────────────────────

function ParaDropdown({ paras, onJump, isDark }: {
  paras: number[]; onJump: (p: number) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickAway(wrapRef, () => setOpen(false), open);

  const shown = filter.trim() ? paras.filter((p) => String(p).startsWith(filter.trim())) : paras;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button type="button" onClick={() => { setOpen((o) => !o); setFilter(''); }} className={trigCls(isDark)}>
        <BookMarked size={12} className={isDark ? 'text-gold-300' : 'text-gold-600'} />
        {selected ? `Parah ${selected}` : 'Jump to Parah'}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-parchment/50' : 'text-emerald-700/50'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`${popCls(isDark)} w-44`}
          >
            <div className={`p-2 border-b ${isDark ? 'border-white/8' : 'border-emerald-50'}`}>
              <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${isDark ? 'bg-white/[0.06]' : 'bg-emerald-50/60'}`}>
                <Search size={12} className={isDark ? 'text-parchment/40' : 'text-emerald-700/40'} />
                <input
                  autoFocus
                  inputMode="numeric"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Parah number…"
                  className={`w-full bg-transparent text-xs focus:outline-none ${
                    isDark ? 'text-parchment placeholder:text-parchment/35' : 'text-emerald-950 placeholder:text-emerald-900/35'
                  }`}
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
              {shown.map((p) => (
                <button key={p} type="button"
                  onClick={() => { setSelected(p); setOpen(false); onJump(p); }}
                  className={rowCls(isDark, p === selected)}>
                  <span>Parah {p}</span>
                  {p === selected && <Check size={13} className="shrink-0" />}
                </button>
              ))}
              {shown.length === 0 && (
                <p className={`px-3.5 py-3 text-xs ${isDark ? 'text-parchment/45' : 'text-ink/45'}`}>No Parah matches.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Volume dropdown (PDF reader top bar, multi-volume books) ────────────────

function VolumeDropdown({ volumes, value, onChange, isDark }: {
  volumes: TafsirVolume[]; value: TafsirVolume; onChange: (v: TafsirVolume) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickAway(wrapRef, () => setOpen(false), open);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className={trigCls(isDark)}>
        <Layers size={12} className={isDark ? 'text-gold-300' : 'text-gold-600'} />
        Volume {value.n}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-parchment/50' : 'text-emerald-700/50'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`${popCls(isDark)} w-60`}
          >
            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
              {volumes.map((v) => (
                <button key={v.n} type="button"
                  onClick={() => { setOpen(false); if (v.n !== value.n) onChange(v); }}
                  className={rowCls(isDark, v.n === value.n)}>
                  <span className="font-semibold">Volume {v.n}</span>
                  <span className={`text-[11px] ${v.n === value.n ? 'text-white/75' : isDark ? 'text-parchment/45' : 'text-ink/45'}`}>
                    Parah {v.paras[0]}–{v.paras[1]} · {sizeLabel(v.sizeMb)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared reader shell ──────────────────────────────────────────────────────
// One popup frame used by BOTH readers so every book looks and behaves alike.

function ReaderShell({ isDark, onClose, coverGrad, title, subtitle, headerRight, footer, children, fitWidth }: {
  isDark: boolean; onClose: () => void;
  coverGrad: string; title: string; subtitle: string;
  headerRight: React.ReactNode; footer: React.ReactNode | null; children: React.ReactNode;
  fitWidth?: boolean; // true = panel hugs content width (PDF pages)
}) {
  const t = readerTokens(isDark);
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
        className={`relative ${fitWidth ? 'w-fit min-w-[min(94vw,560px)]' : 'w-full max-w-3xl'} max-w-[96vw] h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${t.panel}`}
        style={{ background: t.panelBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        {/* gold accent — same signature as the app's cards */}
        <div className="shrink-0 h-[3px] bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-600" />

        {/* top bar */}
        <div className={`shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3 border-b ${t.bar}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${coverGrad}`}>
            <BookOpen size={16} className="text-white/90" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-sm truncate">{title}</p>
            <p className={`text-[11px] truncate ${t.sub}`}>{subtitle}</p>
          </div>
          {headerRight}
          <button onClick={onClose} className={`p-2 rounded-lg transition ${t.iconBtn}`} aria-label="Close reader">
            <X size={18} />
          </button>
        </div>

        {children}

        {footer && (
          <div className={`shrink-0 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-3 border-t ${t.bar}`}>
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Friendly network-error body shared by both readers. */
function ReaderError({ isDark, onReload }: { isDark: boolean; onReload: () => void }) {
  const t = readerTokens(isDark);
  return (
    <div className="m-auto max-w-xs text-center space-y-4 px-6">
      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
        <AlertCircle size={24} className="text-amber-500" />
      </span>
      <p className="text-sm font-semibold">Network error</p>
      <p className={`text-xs leading-relaxed ${t.faint}`}>The book couldn&apos;t load. Check your internet connection and try again.</p>
      <button onClick={onReload}
        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 transition">
        <RefreshCw size={14} /> Reload
      </button>
    </div>
  );
}

// ── PDF reader (scanned books, page by page) ─────────────────────────────────

function PdfReader({ book, initialVolume, onClose, isDark }: {
  book: TafsirBook; initialVolume: TafsirVolume; onClose: () => void; isDark: boolean;
}) {
  const [volume, setVolume] = useState(initialVolume);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Re-render the page when the window resizes so it keeps filling the height
  const [viewTick, setViewTick] = useState(0);
  useEffect(() => {
    const onResize = () => setViewTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);      // document loading
  const [rendering, setRendering] = useState(false); // page rendering
  const [error, setError] = useState(false);
  // null = not editing (input mirrors the current page number)
  const [pageInput, setPageInput] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0); // bumped by the Reload button

  // Load the PDF document (pdf.js streams it with range requests)
  useEffect(() => {
    let cancelled = false;
    let doc: any = null;
    (async () => {
      try {
        setLoading(true); setError(false);
        const pdfjs = await import('pdfjs-dist');
        // Worker is served from /public (copied from pdfjs-dist/build) — bundling
        // it via new URL() makes Next's compiler choke on the minified file.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        // TRUE page-by-page streaming: without these flags pdf.js keeps the
        // initial request open and downloads the ENTIRE file in the background.
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
      } catch {
        // Whatever failed underneath, the user-facing story is the same:
        // the book couldn't be fetched — show a plain network notice + Reload.
        if (!cancelled) { setLoading(false); setError(true); }
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
      docRef.current?.destroy?.();
      docRef.current = null;
    };
  }, [volume.file, loadTick]);

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
        // Height-driven fit: the page always fills the viewer's height, and
        // the panel's width follows the page (w-fit) so there's no dead space
        // beside the book. The viewport width only acts as an upper cap.
        const holder = holderRef.current ?? canvas.parentElement!;
        const vw1 = pg.getViewport({ scale: 1 });
        const availH = holder.clientHeight - 16;
        const maxW = Math.min(window.innerWidth * 0.94, 1100) - 24;
        const base = Math.min(availH / vw1.height, maxW / vw1.width);
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
  }, [page, zoom, loading, viewTick]);

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
  const paraJump = (para: number) => {
    if (!numPages) return;
    const [from, to] = volume.paras;
    const span = to - from + 1;
    const frac = (para - from) / span;
    setPage(Math.min(numPages, Math.max(1, Math.round(8 + frac * (numPages - 8)))));
  };

  const switchVolume = (v: TafsirVolume) => { setVolume(v); setPage(1); setZoom(1); };

  const paras = useMemo(() => {
    const [from, to] = volume.paras;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [volume.paras]);

  const t = readerTokens(isDark);

  return (
    <ReaderShell
      isDark={isDark} onClose={onClose} fitWidth
      coverGrad={book.cover}
      title={book.title}
      subtitle={`${book.volumes.length > 1 ? `Volume ${volume.n} · Parah ${volume.paras[0]}–${volume.paras[1]} · ` : ''}${book.author}`}
      headerRight={
        <div className="flex items-center gap-1.5">
          {book.volumes.length > 1 && (
            <VolumeDropdown volumes={book.volumes} value={volume} onChange={switchVolume} isDark={isDark} />
          )}
          <ParaDropdown paras={paras} onJump={paraJump} isDark={isDark} />
          <a href={bookPdfUrl(volume.file)} download target="_blank" rel="noreferrer"
            title={`Download this ${book.volumes.length > 1 ? `volume (${sizeLabel(volume.sizeMb)})` : `book (${sizeLabel(volume.sizeMb)})`}`}
            className={`p-2 rounded-lg transition ${t.iconBtn}`}>
            <Download size={16} />
          </a>
        </div>
      }
      footer={loading || error ? null : (
        <>
          {/* RTL book: "next page" moves left */}
          <button onClick={() => go(1)} disabled={page >= numPages}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl disabled:opacity-30 transition text-sm font-semibold ${t.ctrl}`}>
            <ChevronLeft size={16} /> Next
          </button>

          <div className="flex items-center gap-1.5 text-sm tabular-nums">
            {/* Shows the CURRENT page number; type to jump (Enter or blur) */}
            <input
              value={pageInput ?? String(page)}
              onFocus={(e) => { setPageInput(String(page)); e.target.select(); }}
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              onBlur={() => {
                const n = Number(pageInput);
                if (pageInput && Number.isFinite(n) && n >= 1) {
                  setPage(Math.min(numPages || 1, Math.round(n)));
                }
                setPageInput(null);
              }}
              className={`w-16 px-2 py-1.5 rounded-lg border text-center text-sm font-bold focus:outline-none ${t.input}`}
              aria-label="Current page — type to jump"
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
        </>
      )}
    >
      <div ref={holderRef} className={`flex-1 overflow-auto flex p-2 ${t.pageWell}`}>
        {loading && !error && (
          <div className="m-auto flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Opening book…</p>
            <p className={`text-[11px] ${t.faint}`}>Only the page you read is fetched — never the whole {sizeLabel(volume.sizeMb)} file.</p>
          </div>
        )}
        {error && <ReaderError isDark={isDark} onReload={() => setLoadTick((n) => n + 1)} />}
        {!loading && !error && (
          <div className={`relative m-auto rounded-lg overflow-hidden bg-white ${isDark ? 'shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]' : 'shadow-[0_18px_50px_-16px_rgba(16,40,30,0.35)] ring-1 ring-emerald-900/[0.06]'}`}>
            <canvas ref={canvasRef} />
            {rendering && (
              <div className="absolute inset-0 grid place-items-center bg-white/40">
                <Loader2 size={22} className="animate-spin text-emerald-700" />
              </div>
            )}
          </div>
        )}
      </div>
    </ReaderShell>
  );
}

// ── Text reader (structured tafsir, ayah by ayah) — same shell & controls ────

function TextReader({ taf, urduTitle, coverGrad, onClose, isDark, initialSurah = 1, initialAyah = 1 }: {
  taf: AyahTafsir; urduTitle: string; coverGrad: string; onClose: () => void; isDark: boolean;
  initialSurah?: number; initialAyah?: number;
}) {
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  const [fontScale, setFontScale] = useState(1); // zoom for text
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  // null = not editing (input mirrors the current ayah number)
  const [ayahInput, setAyahInput] = useState<string | null>(null);

  const surahMeta = SURAHS.find((s) => s.number === surah)!;
  const maxAyah = surahMeta.ayahs;

  // Fetch on any selection change
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false);
    fetchAyahTafsir(taf.id, surah, ayah)
      .then((text) => { if (!cancelled) setHtml(text); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taf.id, surah, ayah, loadTick]);

  // Step across surah boundaries
  const step = useCallback((d: 1 | -1) => {
    if (d === 1) {
      if (ayah < maxAyah) setAyah(ayah + 1);
      else if (surah < 114) { setSurah(surah + 1); setAyah(1); }
    } else {
      if (ayah > 1) setAyah(ayah - 1);
      else if (surah > 1) { const prev = SURAHS.find((s) => s.number === surah - 1)!; setSurah(surah - 1); setAyah(prev.ayahs); }
    }
  }, [ayah, surah, maxAyah]);

  // Keyboard: match the PDF reader (left = next for RTL reading flow)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(1);
      else if (e.key === 'ArrowRight') step(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  const pickSurah = (n: number) => { setSurah(n); setAyah(1); };

  const isRtl = taf.dir === 'rtl';
  const t = readerTokens(isDark);

  return (
    <ReaderShell
      isDark={isDark} onClose={onClose}
      coverGrad={coverGrad}
      title={taf.name}
      subtitle={`${taf.author} · ${taf.school}`}
      headerRight={
        <div className="flex items-center gap-1.5">
          <ChapterDropdown value={surah} onChange={pickSurah} isDark={isDark} allowAll={false} compact />
        </div>
      }
      footer={loading && !html ? null : (
        <>
          <button onClick={() => step(1)} disabled={surah === 114 && ayah === maxAyah}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl disabled:opacity-30 transition text-sm font-semibold ${t.ctrl}`}>
            <ChevronLeft size={16} /> Next
          </button>

          <div className="flex items-center gap-1.5 text-sm tabular-nums">
            <span className={t.faint}>Ayah</span>
            {/* Shows the CURRENT ayah number; type to jump (Enter or blur) */}
            <input
              value={ayahInput ?? String(ayah)}
              onFocus={(e) => { setAyahInput(String(ayah)); e.target.select(); }}
              onChange={(e) => setAyahInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              onBlur={() => {
                const n = Number(ayahInput);
                if (ayahInput && Number.isFinite(n) && n >= 1) setAyah(Math.min(maxAyah, Math.round(n)));
                setAyahInput(null);
              }}
              className={`w-16 px-2 py-1.5 rounded-lg border text-center text-sm font-bold focus:outline-none ${t.input}`}
              aria-label="Current ayah — type to jump"
            />
            <span className={t.faint}>/ {maxAyah}</span>
          </div>

          <button onClick={() => step(-1)} disabled={surah === 1 && ayah === 1}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl disabled:opacity-30 transition text-sm font-semibold ${t.ctrl}`}>
            Prev <ChevronRight size={16} />
          </button>

          <span className={`mx-1 h-6 w-px hidden sm:block ${isDark ? 'bg-white/15' : 'bg-emerald-900/10'}`} />
          <button onClick={() => setFontScale((z) => Math.max(0.75, +(z - 0.125).toFixed(3)))}
            className={`p-2 rounded-xl transition ${t.ctrl}`} title="Smaller text"><ZoomOut size={15} /></button>
          <span className={`text-xs tabular-nums w-10 text-center ${t.faint}`}>{Math.round(fontScale * 100)}%</span>
          <button onClick={() => setFontScale((z) => Math.min(1.75, +(z + 0.125).toFixed(3)))}
            className={`p-2 rounded-xl transition ${t.ctrl}`} title="Larger text"><ZoomIn size={15} /></button>
        </>
      )}
    >
      <div className={`flex-1 overflow-y-auto px-5 sm:px-8 py-5 ${t.pageWell}`}>
        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-gold-300/80' : 'text-gold-700'}`}>
          {surahMeta.englishName} {surah}:{ayah}
        </p>
        {loading && (
          <div className="flex items-center gap-2 py-16 justify-center">
            <Loader2 size={20} className={`animate-spin ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`} />
            <span className={`text-xs ${t.faint}`}>Loading tafsir…</span>
          </div>
        )}
        {error && !loading && (
          <div className="flex py-10"><ReaderError isDark={isDark} onReload={() => setLoadTick((n) => n + 1)} /></div>
        )}
        {!loading && !error && (
          html ? (
            <div
              dir={taf.dir}
              lang={taf.language === 'english' ? 'en' : taf.language === 'urdu' ? 'ur' : 'ar'}
              style={{ fontSize: `${(isRtl ? 20 : 15) * fontScale}px`, lineHeight: 1.95 }}
              className={`mt-3 break-words ${isRtl ? 'font-arabic text-right' : ''}
                ${isDark ? 'text-parchment/90' : 'text-emerald-950/90'}
                [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold
                [&_h1]:text-[1.15em] [&_h2]:text-[1.08em] [&_h3]:text-[1.04em]
                [&_h1]:mt-5 [&_h2]:mt-5 [&_h3]:mt-4 [&_p]:mt-3
                ${isDark ? '[&_h1]:text-gold-300 [&_h2]:text-gold-300 [&_h3]:text-gold-300' : '[&_h1]:text-emerald-800 [&_h2]:text-emerald-800 [&_h3]:text-emerald-800'}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className={`mt-6 text-sm text-center ${t.faint}`}>
              No tafsir text for this ayah in this collection — it may be covered under a nearby ayah. Try Next or Prev.
            </p>
          )
        )}
      </div>
    </ReaderShell>
  );
}

// ── Real cover art ───────────────────────────────────────────────────────────
// Official publisher cover photos (Dawat-e-Islami for the two scanned books;
// Idara Ma'ariful Quran / Darussalam / Markazi Anjuman Khuddam-ul-Quran /
// Wahiduddin Khan's own edition for the text tafsirs), saved under
// /public/tafsir-covers. The three Ibn Kathir language editions share one
// physical set's cover. Falls back to the gradient block if an id has none.
const COVER_IMAGE: Record<string, string> = {
  'kanzul-iman':    '/tafsir-covers/kanzul-iman.jpg',
  'sirat-ul-jinan': '/tafsir-covers/sirat-ul-jinan.jpg',
  'text-169':       '/tafsir-covers/ibn-kathir.jpg',      // Ibn Kathir (English)
  'text-160':       '/tafsir-covers/ibn-kathir.jpg',      // Ibn Kathir (Urdu)
  'text-14':        '/tafsir-covers/ibn-kathir.jpg',      // Ibn Kathir (Arabic)
  'text-168':       '/tafsir-covers/maariful-quran.jpg',
  'text-159':       '/tafsir-covers/bayan-ul-quran.jpg',
  'text-818':       '/tafsir-covers/tazkir-ul-quran.jpg',
};

// ── Unified book card ────────────────────────────────────────────────────────

function LibraryCard({ book, onOpen, isDark, delay }: {
  book: LibBook; onOpen: () => void; isDark: boolean; delay: number;
}) {
  const coverGrad = book.kind === 'pdf' ? book.pdf.cover : book.cover;
  const coverImg = COVER_IMAGE[book.id];
  const [imgFailed, setImgFailed] = useState(false);
  const title = book.kind === 'pdf' ? book.pdf.title : book.taf.name;
  const urduTitle = book.kind === 'pdf' ? book.pdf.urduTitle : book.urduTitle;
  const author = book.kind === 'pdf'
    ? `${book.pdf.author}${book.pdf.tafsirBy ? ` · ${book.pdf.tafsirBy}` : ''}`
    : book.taf.author;
  const volumeLine = book.kind === 'pdf'
    ? (book.pdf.volumes.length > 1
        ? `${book.pdf.volumes.length} volumes · ${sizeLabel(bookSizeMb(book.pdf))}`
        : `1 volume · ${book.pdf.pages?.toLocaleString()} pages · ${sizeLabel(bookSizeMb(book.pdf))}`)
    : 'Text · all 114 surahs, ayah by ayah';
  const langLabel = book.kind === 'pdf' ? book.pdf.language : book.taf.language[0].toUpperCase() + book.taf.language.slice(1);
  const source = book.kind === 'pdf' ? book.pdf.source : 'Quran.com';
  const sourceUrl = book.kind === 'pdf' ? book.pdf.sourceUrl : 'https://quran.com';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className={`group relative flex gap-4 overflow-hidden rounded-3xl border p-4 transition hover:-translate-y-0.5 ${
        isDark
          ? 'border-white/10 bg-white/[0.04] hover:border-emerald-400/30'
          : 'border-emerald-900/[0.08] bg-white shadow-[0_1px_3px_rgba(16,40,30,0.04),0_16px_38px_-18px_rgba(16,40,30,0.18)] hover:border-emerald-300'
      }`}
    >
      {/* cover — real published book photo, book-spine shaped */}
      <button type="button" onClick={onOpen} aria-label={`Read ${title}`}
        className={`relative w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br ${coverGrad} shadow-md ring-1 ${isDark ? 'ring-white/10' : 'ring-black/5'}`}>
        {coverImg && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImg} alt={`${title} — cover`} loading="lazy" onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover select-none" />
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <BookMarked size={26} className="text-white/85" />
          </span>
        )}
        <span className="absolute top-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-md bg-black/50 text-white/90 backdrop-blur-sm">
          {book.kind === 'pdf' ? <BookOpen size={10} /> : <FileText size={10} />}
        </span>
      </button>

      {/* body */}
      <div className="flex flex-1 min-w-0 flex-col">
        <p dir="rtl" className={`font-arabic text-lg leading-snug ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{urduTitle}</p>
        <h3 className={`mt-0.5 text-[13px] font-bold leading-snug line-clamp-2 ${isDark ? 'text-parchment/90' : 'text-emerald-950'}`}>{title}</h3>
        <p className={`mt-1 text-[11px] leading-relaxed line-clamp-1 ${isDark ? 'text-parchment/60' : 'text-ink/60'}`}>by: {author}</p>
        <p className={`text-[10px] ${isDark ? 'text-parchment/45' : 'text-ink/45'}`}>{volumeLine}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
          <span className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-white/8 text-parchment/70' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{langLabel}</span>
          <span className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-gold-400/10 text-gold-300' : 'bg-gold-50 text-gold-700 border border-gold-200/60'}`}>{source}</span>
        </div>

        <div className="mt-auto pt-2.5 flex items-center gap-2">
          <button onClick={onOpen}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2 sm:py-2.5 transition">
            <BookOpen size={14} /> Read
          </button>
          <a href={sourceUrl} target="_blank" rel="noreferrer" title={`Original source: ${source}`}
            onClick={(e) => e.stopPropagation()}
            className={`grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-2xl border transition ${
              isDark ? 'border-white/15 text-parchment/60 hover:bg-white/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── "Open in" dropdown — per search result, jumps into ANY of the 8 books ────

function OpenInDropdown({ ayah, onOpen, isDark }: {
  ayah: KanzAyah; onOpen: (book: LibBook, ayah: KanzAyah) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickAway(wrapRef, () => setOpen(false), open);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition bg-emerald-600 text-white hover:bg-emerald-700">
        <BookOpen size={11} /> Read tafsir
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`${popCls(isDark)} w-64`}
          >
            <div className={`px-3.5 py-2 border-b text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'border-white/8 text-parchment/45' : 'border-emerald-50 text-ink/45'}`}>
              Choose a book
            </div>
            <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
              {LIB_BOOKS.map((b) => {
                const label = b.kind === 'pdf' ? b.pdf.title : b.taf.name;
                return (
                  <button key={b.id} type="button"
                    onClick={() => { setOpen(false); onOpen(b, ayah); }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] transition ${
                      isDark ? 'text-parchment/85 hover:bg-emerald-500/10' : 'text-emerald-950 hover:bg-emerald-50'
                    }`}
                  >
                    {b.kind === 'pdf' ? <BookOpen size={12} className="shrink-0 opacity-60" /> : <FileText size={12} className="shrink-0 opacity-60" />}
                    <span className="min-w-0 truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Search panel (structured Kanzul Iman text) ───────────────────────────────
// This searches ONE full-text index — the Kanzul Iman Urdu translation, the
// only Quran text we hold in full, ayah-by-ayah — to LOCATE a verse. It is a
// verse finder, not a full-text search across every tafsir's commentary (the
// scanned books have no text layer, and fetching all 6,236 ayahs from each of
// the 6 API tafsirs just to search them isn't practical). Once a verse is
// found, "Read tafsir" opens ANY of the 8 books at that exact ayah.

function TafsirSearch({ onOpenBook, isDark }: {
  onOpenBook: (book: LibBook, ayah: KanzAyah) => void; isDark: boolean;
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
          <h3 className={`font-bold leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Find an ayah, read its tafsir</h3>
          <p className={`text-xs ${isDark ? 'text-parchment/55' : 'text-ink/55'}`}>
            Type a word from the Kanzul Iman Urdu translation to locate the ayah, then open its commentary in any of the 8 books below.
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
                <OpenInDropdown ayah={r} onOpen={onOpenBook} isDark={isDark} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section root ─────────────────────────────────────────────────────────────

type ReaderState =
  | { kind: 'pdf'; book: TafsirBook; volume: TafsirVolume }
  | { kind: 'text'; book: Extract<LibBook, { kind: 'text' }>; initialSurah?: number; initialAyah?: number }
  | null;

export function TafsirSection({ isDark }: { isDark: boolean }) {
  const [reader, setReader] = useState<ReaderState>(null);

  const openBook = (book: LibBook) => {
    if (book.kind === 'pdf') setReader({ kind: 'pdf', book: book.pdf, volume: book.pdf.volumes[0] });
    else setReader({ kind: 'text', book });
  };

  // From a search hit: jump straight to that ayah, in whichever book the
  // user picked (scanned books land on the nearest Parah page; text tafsirs
  // open exactly on that surah:ayah).
  const openBookAtAyah = (book: LibBook, ayah: KanzAyah) => {
    if (book.kind === 'pdf') setReader({ kind: 'pdf', book: book.pdf, volume: volumeForPara(book.pdf, ayah.juz) });
    else setReader({ kind: 'text', book, initialSurah: ayah.surah, initialAyah: ayah.ayah });
  };

  return (
    <div className="space-y-5">
      {/* find an ayah, then open its tafsir — sits above the shelf since it
          applies across all 8 books, not any one of them */}
      <TafsirSearch isDark={isDark} onOpenBook={openBookAtAyah} />

      {/* unified bookshelf — every tafsir, same card, same reader */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {LIB_BOOKS.map((book, i) => (
          <LibraryCard key={book.id} book={book} isDark={isDark} delay={i * 0.05}
            onOpen={() => openBook(book)} />
        ))}
      </div>

      {/* readers — one shared shell, two bodies */}
      {reader?.kind === 'pdf' && (
        <PdfReader book={reader.book} initialVolume={reader.volume}
          onClose={() => setReader(null)} isDark={isDark} />
      )}
      {reader?.kind === 'text' && (
        // key forces a remount when a fresh search jump targets an ayah while
        // the same book is already open — initialSurah/Ayah only seed state once
        <TextReader key={`${reader.book.id}-${reader.initialSurah ?? 1}-${reader.initialAyah ?? 1}`}
          taf={reader.book.taf} urduTitle={reader.book.urduTitle} coverGrad={reader.book.cover}
          initialSurah={reader.initialSurah} initialAyah={reader.initialAyah}
          onClose={() => setReader(null)} isDark={isDark} />
      )}
    </div>
  );
}
