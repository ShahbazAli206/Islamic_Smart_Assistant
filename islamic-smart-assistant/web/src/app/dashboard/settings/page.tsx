'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, BellRing, BellOff, Check, Loader2, Settings } from 'lucide-react';
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

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [fiqh,     setFiqhState] = useLocalStorage<string>('isa:fiqh',         'hanafi');
  const [language, setLanguage]  = useLocalStorage<string>('isa:language',     'en');
  const [azanOn,   setAzanOn]    = useLocalStorage<boolean>('isa:azanAutoplay', true);

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
        <p className="mt-3 text-xs text-black/40">
          {SECTS.find((s) => s.id === activeSectId)?.desc ?? ''}
        </p>
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
