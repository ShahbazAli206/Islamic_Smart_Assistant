'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin, Globe, BellRing, BellOff, Check, Loader2, Settings,
  Activity, Volume2, Clock, Calendar, Heart, ChevronRight, Sparkles, Mic2,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
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

// ── Small shared UI pieces ─────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-emerald-900/5">
        <span className="text-emerald-600">{icon}</span>
        <h2 className="font-bold text-emerald-950">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
        active
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : 'border-black/[0.08] bg-white text-black/50 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/40'
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none ${on ? 'bg-emerald-500' : 'bg-black/20'}`}
    >
      <motion.span
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

// ── Smart Azan row ─────────────────────────────────────────────────────────

function AzanRow({
  icon,
  title,
  sub,
  on,
  onToggle,
  last = false,
  iconColor = 'text-emerald-600',
  iconBg = 'bg-emerald-100',
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
  last?: boolean;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className={`flex items-center gap-4 py-4 ${!last ? 'border-b border-emerald-50' : ''}`}>
      <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${on ? 'text-emerald-950' : 'text-emerald-950/60'}`}>{title}</p>
        <p className="text-xs text-emerald-900/45 mt-0.5">{sub}</p>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [fiqh,     setFiqhState] = useLocalStorage<string>('isa:fiqh',         'hanafi');
  const [language, setLanguage]  = useLocalStorage<string>('isa:language',     'en');
  const [azanOn,   setAzanOn]    = useLocalStorage<boolean>('isa:azanAutoplay', true);

  // Smart Azan Settings toggles
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

  // Pre-fill from storage on mount.
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

  return (
    <div className="max-w-2xl space-y-6">
      {/* page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Settings size={20} className="text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">Settings</h1>
          <p className="text-sm text-black/50">Manage your preferences</p>
        </div>
      </div>

      {/* ── Smart Azan Settings ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl overflow-hidden shadow-[0_4px_24px_-6px_rgba(16,185,129,0.22)] border border-emerald-200"
      >
        {/* Card header — rich gradient band */}
        <div
          className="relative overflow-hidden px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)' }}
        >
          {/* subtle arabesque pattern overlay */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 0L25 8H15L20 0zM20 40L15 32H25L20 40zM0 20L8 15V25L0 20zM40 20L32 25V15L40 20z'/%3E%3C/g%3E%3C/svg%3E")`,
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
            <div>
              <h2 className="font-bold text-white text-[17px] leading-tight">Smart Azan Settings</h2>
              <p className="text-emerald-200/70 text-xs mt-0.5">Personalise every call to prayer</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-[11px] font-semibold px-2.5 py-1">
              <Sparkles size={11} /> Smart
            </span>
          </div>
        </div>

        {/* Toggle rows */}
        <div className="bg-white px-6">
          <AzanRow
            icon={<Mic2 size={16} />}
            title="Prayer announcement"
            sub="Speak prayer name before Azan"
            on={azanAnnounce}
            onToggle={() => { const n = !azanAnnounce; setAzanAnnounce(n); persist('isa:azanAnnounce', n); }}
            iconBg={azanAnnounce ? 'bg-emerald-100' : 'bg-slate-100'}
            iconColor={azanAnnounce ? 'text-emerald-600' : 'text-slate-400'}
          />
          <AzanRow
            icon={<Clock size={16} />}
            title="Auto play before prayer"
            sub="2 min before adhan"
            on={azanAutoplayBefore}
            onToggle={() => { const n = !azanAutoplayBefore; setAzanAutoplayBefore(n); persist('isa:azanAutoplayBefore', n); }}
          />
          <AzanRow
            icon={<Volume2 size={16} />}
            title="Different voices"
            sub="For each prayer"
            on={azanDiffVoices}
            onToggle={() => { const n = !azanDiffVoices; setAzanDiffVoices(n); persist('isa:azanDifferentVoices', n); }}
          />
          <AzanRow
            icon={<Activity size={16} />}
            title="Volume control"
            sub="Auto adjust"
            on={azanVolumeAuto}
            onToggle={() => { const n = !azanVolumeAuto; setAzanVolumeAuto(n); persist('isa:azanVolumeAuto', n); }}
          />
          <AzanRow
            icon={<Calendar size={16} />}
            title="Weekend mode"
            sub="Custom schedule"
            on={azanWeekend}
            onToggle={() => { const n = !azanWeekend; setAzanWeekend(n); persist('isa:azanWeekendMode', n); }}
            iconBg={azanWeekend ? 'bg-emerald-100' : 'bg-slate-100'}
            iconColor={azanWeekend ? 'text-emerald-600' : 'text-slate-400'}
            last
          />
        </div>

        {/* Footer */}
        <div className="bg-white px-6 pb-5">
          <Link
            href="/dashboard/azan"
            className="group mt-1 flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' }}
          >
            <Settings size={15} className="opacity-80" />
            Advanced Settings
            <ChevronRight size={15} className="ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {favCount > 0 && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-400 font-semibold">
              <Heart size={12} fill="currentColor" /> {favCount} favorite saved
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Location ── */}
      <SectionCard title="Location" icon={<MapPin size={16} />}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-black/50 mb-1.5">City</label>
            <input
              value={city}
              onChange={(e) => { setCity(e.target.value); setSaved(false); setLocErr(''); }}
              placeholder="e.g. Karak"
              className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black/50 mb-1.5">Country</label>
            <input
              value={country}
              onChange={(e) => { setCountry(e.target.value); setSaved(false); setLocErr(''); }}
              placeholder="e.g. Pakistan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        {locErr && <p className="mb-2.5 text-xs text-rose-600">{locErr}</p>}
        <button
          onClick={saveLocation}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : saved
            ? <><Check size={14} /> Saved!</>
            : 'Save Location'}
        </button>
      </SectionCard>

      {/* ── School of Thought ── */}
      <SectionCard
        title="School of Thought"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M2 22h20M6 18V12M18 18V12M10 18V12M14 18V12M12 2l4 4H8l4-4zM4 12h16" />
          </svg>
        }
      >
        <div className="flex flex-wrap gap-2">
          {SECTS.map((s) => (
            <Pill
              key={s.id}
              label={s.label}
              active={activeSectId === s.id}
              onClick={() => selectSect(s.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Translation Language ── */}
      <SectionCard title="Translation Language" icon={<Globe size={16} />}>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Pill
              key={l.id}
              label={l.label}
              active={language === l.id}
              onClick={() => selectLang(l.id)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ── Auto Azan ── */}
      <SectionCard
        title="Auto Azan"
        icon={azanOn ? <BellRing size={16} /> : <BellOff size={16} className="text-rose-500" />}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-black/60 leading-relaxed">
            {azanOn
              ? 'Azan plays automatically at prayer times in this browser tab.'
              : 'Turn on to hear the call to prayer at Fajr, Dhuhr, Asr, Maghrib & Isha.'}
          </p>
          <Toggle on={azanOn} onToggle={toggleAzan} />
        </div>
      </SectionCard>
    </div>
  );
}
