'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin, Globe, BellRing, BellOff, Check, Loader2, Settings,
  Activity, Volume2, Clock, Calendar, Heart, ChevronRight, Sparkles, Mic2,
  Music2, ArrowRight, Bell, Smartphone, Zap, BookOpen,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useTheme } from '@/lib/ThemeContext';
import { SECTS, LANGUAGES } from '@/components/OnboardingSetup';
import { setLocationByCity } from '@/lib/location';

// ── helpers ────────────────────────────────────────────────────────────────

function persist(key: string, val: unknown) {
  const json = JSON.stringify(val);
  localStorage.setItem(key, json);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
}

const TO_FIQH: Record<string, string>   = { hanafi:'hanafi', shafii:'shafi', maliki:'maliki', hanbali:'hanbali', shia:'jafari' };
const FROM_FIQH: Record<string, string> = { hanafi:'hanafi', shafi:'shafii', maliki:'maliki', hanbali:'hanbali', jafari:'shia' };

type QueueItem = { id: string; name: string; audioType: string };

const COMING_SOON = [
  {
    emoji: '🔔', title: 'Smart Notifications',
    desc: 'Receive Azan alerts even when the browser tab is closed or the app runs in the background.',
    accent: 'amber',
  },
  {
    emoji: '📊', title: 'Prayer Streak Tracker',
    desc: 'Log each salah and visualise your consistency with streaks and monthly heatmaps.',
    accent: 'sky',
  },
  {
    emoji: '🔄', title: 'Multi-device Sync',
    desc: 'Your chosen Azan voice and all settings sync instantly across every linked device.',
    accent: 'violet',
  },
  {
    emoji: '🤖', title: 'AI Islamic Assistant',
    desc: 'Ask questions about fiqh, get Hadith explanations and personalised daily reminders.',
    accent: 'rose',
  },
];

const accentMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700/40', badge: 'bg-amber-500' },
  sky:    { bg: 'bg-sky-50 dark:bg-sky-900/20',     text: 'text-sky-700 dark:text-sky-300',     border: 'border-sky-200 dark:border-sky-700/40',     badge: 'bg-sky-500'   },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-700/40', badge: 'bg-violet-500' },
  rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',   text: 'text-rose-700 dark:text-rose-300',   border: 'border-rose-200 dark:border-rose-700/40',   badge: 'bg-rose-500'  },
};

// ── Shared UI pieces ───────────────────────────────────────────────────────

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none ${
        on ? 'bg-emerald-500' : isDark ? 'bg-white/20' : 'bg-black/20'
      }`}
    >
      <motion.span
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function Pill({ label, active, onClick, isDark }: { label: string; active: boolean; onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
        active
          ? isDark
            ? 'border-emerald-500 bg-emerald-900/50 text-emerald-300'
            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : isDark
            ? 'border-white/10 bg-transparent text-white/40 hover:border-emerald-500/50 hover:text-emerald-300'
            : 'border-black/[0.08] bg-white text-black/50 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/40'
      }`}
    >
      {label}
    </button>
  );
}

function SectionCard({
  title, icon, children, isDark, noPad = false,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; isDark: boolean; noPad?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-[#0d1f17] border-emerald-800/40' : 'bg-white border-emerald-100'
      }`}
    >
      <div className={`flex items-center gap-2.5 px-5 py-3 border-b ${isDark ? 'border-white/5' : 'border-emerald-900/5'}`}>
        <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{icon}</span>
        <h2 className={`font-semibold text-base ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>{title}</h2>
      </div>
      <div className={noPad ? '' : 'px-5 py-4'}>{children}</div>
    </motion.div>
  );
}

function AzanRow({
  icon, title, sub, on, onToggle, last = false, iconBg, iconColor, isDark,
}: {
  icon: React.ReactNode; title: string; sub: string; on: boolean; onToggle: () => void;
  last?: boolean; iconBg?: string; iconColor?: string; isDark: boolean;
}) {
  return (
    <div className={`flex items-center gap-3.5 py-3 ${!last ? `border-b ${isDark ? 'border-white/5' : 'border-emerald-50'}` : ''}`}>
      <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-xl ${
        isDark ? 'bg-white/10 text-emerald-400' : `${iconBg ?? 'bg-emerald-100'} ${iconColor ?? 'text-emerald-600'}`
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${
          on ? isDark ? 'text-emerald-50' : 'text-emerald-950'
             : isDark ? 'text-white/40'   : 'text-emerald-950/50'
        }`}>{title}</p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-emerald-900/45'}`}>{sub}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} isDark={isDark} />
    </div>
  );
}

// ── Mosque silhouette SVG ──────────────────────────────────────────────────

