'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlarmClock, Search, X, Plus, Trash2, Pencil, Play, Square,
  Volume2, Volume1, VolumeX, Mic2, Languages, CalendarClock, CalendarDays,
  Clock, Repeat, Check, Power, Sparkles, BookOpen,
} from 'lucide-react';
import { SURAHS } from '@/lib/surahs';
import { useLocalStorage } from '@/lib/useLocalStorage';
import {
  RECITERS, TRANSLATIONS, hasTranslationAudio, langToTranslation,
  type ReciterId, type TranslationId,
} from '@/lib/quran';
import {
  createRecitationController, type RecitationController,
} from '@/lib/recitationPlayer';
import {
  formatTime, type RecitationSchedule, type RepeatMode,
} from '@/lib/recitationSchedule';

const REPEAT_MODES: RepeatMode[] = ['once', 'daily', 'weekly', 'monthly'];
const REPEAT_LABEL: Record<RepeatMode, string> = {
  once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
};
const REPEAT_ICON: Record<RepeatMode, typeof Repeat> = {
  once: CalendarDays, daily: Repeat, weekly: CalendarClock, monthly: CalendarDays,
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayYMD() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function localDate(ymd: string) { const [y, m, d] = ymd.split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); }

function describeRepeat(repeat: RepeatMode, date: string): string {
  const d = localDate(date);
  switch (repeat) {
    case 'once':    return `Plays once on ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`;
    case 'daily':   return 'Plays every day at the set time.';
    case 'weekly':  return `Plays every ${d.toLocaleDateString(undefined, { weekday: 'long' })}.`;
    case 'monthly': return `Plays on day ${d.getDate()} of every month.`;
  }
}
function shortRecurrence(s: RecitationSchedule): string {
  const d = localDate(s.date);
  switch (s.repeat) {
    case 'once':    return `Once · ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    case 'daily':   return 'Every day';
    case 'weekly':  return `Every ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
    case 'monthly': return `Day ${d.getDate()} of each month`;
  }
}

function VolIcon({ v, className = '' }: { v: number; className?: string }) {
  if (v === 0) return <VolumeX size={18} className={className} />;
  if (v < 0.5) return <Volume1 size={18} className={className} />;
  return <Volume2 size={18} className={className} />;
}

/** Decorative sound-wave glyph for the hero / empty state. */
function SoundWaves({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      {[8, 24, 40, 56, 72, 88, 104].map((x, i) => {
        const h = [16, 34, 52, 24, 48, 30, 14][i];
        return <line key={x} x1={x} y1={30 - h / 2} x2={x} y2={30 + h / 2} />;
      })}
    </svg>
  );
}

