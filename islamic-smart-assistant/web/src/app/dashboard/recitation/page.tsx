'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlarmClock, Search, X, Plus, Trash2, Pencil, Play, Square,
  Volume2, Volume1, VolumeX, Mic2, Languages, CalendarClock, Check, Power,
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
import { summarize, type RecitationSchedule, type RepeatMode } from '@/lib/recitationSchedule';

const REPEAT_MODES: RepeatMode[] = ['once', 'daily', 'weekly', 'monthly'];
const REPEAT_LABEL: Record<RepeatMode, string> = {
  once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
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

function VolIcon({ v }: { v: number }) {
  if (v === 0) return <VolumeX size={18} className="text-ink/50" />;
  if (v < 0.5) return <Volume1 size={18} className="text-emerald-600" />;
  return <Volume2 size={18} className="text-emerald-600" />;
}

export default function RecitationSchedulerPage() {
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  const [schedules, setSchedules] = useLocalStorage<RecitationSchedule[]>('isa:recitationSchedules', []);

  // ── form state ──
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

  const formRef = useRef<HTMLDivElement>(null);

  // Apply the profile's preferred translation language once (only while creating).
  const langApplied = useRef(false);
  useEffect(() => {
    if (!langApplied.current && editingId === null) {
      setTranslation(langToTranslation(language));
      langApplied.current = true;
    }
  }, [language, editingId]);

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

  const startPreview = (req: { surahs: number[] }, id: 'test' | string) => {
    const ctrl = previewCtrlRef.current;
    if (!ctrl) return;
    ctrl.stop();
    setPreviewingId(id);
    ctrl.play(
      { surahs: req.surahs, reciter, withTranslation, translation, volume },
      { onDone: () => setPreviewingId((p) => (p === id ? null : p)), onBlocked: () => setPreviewingId((p) => (p === id ? null : p)) },
    );
  };
  const stopPreview = () => { previewCtrlRef.current?.stop(); setPreviewingId(null); };

  const test = () => {
    if (previewingId === 'test') { stopPreview(); return; }
    startPreview({ surahs: selectedSurahs.length ? [selectedSurahs[0]] : [1] }, 'test');
  };

  const onVolume = (v: number) => { setVolume(v); previewCtrlRef.current?.setVolume(v); };

  const resetForm = () => {
    setSelectedSurahs([]); setQuery(''); setEditingId(null); setError(null);
  };

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
    // Ask for notification permission so scheduled fires can show one.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    resetForm();
  };

  const editSchedule = (s: RecitationSchedule) => {
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
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) resetForm();
    if (previewingId === id) stopPreview();
  };

  const toggleEnabled = (id: string) =>
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const noTransAudio = withTranslation && translation !== 'none' && !hasTranslationAudio(translation);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="chip-gold mb-2"><AlarmClock size={12} /> Recitation Alarm</p>
          <h1 className="h-display text-4xl font-bold">Schedule Quran Recitation</h1>
          <p className="text-ink/60 mt-1">Pick Surahs, a time, and how often — Noor will recite them automatically.</p>
        </div>
      </div>

      {/* ── create / edit form ── */}
      <div ref={formRef} className="card card-pad space-y-6">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-emerald-700" />
          <h2 className="font-bold text-lg">{editingId ? 'Edit schedule' : 'New schedule'}</h2>
          {editingId && (
            <button onClick={resetForm} className="ml-auto text-sm text-ink/60 hover:text-ink underline">Cancel edit</button>
          )}
        </div>

        {/* surah multi-select */}
        <div>
          <label className="block text-sm font-semibold mb-2">Surahs <span className="text-ink/45 font-normal">· choose one or more</span></label>

          {selectedSurahs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedSurahs.map((n) => {
                const s = SURAHS.find((x) => x.number === n);
                return (
                  <span key={n} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1">
                    {n}. {s?.englishName ?? `Surah ${n}`}
                    <button onClick={() => removeSurah(n)} className="hover:bg-white/20 rounded-full p-0.5"><X size={12} /></button>
                  </span>
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
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-emerald-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </label>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-emerald-100 divide-y divide-emerald-50">
            {filtered.map((s) => {
              const sel = selectedSurahs.includes(s.number);
              return (
                <button
                  key={s.number}
                  onClick={() => toggleSurah(s.number)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-emerald-50/60 ${sel ? 'bg-emerald-50/80' : ''}`}
                >
                  <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${sel ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {s.number}
                  </span>
                  <span className="flex-1 min-w-0">
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
        </div>

        {/* reciter + translation */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2"><Mic2 size={13} className="inline mr-1 text-emerald-600" />Reciter</label>
            <select
              value={reciter}
              onChange={(e) => setReciter(e.target.value as ReciterId)}
              className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2"><Languages size={13} className="inline mr-1 text-emerald-600" />Translation</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWithTranslation((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition shrink-0
                  ${withTranslation ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-emerald-200 text-ink hover:border-emerald-400'}`}
              >
                <span className={`relative w-9 h-5 rounded-full transition ${withTranslation ? 'bg-white/30' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${withTranslation ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
                {withTranslation ? 'With translation' : 'Arabic only'}
              </button>
              <select
                value={translation}
                disabled={!withTranslation}
                onChange={(e) => setTranslation(e.target.value as TranslationId)}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TRANSLATIONS.filter((t) => t.id !== 'none').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {noTransAudio && (
              <p className="text-xs text-amber-700 mt-1.5">Spoken audio isn’t available for this translation yet — only the Arabic will be recited.</p>
            )}
          </div>
        </div>

        {/* time + date + repeat */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">{repeat === 'once' ? 'Date' : 'Start date'}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Repeat</label>
          <div className="inline-flex rounded-xl border border-emerald-200 bg-white p-1 gap-1">
            {REPEAT_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setRepeat(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${repeat === mode ? 'bg-emerald-600 text-white shadow' : 'text-ink/70 hover:bg-emerald-50'}`}
              >
                {REPEAT_LABEL[mode]}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/55 mt-1.5">{describeRepeat(repeat, date)}</p>
        </div>

        {/* volume */}
        <div>
          <label className="block text-sm font-semibold mb-2">Volume <span className="text-ink/45 font-normal">· {Math.round(volume * 100)}%</span></label>
          <div className="flex items-center gap-3">
            <VolIcon v={volume} />
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-600"
            />
            <button
              onClick={test}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition shrink-0
                ${previewingId === 'test' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'btn-ghost'}`}
            >
              {previewingId === 'test' ? <><Square size={14} /> Stop</> : <><Play size={14} /> Test</>}
            </button>
          </div>
          <p className="text-xs text-ink/55 mt-1.5">Adjust the slider while testing — the volume changes live so you can set it just right.</p>
        </div>

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3">
          <button onClick={save} className="btn-primary inline-flex items-center gap-2">
            {editingId ? <><Check size={16} /> Save changes</> : <><Plus size={16} /> Schedule</>}
          </button>
          {selectedSurahs.length > 0 && (
            <span className="text-sm text-ink/55">{selectedSurahs.length} Surah{selectedSurahs.length > 1 ? 's' : ''} selected</span>
          )}
        </div>
      </div>

      {/* ── saved schedules ── */}
      <div>
        <h2 className="font-bold text-lg mb-3">Your schedules <span className="text-ink/45 font-normal">· {schedules.length}</span></h2>

        {schedules.length === 0 ? (
          <div className="card card-pad text-center text-ink/55">
            <AlarmClock size={28} className="mx-auto mb-2 text-emerald-300" />
            No schedules yet. Create one above and it’ll appear here.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {schedules.map((s) => {
                const recName = RECITERS.find((r) => r.id === s.reciter)?.name ?? s.reciter;
                const transName = s.withTranslation ? (TRANSLATIONS.find((t) => t.id === s.translation)?.name ?? 'Translation') : 'Arabic only';
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className={`card card-pad ${s.enabled ? '' : 'opacity-60'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-display font-bold text-lg">{summarize(s)}</span>
                          {!s.enabled && <span className="chip">Paused</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {s.surahs.map((n) => (
                            <span key={n} className="chip text-xs">{n}. {SURAHS.find((x) => x.number === n)?.englishName ?? `Surah ${n}`}</span>
                          ))}
                        </div>
                        <p className="text-xs text-ink/55">
                          {recName} · {transName} · volume {Math.round(s.volume * 100)}%
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => (previewingId === s.id ? stopPreview() : startPreview({ surahs: s.surahs }, s.id))}
                          title="Play now"
                          className={`p-2 rounded-lg transition ${previewingId === s.id ? 'bg-rose-50 text-rose-600' : 'hover:bg-emerald-50 text-emerald-700'}`}
                        >
                          {previewingId === s.id ? <Square size={16} /> : <Play size={16} />}
                        </button>
                        <button onClick={() => toggleEnabled(s.id)} title={s.enabled ? 'Pause' : 'Enable'} className={`p-2 rounded-lg transition ${s.enabled ? 'text-emerald-700 hover:bg-emerald-50' : 'text-ink/40 hover:bg-emerald-50'}`}>
                          <Power size={16} />
                        </button>
                        <button onClick={() => editSchedule(s)} title="Edit" className="p-2 rounded-lg hover:bg-emerald-50 text-ink/70"><Pencil size={16} /></button>
                        <button
                          onClick={() => (confirmDeleteId === s.id ? removeSchedule(s.id) : setConfirmDeleteId(s.id))}
                          onBlur={() => setConfirmDeleteId((c) => (c === s.id ? null : c))}
                          title="Delete"
                          className={`p-2 rounded-lg transition ${confirmDeleteId === s.id ? 'bg-rose-600 text-white' : 'hover:bg-rose-50 text-rose-600'}`}
                        >
                          {confirmDeleteId === s.id ? <span className="text-xs font-semibold px-1">Sure?</span> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <p className="text-xs text-ink/45">
        Recitation plays in your browser, so a schedule only rings while Noor is open in a tab (just like auto-Azan).
      </p>

      <audio ref={previewRef} preload="auto" />
    </div>
  );
}
