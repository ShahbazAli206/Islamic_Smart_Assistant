'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Globe, User, ChevronRight, Check, Loader2, AlertTriangle, Compass } from 'lucide-react';
import { fetchTimingsByCity, detectLocationByIP } from '@/lib/prayer';

export type Sect = 'hanafi' | 'shafii' | 'maliki' | 'hanbali' | 'shia';
export type Language = 'ur' | 'en' | 'none';

export const SECTS: { id: Sect; label: string; arabic: string; desc: string; method: number }[] = [
  { id: 'hanafi',  label: 'Hanafi',        arabic: 'حنفي',  desc: 'Imam Abu Hanifa · South Asia, Turkey',    method: 1 },
  { id: 'shafii',  label: "Shafi'i",        arabic: 'شافعي', desc: "Imam Al-Shafi'i · SE Asia, East Africa",   method: 3 },
  { id: 'maliki',  label: 'Maliki',         arabic: 'مالكي', desc: 'Imam Malik · North & West Africa',         method: 3 },
  { id: 'hanbali', label: 'Hanbali',        arabic: 'حنبلي', desc: 'Imam Ibn Hanbal · Gulf region',            method: 4 },
  { id: 'shia',    label: 'Shia (Jafari)', arabic: 'جعفري', desc: 'Jafari school · Iran, Iraq',                method: 7 },
];

export const LANGUAGES: { id: Language; label: string; native: string }[] = [
  { id: 'ur',   label: 'Urdu',        native: 'اردو' },
  { id: 'en',   label: 'English',     native: 'English' },
  { id: 'none', label: 'Arabic only', native: 'عربي فقط' },
];

const TOTAL_STEPS = 3;

type Props = {
  forceOpen?: boolean;
  onClose?: () => void;
};