export default function RecitationSchedulerPage() {
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  const [schedules, setSchedules] = useLocalStorage<RecitationSchedule[]>('isa:recitationSchedules', []);

  // ── form state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSurahs, setSelectedSurahs] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [reciter, setReciter] = useState<ReciterId>('ar.abdulbasitmurattal');
  const [withTranslation, setWithTranslation] = useState(false);
  const [translation, setTranslation] = useState<TranslationId>('ur.jalandhry');
  const [time, setTime] = useState('06:00');
  const [date, setDate] = useState(todayYMD());
  const [repeat, setRepeat] = useState<RepeatMode>('daily');
  const [volume, setVolume] = useState(0.8);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Apply the profile's preferred translation language once on first mount.
  const langApplied = useRef(false);
  useEffect(() => {
    if (!langApplied.current) { setTranslation(langToTranslation(language)); langApplied.current = true; }
  }, [language]);

  // ── preview / test playback (separate audio element from the global runner) ──
  const previewRef = useRef<HTMLAudioElement>(null);
  const previewCtrlRef = useRef<RecitationController | null>(null);
  const [previewingId, setPreviewingId] = useState<string | 'test' | null>(null);

  useEffect(() => {
    if (previewRef.current && !previewCtrlRef.current) {
      previewCtrlRef.current = createRecitationController(previewRef.current);
    }
    return () => { previewCtrlRef.current?.stop(); };
  }, []);

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

  const toggleSurah = (n: number) =>
    setSelectedSurahs((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  const removeSurah = (n: number) => setSelectedSurahs((prev) => prev.filter((x) => x !== n));

  const startPreview = (surahs: number[], id: 'test' | string) => {
    const ctrl = previewCtrlRef.current;
    if (!ctrl) return;
    ctrl.stop();
    setPreviewingId(id);
    ctrl.play(
      { surahs, reciter, withTranslation, translation, volume },
      { onDone: () => setPreviewingId((p) => (p === id ? null : p)), onBlocked: () => setPreviewingId((p) => (p === id ? null : p)) },
    );
  };
  const stopPreview = () => { previewCtrlRef.current?.stop(); setPreviewingId(null); };

  const test = () => {
    if (previewingId === 'test') { stopPreview(); return; }
    startPreview(selectedSurahs.length ? [selectedSurahs[0]] : [1], 'test');
  };

  const onVolume = (v: number) => { setVolume(v); previewCtrlRef.current?.setVolume(v); };

  const resetForm = () => {
    setSelectedSurahs([]); setQuery(''); setEditingId(null); setError(null);
    setReciter('ar.abdulbasitmurattal'); setWithTranslation(false);
    setTranslation(langToTranslation(language));
    setTime('06:00'); setDate(todayYMD()); setRepeat('daily'); setVolume(0.8);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (s: RecitationSchedule) => {
    setEditingId(s.id);
    setSelectedSurahs(s.surahs);
    setReciter(s.reciter);
    setWithTranslation(s.withTranslation);
    setTranslation(s.translation);
    setTime(s.time);
    setDate(s.date);
    setRepeat(s.repeat);
    setVolume(s.volume);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (previewCtrlRef.current?.isPlaying() && previewingId === 'test') stopPreview();
    setModalOpen(false);
  }, [previewingId]);

  const save = () => {
    if (!selectedSurahs.length) { setError('Choose at least one Surah.'); return; }
    if (!time) { setError('Pick a time.'); return; }
    if (!date) { setError('Pick a date.'); return; }
    const fields = { surahs: selectedSurahs, time, date, repeat, reciter, withTranslation, translation, volume };
    if (editingId) {
      setSchedules((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...fields } : s)));
    } else {
      setSchedules((prev) => [
        { id: crypto.randomUUID(), createdAt: Date.now(), enabled: true, ...fields },
        ...prev,
      ]);
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    stopPreview();
    setModalOpen(false);
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (previewingId === id) stopPreview();
  };

  const toggleEnabled = (id: string) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  // Lock scroll + Escape-to-close while the modal is open.
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [modalOpen, closeModal]);

  const noTransAudio = withTranslation && translation !== 'none' && !hasTranslationAudio(translation);
  const activeCount = schedules.filter((s) => s.enabled).length;

  return (
    <div className="space-y-7">
      {/* ── hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-mosque-gradient text-parchment shadow-glow-emerald">
        <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-glow-emerald pointer-events-none" />
        <div className="absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-glow-emerald opacity-60 pointer-events-none" />
        <SoundWaves className="absolute right-8 bottom-6 w-40 text-gold-300/30 hidden sm:block animate-pulse-soft" />

        <div className="relative p-7 sm:p-9">
          <p className="chip-gold mb-3"><Sparkles size={12} /> Recitation Alarm</p>
          <h1 className="h-display text-3xl sm:text-4xl font-bold">Scheduled Quran Recitation</h1>
          <p className="text-emerald-100/80 mt-2 max-w-xl">
            Set a time and Noor will recite your chosen Surahs — daily, weekly, monthly, or once.
            With or without translation, at the volume you like.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-gold-gradient text-midnight-900 font-bold px-6 py-3 shadow-glow-gold hover:brightness-105 active:scale-[0.98] transition"
            >
              <AlarmClock size={18} /> Schedule recitation
            </button>
            <div className="flex items-center gap-2 text-sm text-emerald-100/80">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5">
                <BookOpen size={14} className="text-gold-300" /> {schedules.length} schedule{schedules.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse-soft" /> {activeCount} active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── schedules ── */}
      {schedules.length === 0 ? (
        <div className="card card-pad text-center py-14">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <AlarmClock size={34} className="text-emerald-400" />
          </div>
          <h3 className="font-display text-xl font-bold">No recitation scheduled yet</h3>
          <p className="text-ink/55 mt-1 max-w-sm mx-auto">
            Create your first schedule and Noor will recite the Quran for you at the time you choose.
          </p>
          <button onClick={openCreate} className="btn-primary mt-5 mx-auto">
            <Plus size={16} /> Schedule recitation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Your schedules</h2>
            <button onClick={openCreate} className="btn-ghost text-sm py-2 px-4">
              <Plus size={15} /> New
            </button>
          </div>

          <AnimatePresence initial={false}>
            {schedules.map((s) => {
              const recName = RECITERS.find((r) => r.id === s.reciter)?.name ?? s.reciter;
              const transName = s.withTranslation ? (TRANSLATIONS.find((t) => t.id === s.translation)?.name ?? 'Translation') : 'Arabic only';
              const RIcon = REPEAT_ICON[s.repeat];
              const isPreviewing = previewingId === s.id;
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={`group relative overflow-hidden rounded-2xl glass shadow-card-soft transition ${s.enabled ? '' : 'opacity-65'}`}
                >
                  {/* accent rail */}
                  <div className={`absolute left-0 inset-y-0 w-1.5 ${s.enabled ? 'bg-gold-gradient' : 'bg-ink/15'}`} />

                  <div className="pl-6 pr-4 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* time block */}
                    <div className="flex items-center gap-4 sm:w-44 shrink-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.enabled ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'bg-ink/10 text-ink/50'}`}>
                        <AlarmClock size={22} />
                      </div>
                      <div className="leading-tight">
                        <p className="font-display text-2xl font-bold">{formatTime(s.time)}</p>
                        <p className="text-xs text-ink/55 flex items-center gap-1"><RIcon size={11} /> {shortRecurrence(s)}</p>
                      </div>
                    </div>

                    {/* details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {s.surahs.slice(0, 6).map((n) => (
                          <span key={n} className="chip text-xs">{n}. {SURAHS.find((x) => x.number === n)?.englishName ?? `Surah ${n}`}</span>
                        ))}
                        {s.surahs.length > 6 && <span className="chip-gold text-xs">+{s.surahs.length - 6} more</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
                        <span className="inline-flex items-center gap-1"><Mic2 size={12} className="text-emerald-600" /> {recName}</span>
                        <span className="inline-flex items-center gap-1"><Languages size={12} className="text-emerald-600" /> {transName}</span>
                        <span className="inline-flex items-center gap-1"><VolIcon v={s.volume} className="text-emerald-600" /> {Math.round(s.volume * 100)}%</span>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                      <button
                        onClick={() => (isPreviewing ? stopPreview() : startPreview(s.surahs, s.id))}
                        title="Play now"
                        className={`p-2.5 rounded-xl transition ${isPreviewing ? 'bg-rose-50 text-rose-600' : 'hover:bg-emerald-50 text-emerald-700'}`}
                      >
                        {isPreviewing ? <Square size={17} /> : <Play size={17} />}
                      </button>
                      <button onClick={() => toggleEnabled(s.id)} title={s.enabled ? 'Pause' : 'Enable'} className={`p-2.5 rounded-xl transition ${s.enabled ? 'text-emerald-700 hover:bg-emerald-50' : 'text-ink/40 hover:bg-emerald-50'}`}>
                        <Power size={17} />
                      </button>
                      <button onClick={() => openEdit(s)} title="Edit" className="p-2.5 rounded-xl hover:bg-emerald-50 text-ink/70"><Pencil size={16} /></button>
                      <button
                        onClick={() => (confirmDeleteId === s.id ? removeSchedule(s.id) : setConfirmDeleteId(s.id))}
                        onBlur={() => setConfirmDeleteId((c) => (c === s.id ? null : c))}
                        title="Delete"
                        className={`p-2.5 rounded-xl transition ${confirmDeleteId === s.id ? 'bg-rose-600 text-white' : 'hover:bg-rose-50 text-rose-600'}`}
                      >
                        {confirmDeleteId === s.id ? <span className="text-xs font-semibold px-0.5">Sure?</span> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-ink/45 flex items-center gap-1.5">
        <Clock size={12} /> Recitation plays in your browser, so a schedule only rings while Noor is open in a tab (just like auto-Azan).
      </p>

      {/* ── glass modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-midnight-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/40 bg-white/80 backdrop-blur-2xl shadow-2xl"
            >
              {/* sheen highlight */}
              <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-glow-emerald opacity-50" />

              {/* header */}
              <div className="relative bg-mosque-gradient text-parchment px-6 sm:px-8 pt-7 pb-6 overflow-hidden shrink-0">
                <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
                <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-glow-emerald pointer-events-none" />
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-parchment transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
                <div className="relative flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
                    <AlarmClock size={24} className="text-gold-300" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold">{editingId ? 'Edit schedule' : 'Schedule recitation'}</h2>
                    <p className="text-emerald-100/75 text-sm">Pick Surahs, a time, and how often to recite.</p>
                  </div>
                </div>
              </div>

              {/* body */}
              <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
                {/* surahs */}
                <section>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><BookOpen size={14} className="text-emerald-600" /> Surahs <span className="text-ink/45 font-normal">· choose one or more</span></label>

                  {selectedSurahs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {selectedSurahs.map((n) => {
                        const s = SURAHS.find((x) => x.number === n);
                        return (
                          <motion.span layout key={n} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1">
                            {n}. {s?.englishName ?? `Surah ${n}`}
                            <button onClick={() => removeSurah(n)} className="hover:bg-white/25 rounded-full p-0.5"><X size={12} /></button>
                          </motion.span>
                        );
                      })}
                    </div>
                  )}

                  <label className="relative block mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Surah by name or number…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-emerald-100 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </label>

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-emerald-100 bg-white/60 divide-y divide-emerald-50">
                    {filtered.map((s) => {
                      const sel = selectedSurahs.includes(s.number);
                      return (
                        <button
                          key={s.number}
                          onClick={() => toggleSurah(s.number)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-emerald-50/70 ${sel ? 'bg-emerald-50/80' : ''}`}
                        >
                          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${sel ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            {s.number}
                          </span>
                          <span className="flex-1 min-w-0 truncate">
                            <span className="font-medium">{s.englishName}</span>
                            <span className="text-ink/50"> · {s.englishTranslation} · {s.ayahs} ayahs</span>
                          </span>
                          <span className="font-arabic text-lg text-emerald-800 shrink-0">{s.arabic}</span>
                          {sel && <Check size={15} className="text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                    {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink/50">No Surah matches “{query}”.</p>}
                  </div>
                </section>

                {/* reciter + translation */}
                <section className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Mic2 size={14} className="text-emerald-600" /> Reciter</label>
                    <select
                      value={reciter}
                      onChange={(e) => setReciter(e.target.value as ReciterId)}
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Languages size={14} className="text-emerald-600" /> Translation</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWithTranslation((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition shrink-0
                          ${withTranslation ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white/80 border-emerald-200 text-ink hover:border-emerald-400'}`}
                      >
                        <span className={`relative w-9 h-5 rounded-full transition ${withTranslation ? 'bg-white/30' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${withTranslation ? 'left-[18px]' : 'left-0.5'}`} />
                        </span>
                        {withTranslation ? 'On' : 'Off'}
                      </button>
                      <select
                        value={translation}
                        disabled={!withTranslation}
                        onChange={(e) => setTranslation(e.target.value as TranslationId)}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {TRANSLATIONS.filter((t) => t.id !== 'none').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    {noTransAudio && (
                      <p className="text-xs text-amber-700 mt-1.5">Spoken audio isn’t available for this translation yet — only the Arabic will be recited.</p>
                    )}
                  </div>
                </section>

                {/* time + date */}
                <section className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Clock size={14} className="text-emerald-600" /> Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><CalendarDays size={14} className="text-emerald-600" /> {repeat === 'once' ? 'Date' : 'Start date'}</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </section>

                {/* repeat */}
                <section>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Repeat size={14} className="text-emerald-600" /> Repeat</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REPEAT_MODES.map((mode) => {
                      const Icon = REPEAT_ICON[mode];
                      const active = repeat === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setRepeat(mode)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition
                            ${active ? 'bg-emerald-600 border-emerald-600 text-white shadow-glow-emerald' : 'bg-white/80 border-emerald-200 text-ink/70 hover:border-emerald-400'}`}
                        >
                          <Icon size={14} /> {REPEAT_LABEL[mode]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-ink/55 mt-2">{describeRepeat(repeat, date)}</p>
                </section>

                {/* volume */}
                <section>
                  <label className="flex items-center gap-1.5 text-sm font-semibold mb-2"><Volume2 size={14} className="text-emerald-600" /> Volume <span className="text-ink/45 font-normal">· {Math.round(volume * 100)}%</span></label>
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/60 px-3 py-2.5">
                    <VolIcon v={volume} className="text-emerald-600 shrink-0" />
                    <input
                      type="range" min={0} max={1} step={0.01} value={volume}
                      onChange={(e) => onVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-600"
                    />
                    <button
                      onClick={test}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition shrink-0 border
                        ${previewingId === 'test' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {previewingId === 'test' ? <><Square size={14} /> Stop</> : <><Play size={14} /> Test</>}
                    </button>
                  </div>
                  <p className="text-xs text-ink/55 mt-1.5">Drag the slider while testing — the volume changes live so you can set it just right.</p>
                </section>

                {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
              </div>

              {/* footer */}
              <div className="shrink-0 border-t border-emerald-100/70 bg-white/70 backdrop-blur px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
                <span className="text-sm text-ink/55">
                  {selectedSurahs.length > 0 ? `${selectedSurahs.length} Surah${selectedSurahs.length > 1 ? 's' : ''} selected` : 'No Surah selected yet'}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={closeModal} className="btn-ghost py-2.5 px-5">Cancel</button>
                  <button onClick={save} className="btn-primary py-2.5 px-5">
                    {editingId ? <><Check size={16} /> Save changes</> : <><Plus size={16} /> Schedule</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={previewRef} preload="auto" />
    </div>
  );
}
