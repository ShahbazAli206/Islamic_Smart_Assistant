'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, Check, ChevronDown } from 'lucide-react';

export type LanguageOption = { id: string; label: string; native: string };

/**
 * Searchable language picker used wherever the app previously showed a long grid
 * of language buttons (quick settings, onboarding, settings). Click to open a
 * type-to-filter list of every translation language; typing any part of a name,
 * native name or code (e.g. "ur" → Urdu) narrows it down.
 *
 * The open panel renders in normal flow (not an absolute overlay) so it never
 * gets clipped inside the scrollable popups/modals that host it; the results
 * list scrolls on its own.
 */
export function LanguageSelect({
  value,
  onChange,
  options,
  isDark = false,
  placeholder = 'Select language',
}: {
  value: string;
  onChange: (id: string) => void;
  options: LanguageOption[];
  isDark?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.native.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    );
  }, [query, options]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search box the moment the list opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const t = isDark
    ? {
        trigger: 'border-white/12 bg-white/[0.06] text-parchment hover:border-emerald-400/50',
        triggerMuted: 'text-parchment/50',
        chevron: 'text-parchment/50',
        panel: 'border-emerald-500/20 bg-[#0d2018] shadow-2xl',
        searchWrap: 'border-white/10',
        input: 'bg-white/[0.06] border-white/10 text-parchment placeholder:text-parchment/40',
        searchIcon: 'text-parchment/40',
        optionHover: 'hover:bg-emerald-500/10',
        optionActive: 'bg-emerald-600 text-white',
        optionText: 'text-parchment',
        optionMuted: 'text-parchment/50',
        empty: 'text-parchment/45',
      }
    : {
        trigger: 'border-emerald-200 bg-white text-emerald-950 hover:border-emerald-300',
        triggerMuted: 'text-emerald-900/50',
        chevron: 'text-emerald-700/60',
        panel: 'border-emerald-100 bg-white shadow-xl',
        searchWrap: 'border-emerald-50',
        input: 'bg-emerald-50/50 border-emerald-100 text-emerald-950 placeholder:text-emerald-900/40',
        searchIcon: 'text-emerald-900/40',
        optionHover: 'hover:bg-emerald-50',
        optionActive: 'bg-emerald-500 text-white',
        optionText: 'text-emerald-950',
        optionMuted: 'text-emerald-900/50',
        empty: 'text-emerald-900/45',
      };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${t.trigger}`}
      >
        <Globe size={18} className="shrink-0 text-emerald-500" />
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="flex items-baseline gap-2">
              <span className="truncate text-sm font-semibold">{selected.label}</span>
              <span className={`truncate text-xs font-arabic ${t.triggerMuted}`}>{selected.native}</span>
            </span>
          ) : (
            <span className={`text-sm ${t.triggerMuted}`}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${t.chevron}`}
        />
      </button>

      {/* In-flow expanding panel (never clipped inside scroll containers) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.16 }}
            className={`mt-2 overflow-hidden rounded-2xl border ${t.panel}`}
          >
            {/* Search */}
            <div className={`border-b p-2 ${t.searchWrap}`}>
              <div className="relative">
                <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.searchIcon}`} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filtered[0]) choose(filtered[0].id);
                    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  }}
                  placeholder="Type a language…"
                  className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60 ${t.input}`}
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className={`px-3 py-6 text-center text-sm ${t.empty}`}>No language matches “{query}”.</p>
              ) : (
                filtered.map((o) => {
                  const active = o.id === value;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => choose(o.id)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? t.optionActive : `${t.optionText} ${t.optionHover}`
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{o.label}</span>
                        <span className={`block truncate text-xs font-arabic ${active ? 'text-white/75' : t.optionMuted}`}>
                          {o.native}
                        </span>
                      </span>
                      {active && <Check size={15} className="shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
