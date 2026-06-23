'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Globe, BellOff, BellRing, SlidersHorizontal, Check, Loader2 } from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { SECTS, LANGUAGES } from '@/components/OnboardingSetup';
import { setLocationByCity } from '@/lib/location';

export type QuickSection = 'location' | 'sect' | 'language' | 'azan';

// ── helpers ────────────────────────────────────────────────────────────────

function persist(key: string, val: unknown) {
  const json = JSON.stringify(val);
  localStorage.setItem(key, json);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
}

// OnboardingSetup stores isa:fiqh as: hanafi|shafi|maliki|hanbali|jafari
// SECTS uses ids:                       hanafi|shafii|maliki|hanbali|shia
const TO_FIQH: Record<string, string>   = { hanafi:'hanafi', shafii:'shafi', maliki:'maliki', hanbali:'hanbali', shia:'jafari' };
const FROM_FIQH: Record<string, string> = { hanafi:'hanafi', shafi:'shafii', maliki:'maliki', hanbali:'hanbali', jafari:'shia' };

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-emerald-600">{icon}</span>
      <span className="text-[13px] font-bold text-emerald-950">{label}</span>
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition ${
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
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${on ? 'bg-emerald-500' : 'bg-black/20'}`}
    >
      <motion.span
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

// ── Main popup ─────────────────────────────────────────────────────────────

type PopupProps = {
  open: boolean;
  onClose: () => void;
  focusSection?: QuickSection;
};

export function QuickSettingsPopup({ open, onClose, focusSection }: PopupProps) {
  const [fiqh,    setFiqhState] = useLocalStorage<string>('isa:fiqh',       'hanafi');
  const [language, setLanguage] = useLocalStorage<string>('isa:language',   'en');
  const [azanOn,   setAzanOn]   = useLocalStorage<boolean>('isa:azanAutoplay', true);

  const [city,    setCity]    = useState('');
  const [country, setCountry] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [locErr,  setLocErr]  = useState('');

  // Pre-fill location inputs from storage whenever the popup opens.
  useEffect(() => {
    if (!open) return;
    try {
      const c  = localStorage.getItem('isa:city');
      const cn = localStorage.getItem('isa:country');
      if (c)  setCity(JSON.parse(c));
      if (cn) setCountry(JSON.parse(cn));
    } catch {}
    setSaved(false);
    setLocErr('');
  }, [open]);

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
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel — bottom-left, floats above the sidebar quick-actions row */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-4 bottom-4 z-[160] w-[300px] max-h-[88dvh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/[0.06]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white/98 backdrop-blur-sm px-5 py-4 border-b border-black/[0.06] rounded-t-3xl">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-emerald-600" />
                <h2 className="font-bold text-[15px] text-emerald-950">Quick Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-full bg-black/[0.06] text-black/40 hover:bg-black/10 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">

              {/* ── Location ── */}
              <section>
                <SectionLabel icon={<MapPin size={14} />} label="Location" />
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <input
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setSaved(false); setLocErr(''); }}
                    placeholder="City"
                    className="px-3 py-2 rounded-xl border border-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <input
                    value={country}
                    onChange={(e) => { setCountry(e.target.value); setSaved(false); setLocErr(''); }}
                    placeholder="Country"
                    className="px-3 py-2 rounded-xl border border-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                {locErr && <p className="mb-2 text-xs text-rose-600">{locErr}</p>}
                <button
                  onClick={saveLocation}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {saving
                    ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                    : saved
                    ? <><Check size={13} /> Saved!</>
                    : 'Save Location'}
                </button>
              </section>

              <hr className="border-black/[0.06]" />

              {/* ── School of Thought ── */}
              <section>
                <SectionLabel
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M2 22h20M6 18V12M18 18V12M10 18V12M14 18V12M12 2l4 4H8l4-4zM4 12h16" />
                    </svg>
                  }
                  label="School of Thought"
                />
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
              </section>

              <hr className="border-black/[0.06]" />

              {/* ── Translation Language ── */}
              <section>
                <SectionLabel icon={<Globe size={14} />} label="Translation Language" />
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
              </section>

              <hr className="border-black/[0.06]" />

              {/* ── Auto Azan ── */}
              <section
                className={`rounded-2xl px-4 py-3.5 transition-all duration-300 ${
                  focusSection === 'azan'
                    ? 'ring-2 ring-emerald-400 bg-emerald-50/50'
                    : 'bg-black/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {azanOn
                      ? <BellRing size={15} className="text-emerald-600 shrink-0" />
                      : <BellOff  size={15} className="text-rose-500 shrink-0" />}
                    <span className="text-sm font-bold text-emerald-950">Auto Azan</span>
                  </div>
                  <Toggle on={azanOn} onToggle={toggleAzan} />
                </div>
                <p className="mt-2 text-[11px] text-black/45 leading-relaxed">
                  {azanOn
                    ? 'Azan plays automatically at prayer times in this browser tab.'
                    : 'Turn on to hear the call to prayer at Fajr, Dhuhr, Asr, Maghrib & Isha.'}
                </p>
              </section>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Azan-off blinking tag ─────────────────────────────────────────────────

type AzanOffTagProps = { onClick: () => void; className?: string };

export function AzanOffTag({ onClick, className = '' }: AzanOffTagProps) {
  const [azanOn] = useLocalStorage<boolean>('isa:azanAutoplay', true);
  if (azanOn) return null;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: [
          '0 0 0 0 rgba(239,68,68,0.55)',
          '0 0 0 6px rgba(239,68,68,0)',
          '0 0 0 0 rgba(239,68,68,0)',
        ],
      }}
      transition={{ boxShadow: { duration: 1.8, repeat: Infinity, ease: 'easeOut' } }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-red-500/65 bg-black/25 text-red-400 text-[11px] font-bold backdrop-blur-sm select-none hover:bg-black/35 transition-colors ${className}`}
    >
      <BellOff size={11} />
      Auto-Azan OFF
    </motion.button>
  );
}