function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 130" fill="currentColor" className={className} aria-hidden>
      {/* Far-left small minaret */}
      <rect x="4"  y="48" width="10" height="82" />
      <polygon points="9,36 14,48 4,48" />
      {/* Left minaret */}
      <rect x="42" y="28" width="18" height="102" />
      <polygon points="51,14 60,28 42,28" />
      <circle cx="51" cy="10" r="4" />
      {/* Dome */}
      <path d="M80,130 L80,70 C80,28 240,28 240,70 L240,130 Z" />
      <path d="M105,72 C105,50 215,50 215,72" />
      {/* Centre spire */}
      <rect x="156" y="10" width="8" height="30" />
      <polygon points="160,2 166,10 154,10" />
      {/* Right minaret */}
      <rect x="260" y="28" width="18" height="102" />
      <polygon points="269,14 278,28 260,28" />
      <circle cx="269" cy="10" r="4" />
      {/* Far-right small minaret */}
      <rect x="306" y="48" width="10" height="82" />
      <polygon points="311,36 316,48 306,48" />
      {/* Ground strip */}
      <rect x="0" y="120" width="320" height="10" />
    </svg>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isDark } = useTheme();

  const [fiqh,     setFiqhState] = useLocalStorage<string>('isa:fiqh',         'hanafi');
  const [language, setLanguage]  = useLocalStorage<string>('isa:language',     'en');
  const [azanOn,   setAzanOn]    = useLocalStorage<boolean>('isa:azanAutoplay', true);

  const [azanAnnounce,       setAzanAnnounce]       = useLocalStorage<boolean>('isa:azanAnnounce',        true);
  const [azanAutoplayBefore, setAzanAutoplayBefore] = useLocalStorage<boolean>('isa:azanAutoplayBefore',  true);
  const [azanDiffVoices,     setAzanDiffVoices]     = useLocalStorage<boolean>('isa:azanDifferentVoices', true);
  const [azanVolumeAuto,     setAzanVolumeAuto]     = useLocalStorage<boolean>('isa:azanVolumeAuto',      true);
  const [azanWeekend,        setAzanWeekend]        = useLocalStorage<boolean>('isa:azanWeekendMode',     false);
  const [savedVoice]                                 = useLocalStorage<string>('isa:azanVoice', '');

  // Pre & Post Azan Audio queue (written by Azan Voices page, read here)
  const [preAzanQueue]       = useLocalStorage<QueueItem[]>('isa:preAzanQueue',  []);
  const [postAzanQueue]      = useLocalStorage<QueueItem[]>('isa:postAzanQueue', []);
  const [prePostEnabled, setPrePostEnabled] = useLocalStorage<boolean>('isa:prePostEnabled', true);

  const [city,    setCity]    = useState('');
  const [country, setCountry] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [locErr,  setLocErr]  = useState('');

  useEffect(() => {
    try {
      const c  = localStorage.getItem('isa:city');
      const cn = localStorage.getItem('isa:country');
      if (c)  setCity(JSON.parse(c));
      if (cn) setCountry(JSON.parse(cn));
    } catch {}
  }, []);

  const selectSect = (id: string) => {
    const sectVal = id === 'shia' ? 'shia' : 'sunni';
    const fiqhVal = TO_FIQH[id] ?? 'hanafi';
    const method  = SECTS.find((s) => s.id === id)?.method ?? 1;
    persist('isa:sect',   sectVal);
    persist('isa:fiqh',   fiqhVal);
    persist('isa:method', method);
    setFiqhState(fiqhVal);
  };

  const selectLang = (id: string) => {
    setLanguage(id);
    persist('isa:language', id);
  };

  const toggleAzan = () => {
    const next = !azanOn;
    setAzanOn(next);
    persist('isa:azanAutoplay', next);
    if (next) persist('isa:azanUnlocked', true);
  };

  const saveLocation = async () => {
    const c = city.trim(), cn = country.trim();
    if (!c || !cn) { setLocErr('Enter both city and country.'); return; }
    setSaving(true); setLocErr('');
    try {
      await setLocationByCity(c, cn);
      setSaved(true);
    } catch {
      setLocErr('Location not found — check spelling.');
    } finally {
      setSaving(false);
    }
  };

  const activeSectId = FROM_FIQH[fiqh] ?? 'hanafi';
  const favCount     = savedVoice ? 1 : 0;

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
      : 'bg-white border-emerald-100 text-gray-900 placeholder:text-gray-400'
  }`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-white/40' : 'text-black/50'}`;

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
          <Settings size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-700'} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold leading-tight ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>Settings</h1>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-black/50'}`}>Manage your preferences</p>
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">

        {/* ══ Left: Smart Azan Settings ══ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={`rounded-xl overflow-hidden border flex flex-col shadow-[0_4px_20px_-4px_rgba(16,185,129,0.22)] ${
            isDark ? 'border-emerald-800/40' : 'border-emerald-200'
          }`}
        >
          {/* Gradient header */}
          <div
            className="relative overflow-hidden px-5 py-4 shrink-0"
            style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%)' }}
          >
            {/* arabesque overlay */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M20 0L25 8H15L20 0zM20 40L15 32H25L20 40zM0 20L8 15V25L0 20zM40 20L32 25V15L40 20z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative flex items-center gap-3">
              <motion.span
                className="w-10 h-10 grid place-items-center rounded-xl bg-white/15 text-white shrink-0"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Activity size={20} />
              </motion.span>
              <div className="flex-1">
                <h2 className="font-bold text-white text-lg leading-tight">Smart Azan Settings</h2>
                <p className="text-emerald-200/70 text-xs mt-0.5">Personalise every call to prayer</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-xs font-semibold px-3 py-1 shrink-0">
                <Sparkles size={12} /> Smart
              </span>
            </div>
          </div>

          {/* Body: relative so the mosque silhouette can be absolutely placed */}
          <div className={`relative px-5 flex-1 overflow-hidden ${isDark ? 'bg-[#0d1f17]' : 'bg-white'}`}>
            {/* Mosque silhouette watermark */}
            <MosqueSilhouette
              className={`absolute bottom-0 right-0 w-64 pointer-events-none select-none ${
                isDark ? 'text-emerald-700/25' : 'text-emerald-100'
              }`}
            />
            {/* subtle radial glow behind silhouette in dark mode */}
            {isDark && (
              <div
                aria-hidden
                className="absolute bottom-0 right-0 w-72 h-40 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 80% 100%, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
              />
            )}

            <AzanRow
              icon={<Mic2 size={16} />} title="Prayer announcement" sub="Speak prayer name before Azan"
              on={azanAnnounce} isDark={isDark}
              iconBg={azanAnnounce ? 'bg-emerald-100' : 'bg-slate-100'}
              iconColor={azanAnnounce ? 'text-emerald-600' : 'text-slate-400'}
              onToggle={() => { const n = !azanAnnounce; setAzanAnnounce(n); persist('isa:azanAnnounce', n); }}
            />
            <AzanRow
              icon={<Clock size={16} />} title="Auto play before prayer" sub="2 min before adhan"
              on={azanAutoplayBefore} isDark={isDark}
              onToggle={() => { const n = !azanAutoplayBefore; setAzanAutoplayBefore(n); persist('isa:azanAutoplayBefore', n); }}
            />
            <AzanRow
              icon={<Volume2 size={16} />} title="Different voices" sub="For each prayer"
              on={azanDiffVoices} isDark={isDark}
              onToggle={() => { const n = !azanDiffVoices; setAzanDiffVoices(n); persist('isa:azanDifferentVoices', n); }}
            />
            <AzanRow
              icon={<Activity size={16} />} title="Volume control" sub="Auto adjust"
              on={azanVolumeAuto} isDark={isDark}
              onToggle={() => { const n = !azanVolumeAuto; setAzanVolumeAuto(n); persist('isa:azanVolumeAuto', n); }}
            />
            <AzanRow
              icon={<Calendar size={16} />} title="Weekend mode" sub="Custom schedule"
              on={azanWeekend} isDark={isDark}
              iconBg={azanWeekend ? 'bg-emerald-100' : 'bg-slate-100'}
              iconColor={azanWeekend ? 'text-emerald-600' : 'text-slate-400'}
              onToggle={() => { const n = !azanWeekend; setAzanWeekend(n); persist('isa:azanWeekendMode', n); }}
              last
            />
          </div>

          {/* Footer */}
          <div className={`px-5 pb-5 pt-2 shrink-0 ${isDark ? 'bg-[#0d1f17]' : 'bg-white'}`}>
            <Link
              href="/dashboard/azan"
              className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#065f46 0%,#047857 100%)' }}
            >
              <Settings size={15} className="opacity-80" />
              Advanced Settings
              <ChevronRight size={15} className="ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            {favCount > 0 && (
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-rose-400 font-semibold">
                <Heart size={12} fill="currentColor" /> {favCount} favorite saved
              </p>
            )}
          </div>
        </motion.div>

        {/* ══ Right: stacked cards ══ */}
        <div className="flex flex-col gap-3">

          {/* Location */}
          <SectionCard title="Location" icon={<MapPin size={16} />} isDark={isDark}>
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className={labelCls}>City</label>
                <input
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setSaved(false); setLocErr(''); }}
                  placeholder="e.g. Karak"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setSaved(false); setLocErr(''); }}
                  placeholder="e.g. Pakistan"
                  className={inputCls}
                />
              </div>
            </div>
            {locErr && <p className="mb-2.5 text-xs text-rose-500">{locErr}</p>}
            <button
              onClick={saveLocation}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 transition"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
               : saved ? <><Check size={14} /> Saved!</>
               : 'Save Location'}
            </button>
          </SectionCard>

          {/* ── Pre & Post Azan Audio ── */}
          <SectionCard
            title="Pre & Post Azan Audio"
            icon={<Music2 size={16} />}
            isDark={isDark}
            noPad
          >
            <div className="px-5 py-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>
                    Auto-play Durood &amp; Dua
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-black/45'}`}>
                    Play alongside every Azan automatically
                  </p>
                </div>
                <Toggle on={prePostEnabled} onToggle={() => { const n = !prePostEnabled; setPrePostEnabled(n); persist('isa:prePostEnabled', n); }} isDark={isDark} />
              </div>

              {/* Queue stats */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className={`rounded-xl p-3 border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-emerald-50 border-emerald-100'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-emerald-600 font-bold text-sm">⏮</span>
                    <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-emerald-700'}`}>Before Azan</p>
                  </div>
                  <p className={`text-xl font-bold leading-none ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {preAzanQueue.length}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/30' : 'text-emerald-900/40'}`}>
                    {preAzanQueue.length === 0 ? 'None selected' : preAzanQueue.map(q => q.name).join(', ')}
                  </p>
                </div>
                <div className={`rounded-xl p-3 border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50 border-amber-100'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-amber-600 font-bold text-sm">⏭</span>
                    <p className={`text-xs font-semibold ${isDark ? 'text-amber-300/70' : 'text-amber-700'}`}>After Azan</p>
                  </div>
                  <p className={`text-xl font-bold leading-none ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    {postAzanQueue.length}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-white/30' : 'text-amber-900/40'}`}>
                    {postAzanQueue.length === 0 ? 'None selected' : postAzanQueue.map(q => q.name).join(', ')}
                  </p>
                </div>
              </div>

              {/* Hint */}
              <p className={`text-xs mb-3 leading-relaxed ${isDark ? 'text-white/35' : 'text-emerald-900/45'}`}>
                Upload your own Durood Sharif or Dua recordings and assign them to play before or after every Azan — individually or in sequence.
              </p>

              {/* Link to Azan Voices */}
              <Link
                href="/dashboard/azan"
                className={`flex items-center justify-between gap-2 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition group ${
                  isDark
                    ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Music2 size={14} className="opacity-70" />
                  Configure in Azan Voices
                </span>
                <ArrowRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </SectionCard>

          {/* School of Thought + Translation Language side-by-side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard
              title="School of Thought"
              isDark={isDark}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2 22h20M6 18V12M18 18V12M10 18V12M14 18V12M12 2l4 4H8l4-4zM4 12h16" />
                </svg>
              }
            >
              <div className="flex flex-wrap gap-2">
                {SECTS.map((s) => (
                  <Pill key={s.id} label={s.label} active={activeSectId === s.id} onClick={() => selectSect(s.id)} isDark={isDark} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Translation Language" icon={<Globe size={16} />} isDark={isDark}>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Pill key={l.id} label={l.label} active={language === l.id} onClick={() => selectLang(l.id)} isDark={isDark} />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Auto Azan */}
          <SectionCard
            title="Auto Azan"
            isDark={isDark}
            icon={azanOn ? <BellRing size={16} /> : <BellOff size={16} className="text-rose-500" />}
          >
            <div className="flex items-start justify-between gap-4">
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-black/60'}`}>
                {azanOn
                  ? 'Azan plays automatically at prayer times in this browser tab.'
                  : 'Turn on to hear the call to prayer at Fajr, Dhuhr, Asr, Maghrib & Isha.'}
              </p>
              <Toggle on={azanOn} onToggle={toggleAzan} isDark={isDark} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Coming Soon ── */}
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-500" />
          <h2 className={`text-lg font-bold ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>Coming Soon</h2>
          <span className={`ml-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'
          }`}>In Development</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {COMING_SOON.map((item, i) => {
            const ac = accentMap[item.accent];
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className={`relative rounded-xl border p-4 overflow-hidden ${
                  isDark ? 'bg-[#0d1f17] border-emerald-800/30' : 'bg-white border-emerald-100'
                }`}
              >
                {/* Coming Soon badge */}
                <span className={`absolute top-3 right-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${ac.badge}`}>
                  Soon
                </span>

                {/* subtle blur dot */}
                <div
                  aria-hidden
                  className={`absolute -top-4 -left-4 w-20 h-20 rounded-full blur-2xl opacity-30 ${ac.badge}`}
                />

                <div className="relative">
                  <span className="text-3xl leading-none">{item.emoji}</span>
                  <h3 className={`mt-2 font-bold text-sm ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>{item.title}</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-white/40' : 'text-black/50'}`}>{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
