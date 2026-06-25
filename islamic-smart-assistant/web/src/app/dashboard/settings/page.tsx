'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin, Globe, BellRing, BellOff, Check, Loader2, Settings,
  Activity, Volume2, Clock, Calendar, Heart, ChevronRight, Sparkles, Mic2,
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

// ── Shared UI pieces ───────────────────────────────────────────────────────

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
        on ? 'bg-emerald-500' : isDark ? 'bg-white/20' : 'bg-black/20'
      }`}
    >
      <motion.span
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function Pill({ label, active, onClick, isDark }: { label: string; active: boolean; onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
        active
          ? isDark
            ? 'border-emerald-500 bg-emerald-900/50 text-emerald-300'
            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : isDark
            ? 'border-white/10 bg-transparent text-white/40 hover:border-emerald-500/50 hover:text-emerald-400'
            : 'border-black/[0.08] bg-white text-black/50 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/40'
      }`}
    >
      {label}
    </button>
  );
}

function SectionCard({
  title, icon, children, isDark,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-[#0d1f17] border-emerald-800/40' : 'bg-white border-emerald-100'
      }`}
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
        isDark ? 'border-white/5' : 'border-emerald-900/5'
      }`}>
        <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{icon}</span>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </motion.div>
  );
}

function AzanRow({
  icon, title, sub, on, onToggle, last = false, iconBg, iconColor, isDark,
}: {
  icon: React.ReactNode; title: string; sub: string; on: boolean; onToggle: () => void;
  last?: boolean; iconBg?: string; iconColor?: string; isDark: boolean;
}) {
  const rowBorder = last ? '' : `border-b ${isDark ? 'border-white/5' : 'border-emerald-50'}`;
  return (
    <div className={`flex items-center gap-3 py-2.5 ${rowBorder}`}>
      <span className={`w-8 h-8 shrink-0 grid place-items-center rounded-lg ${
        isDark ? 'bg-white/10 text-emerald-400' : `${iconBg ?? 'bg-emerald-100'} ${iconColor ?? 'text-emerald-600'}`
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight ${
          on
            ? isDark ? 'text-emerald-50' : 'text-emerald-950'
            : isDark ? 'text-white/40' : 'text-emerald-950/50'
        }`}>{title}</p>
        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/30' : 'text-emerald-900/45'}`}>{sub}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} isDark={isDark} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isDark } = useTheme();

  const [fiqh,     setFiqhState] = useLocalStorage<string>('isa:fiqh',         'hanafi');
  const [language, setLanguage]  = useLocalStorage<string>('isa:language',     'en');
  const [azanOn,   setAzanOn]    = useLocalStorage<boolean>('isa:azanAutoplay', true);

  const [azanAnnounce,       setAzanAnnounce]       = useLocalStorage<boolean>('isa:azanAnnounce', true);
  const [azanAutoplayBefore, setAzanAutoplayBefore] = useLocalStorage<boolean>('isa:azanAutoplayBefore', true);
  const [azanDiffVoices,     setAzanDiffVoices]     = useLocalStorage<boolean>('isa:azanDifferentVoices', true);
  const [azanVolumeAuto,     setAzanVolumeAuto]      = useLocalStorage<boolean>('isa:azanVolumeAuto', true);
  const [azanWeekend,        setAzanWeekend]         = useLocalStorage<boolean>('isa:azanWeekendMode', false);
  const [savedVoice]                                  = useLocalStorage<string>('isa:azanVoice', '');

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
  const favCount = savedVoice ? 1 : 0;

  const inputCls = `w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
      : 'bg-white border-emerald-100 text-gray-900 placeholder:text-gray-400'
  }`;

  const labelCls = `block text-[10px] font-semibold mb-1 ${isDark ? 'text-white/40' : 'text-black/50'}`;

  return (
    <div className="w-full max-w-5xl flex flex-col gap-3">
      {/* ── Page header ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
          <Settings size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-700'} />
        </div>
        <div>
          <h1 className={`text-lg font-bold leading-tight ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}>Settings</h1>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/50'}`}>Manage your preferences</p>
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* ══ Left: Smart Azan Settings ══ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={`rounded-xl overflow-hidden border flex flex-col shadow-[0_2px_16px_-4px_rgba(16,185,129,0.18)] ${
            isDark ? 'border-emerald-800/40' : 'border-emerald-200'
          }`}
        >
          {/* Gradient header band */}
          <div
            className="relative overflow-hidden px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 55%,#047857 100%)' }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M20 0L25 8H15L20 0zM20 40L15 32H25L20 40zM0 20L8 15V25L0 20zM40 20L32 25V15L40 20z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <motion.span
                className="w-8 h-8 grid place-items-center rounded-lg bg-white/15 text-white shrink-0"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Activity size={16} />
              </motion.span>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white text-sm leading-tight">Smart Azan Settings</h2>
                <p className="text-emerald-200/70 text-[10px] mt-0.5">Personalise every call to prayer</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 shrink-0">
                <Sparkles size={10} /> Smart
              </span>
            </div>
          </div>

          {/* Toggle rows */}
          <div className={`px-4 flex-1 ${isDark ? 'bg-[#0d1f17]' : 'bg-white'}`}>
            <AzanRow
              icon={<Mic2 size={14} />} title="Prayer announcement" sub="Speak prayer name before Azan"
              on={azanAnnounce} isDark={isDark}
              iconBg={azanAnnounce ? 'bg-emerald-100' : 'bg-slate-100'}
              iconColor={azanAnnounce ? 'text-emerald-600' : 'text-slate-400'}
              onToggle={() => { const n = !azanAnnounce; setAzanAnnounce(n); persist('isa:azanAnnounce', n); }}
            />
            <AzanRow
              icon={<Clock size={14} />} title="Auto play before prayer" sub="2 min before adhan"
              on={azanAutoplayBefore} isDark={isDark}
              onToggle={() => { const n = !azanAutoplayBefore; setAzanAutoplayBefore(n); persist('isa:azanAutoplayBefore', n); }}
            />
            <AzanRow
              icon={<Volume2 size={14} />} title="Different voices" sub="For each prayer"
              on={azanDiffVoices} isDark={isDark}
              onToggle={() => { const n = !azanDiffVoices; setAzanDiffVoices(n); persist('isa:azanDifferentVoices', n); }}
            />
            <AzanRow
              icon={<Activity size={14} />} title="Volume control" sub="Auto adjust"
              on={azanVolumeAuto} isDark={isDark}
              onToggle={() => { const n = !azanVolumeAuto; setAzanVolumeAuto(n); persist('isa:azanVolumeAuto', n); }}
            />
            <AzanRow
              icon={<Calendar size={14} />} title="Weekend mode" sub="Custom schedule"
              on={azanWeekend} isDark={isDark}
              iconBg={azanWeekend ? 'bg-emerald-100' : 'bg-slate-100'}
              iconColor={azanWeekend ? 'text-emerald-600' : 'text-slate-400'}
              onToggle={() => { const n = !azanWeekend; setAzanWeekend(n); persist('isa:azanWeekendMode', n); }}
              last
            />
          </div>

          {/* Footer */}
          <div className={`px-4 pb-4 pt-1 shrink-0 ${isDark ? 'bg-[#0d1f17]' : 'bg-white'}`}>
            <Link
              href="/dashboard/azan"
              className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-semibold text-xs text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#065f46 0%,#047857 100%)' }}
            >
              <Settings size={13} className="opacity-80" />
              Advanced Settings
              <ChevronRight size={13} className="ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            {favCount > 0 && (
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-rose-400 font-semibold">
                <Heart size={10} fill="currentColor" /> {favCount} favorite saved
              </p>
            )}
          </div>
        </motion.div>

        {/* ══ Right: stacked cards ══ */}
        <div className="flex flex-col gap-3">

          {/* Location */}
          <SectionCard title="Location" icon={<MapPin size={14} />} isDark={isDark}>
            <div className="grid grid-cols-2 gap-2 mb-2">
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
            {locErr && <p className="mb-2 text-[10px] text-rose-500">{locErr}</p>}
            <button
              onClick={saveLocation}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60 transition"
            >
              {saving
                ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                : saved
                ? <><Check size={12} /> Saved!</>
                : 'Save Location'}
            </button>
          </SectionCard>

          {/* School of Thought + Translation side-by-side on wider right col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard
              title="School of Thought"
              isDark={isDark}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2 22h20M6 18V12M18 18V12M10 18V12M14 18V12M12 2l4 4H8l4-4zM4 12h16" />
                </svg>
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {SECTS.map((s) => (
                  <Pill key={s.id} label={s.label} active={activeSectId === s.id} onClick={() => selectSect(s.id)} isDark={isDark} />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Translation Language" icon={<Globe size={14} />} isDark={isDark}>
              <div className="flex flex-wrap gap-1.5">
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
            icon={azanOn
              ? <BellRing size={14} />
              : <BellOff size={14} className="text-rose-500" />}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-xs leading-relaxed ${isDark ? 'text-white/50' : 'text-black/60'}`}>
                {azanOn
                  ? 'Azan plays automatically at prayer times in this browser tab.'
                  : 'Turn on to hear the call to prayer at Fajr, Dhuhr, Asr, Maghrib & Isha.'}
              </p>
              <Toggle on={azanOn} onToggle={toggleAzan} isDark={isDark} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