export function OnboardingSetup({ forceOpen = false, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  const [draftCity,    setDraftCity]    = useState('');
  const [draftCountry, setDraftCountry] = useState('');
  const [draftSect,    setDraftSect]    = useState<Sect>('hanafi');
  const [draftLang,    setDraftLang]    = useState<Language>('ur');
  const [draftName,    setDraftName]    = useState('');

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,   setGeoError]   = useState('');
  const [geoSuccess, setGeoSuccess] = useState(false);

  // Validation of the city/country combination before leaving the location step.
  const [validating, setValidating] = useState(false);
  const [locError,   setLocError]   = useState('');

  // Ensures we only fire the automatic permission prompt once per mount.
  const autoPrompted = useRef(false);

  useEffect(() => {
    if (forceOpen) {
      prefill();
      setStep(0);
      setGeoError('');
      setShow(true);
      return;
    }
    try {
      const done = localStorage.getItem('isa:setupDone');
      if (!done || done === 'false') {
        setStep(0);
        setShow(true);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen]);

  // First visit only: proactively ask for location the moment the wizard opens,
  // so the browser's native permission popup appears without an extra click.
  // (When re-opened from the profile "edit preferences" button we leave it to a
  // deliberate click instead.)
  useEffect(() => {
    if (show && !forceOpen && step === 0 && !geoSuccess && !autoPrompted.current) {
      autoPrompted.current = true;
      detectLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, forceOpen, step]);

  const prefill = () => {
    try {
      const city    = safeRead('isa:city',     '');
      const country = safeRead('isa:country',  '');
      const sect    = safeRead('isa:sect',     'hanafi') as Sect;
      const lang    = safeRead('isa:language', 'ur')     as Language;
      const name    = safeRead('isa:name',     '');
      setDraftCity(city);
      setDraftCountry(country);
      setDraftSect(sect);
      setDraftLang(lang);
      setDraftName(name);
      setGeoSuccess(Boolean(city && country));
    } catch {}
  };

  const detectLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Try "Detect by IP" instead.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
            { headers: { 'User-Agent': 'NoorIslamicApp/1.0' } },
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const city    = addr.city || addr.town || addr.village || addr.county || addr.state || '';
          const country = addr.country || '';
          setDraftCity(city);
          setDraftCountry(country);
          setGeoSuccess(true);
          localStorage.setItem('isa:lat', JSON.stringify(lat));
          localStorage.setItem('isa:lng', JSON.stringify(lng));
        } catch {
          setGeoError('Location found but city lookup failed. Please type your city below.');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setGeoError('Permission denied — try "Detect by IP" or type your city and country below.');
      },
      { timeout: 10_000 },
    );
  };

  const detectByIP = async () => {
    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);
    try {
      const loc = await detectLocationByIP();
      if (loc.city && loc.country) {
        setDraftCity(loc.city);
        setDraftCountry(loc.country);
        setGeoSuccess(true);
        localStorage.setItem('isa:lat', JSON.stringify(loc.lat));
        localStorage.setItem('isa:lng', JSON.stringify(loc.lng));
      } else {
        setGeoError('Could not detect your city from IP. Please type it manually.');
      }
    } catch {
      setGeoError('IP detection failed. Please type your city and country below.');
    } finally {
      setGeoLoading(false);
    }
  };

  // Advance from a step. On the location step we first confirm the city/country
  // combination actually resolves to real prayer times — so a mismatch like
  // "Taxila, Canada" is caught here with a friendly prompt instead of surfacing
  // a broken/empty prayer-time card later.
  const goNext = async () => {
    if (step !== 0) {
      setStep((s) => s + 1);
      return;
    }
    const city = draftCity.trim();
    const country = draftCountry.trim();
    if (!city || !country) {
      setLocError('Please enter both your city and country.');
      return;
    }
    setValidating(true);
    setLocError('');
    try {
      await fetchTimingsByCity(city, country);
      setStep((s) => s + 1);
    } catch {
      setLocError(
        `We couldn't find "${city}, ${country}". Please double-check it — the city must be in the selected country (e.g. Taxila is in Pakistan, not Canada).`,
      );
    } finally {
      setValidating(false);
    }
  };

  const save = () => {
    const sect   = draftSect;
    const method = SECTS.find((s) => s.id === sect)?.method ?? 1;
    const city    = draftCity.trim()    || 'Karachi';
    const country = draftCountry.trim() || 'Pakistan';

    const persist = (key: string, val: unknown) => {
      const json = JSON.stringify(val);
      localStorage.setItem(key, json);
      // Notify same-tab listeners (useLocalStorage hooks listen to storage events)
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
    };

    persist('isa:city',      city);
    persist('isa:country',   country);
    persist('isa:sect',      sect);
    persist('isa:method',    method);
    persist('isa:language',  draftLang);
    persist('isa:name',      draftName.trim());
    persist('isa:setupDone', true);

    setShow(false);
    onClose?.();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-midnight-900/75 backdrop-blur-sm"
      />

      {/* card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* header */}
        <div className="relative bg-mosque-gradient text-parchment px-8 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-glow-emerald pointer-events-none" />
          <div className="relative">
            {/* step progress */}
            <div className="flex items-center gap-2 mb-5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= step ? 'bg-gold-300 w-10' : 'bg-white/25 w-4'
                  }`}
                />
              ))}
              <span className="ml-auto text-xs text-emerald-100/60">
                {step + 1} / {TOTAL_STEPS}
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold">
              {step === 0 && 'Where are you?'}
              {step === 1 && 'Your school of thought'}
              {step === 2 && 'Quran & translation'}
            </h2>
            <p className="text-emerald-100/75 text-sm mt-1">
              {step === 0 && 'Needed for accurate prayer times and Azan scheduling'}
              {step === 1 && 'Sets the correct prayer time calculation method'}
              {step === 2 && 'Preferred translation language for the Holy Quran'}
            </p>
          </div>
        </div>

        {/* body */}
        <div className="px-8 py-6 min-h-[280px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* ── Step 0 : Location ── */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-4"
              >
                {geoSuccess ? (
                  <div className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold text-sm">
                    <Check size={17} /> Location detected
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={detectLocation}
                      disabled={geoLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition select-none"
                    >
                      {geoLoading
                        ? <><Loader2 size={15} className="animate-spin" /> Detecting…</>
                        : <><Navigation size={15} /> Use GPS</>
                      }
                    </button>
                    <button
                      onClick={detectByIP}
                      disabled={geoLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition select-none"
                    >
                      {geoLoading
                        ? <><Loader2 size={15} className="animate-spin" /> Detecting…</>
                        : <><Compass size={15} /> Detect by IP</>
                      }
                    </button>
                  </div>
                )}

                {geoError && (
                  <p className="text-xs text-rose-600 leading-relaxed">{geoError}</p>
                )}

                {locError && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{locError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-ink/40">
                  <div className="flex-1 border-t border-ink/10" />
                  <span>or type manually</span>
                  <div className="flex-1 border-t border-ink/10" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-ink/55 mb-1 block">City</label>
                    <input
                      value={draftCity}
                      onChange={(e) => { setDraftCity(e.target.value); setLocError(''); }}
                      placeholder="Karachi"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink/55 mb-1 block">Country</label>
                    <input
                      value={draftCountry}
                      onChange={(e) => { setDraftCountry(e.target.value); setLocError(''); }}
                      placeholder="Pakistan"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 1 : Sect ── */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 space-y-2"
              >
                {SECTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setDraftSect(s.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition
                      ${draftSect === s.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-emerald-100 hover:border-emerald-300 bg-white'
                      }`}
                  >
                    <span
                      className="font-arabic text-2xl text-emerald-700 w-10 shrink-0 text-center leading-none"
                      aria-hidden
                    >
                      {s.arabic}
                    </span>
                    <span className="flex-1">
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-ink/50">{s.desc}</p>
                    </span>
                    {draftSect === s.id && (
                      <Check size={16} className="text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}

            {/* ── Step 2 : Language + Name ── */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 space-y-4"
              >
                <div className="space-y-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setDraftLang(l.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition
                        ${draftLang === l.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-emerald-100 hover:border-emerald-300 bg-white'
                        }`}
                    >
                      <Globe
                        size={20}
                        className={`shrink-0 ${draftLang === l.id ? 'text-emerald-600' : 'text-ink/35'}`}
                      />
                      <span className="flex-1">
                        <p className="font-semibold text-sm">{l.label}</p>
                        <p className="text-xs text-ink/50 font-arabic">{l.native}</p>
                      </span>
                      {draftLang === l.id && (
                        <Check size={16} className="text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-ink/55 mb-1.5 flex items-center gap-1.5">
                    <User size={13} />
                    Your name
                    <span className="text-ink/35 font-normal">(optional)</span>
                  </label>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Enter your name…"
                    maxLength={60}
                    className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer */}
        <div className="px-8 pb-7 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-ink/45 hover:text-ink/80 transition"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={goNext}
              disabled={validating}
              className="btn-primary px-6 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {validating
                ? <><Loader2 size={16} className="animate-spin" /> Checking…</>
                : <>Next <ChevronRight size={16} /></>}
            </button>
          ) : (
            <button onClick={save} className="btn-primary px-8 py-2.5 text-sm">
              <Check size={16} /> Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function safeRead(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as string) : fallback;
  } catch {
    return fallback;
  }
}
