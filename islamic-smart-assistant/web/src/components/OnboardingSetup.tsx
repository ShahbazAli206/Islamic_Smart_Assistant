'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Globe, User, ChevronRight, Check, Loader2, AlertTriangle, Compass, X, BellRing, Bell, Volume2 } from 'lucide-react';
import { detectLocationByIP } from '@/lib/prayer';
import { setLocationByCity, setLocationByCoords, locLabel } from '@/lib/location';
import { methodByCountry } from '@/lib/sect';
import { applyDesktopSetupSettings } from '@/lib/desktopSetup';
import { LANGUAGE_OPTIONS } from '@/lib/quran';

export type Sect = 'hanafi' | 'shafii' | 'maliki' | 'hanbali' | 'shia';
export type Language = string;

export const SECTS: { id: Sect; label: string; arabic: string; desc: string; method: number }[] = [
  { id: 'hanafi',  label: 'Hanafi',        arabic: 'حنفي',  desc: 'Imam Abu Hanifa · South Asia, Turkey',    method: 1 },
  { id: 'shafii',  label: "Shafi'i",        arabic: 'شافعي', desc: "Imam Al-Shafi'i · SE Asia, East Africa",   method: 3 },
  { id: 'maliki',  label: 'Maliki',         arabic: 'مالكي', desc: 'Imam Malik · North & West Africa',         method: 3 },
  { id: 'hanbali', label: 'Hanbali',        arabic: 'حنبلي', desc: 'Imam Ibn Hanbal · Gulf region',            method: 4 },
  { id: 'shia',    label: 'Fiqah Jafri', arabic: 'جعفري', desc: 'Jafari school · Iran, Iraq',                method: 7 },
];

// Every language the Qur'an translation dropdown offers, so onboarding,
// settings, quick settings and the profile form all present the same list.
export const LANGUAGES: { id: Language; label: string; native: string }[] =
  LANGUAGE_OPTIONS.map(({ code, label, native }) => ({ id: code, label, native }));

const TOTAL_STEPS = 4;

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

  const [geoLoading,    setGeoLoading]    = useState(false);
  const [geoError,      setGeoError]      = useState('');
  const [geoSuccess,    setGeoSuccess]    = useState(false);
  const [gpsDenied,     setGpsDenied]     = useState(false);
  const [ipFailed,      setIpFailed]      = useState(false);

  // Validation of the city/country combination before leaving the location step.
  const [validating, setValidating] = useState(false);
  const [locError,   setLocError]   = useState('');
  const [saving,     setSaving]     = useState(false);

  // Coordinates that match the *currently shown* city/country. Set by GPS/IP
  // detection (and prefill); cleared the moment the user types a different
  // city/country so we know to re-derive coords on save instead of keeping a
  // stale GPS point. `locDirty` tracks whether the location changed this session.
  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);
  const [locDirty, setLocDirty] = useState(false);

  // ── Azan step state ──────────────────────────────────────────────────────────
  const [azanStatus, setAzanStatus] = useState<'idle' | 'enabling' | 'done'>('idle');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const azanAudioRef = useRef<HTMLAudioElement | null>(null);

  const enableAzan = async () => {
    setAzanStatus('enabling');
    // Muted play → registers a user gesture so the browser allows future autoplay.
    if (!azanAudioRef.current) azanAudioRef.current = new Audio();
    const el = azanAudioRef.current;
    el.muted = true;
    el.src = '/audio/adhan/makkah.mp3';
    try { await el.play(); el.pause(); el.currentTime = 0; el.muted = false; } catch {}
    const persist = (key: string, val: unknown) => {
      const json = JSON.stringify(val);
      localStorage.setItem(key, json);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
    };
    persist('isa:azanAutoplay', true);
    persist('isa:azanUnlocked', true);
    // Request notification permission for background alerts.
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } else {
      setNotifPermission('unsupported');
    }
    setAzanStatus('done');
  };

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
    // In the desktop app, the Electron setup wizard already asked all of these
    // questions — apply its answers first, then only show this popup when the
    // user has genuinely never completed any onboarding.
    let cancelled = false;
    (async () => {
      try { await applyDesktopSetupSettings(); } catch {}
      if (cancelled) return;
      try {
        const done = localStorage.getItem('isa:setupDone');
        if (!done || done === 'false') {
          setStep(0);
          setShow(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
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
      // Carry over stored coordinates ONLY if they're tagged for this same city;
      // otherwise they're stale and save() should re-geocode the city instead of
      // re-stamping an unrelated old GPS point.
      const coordsFor = safeRead('isa:coordsFor', '');
      const coordsMatch = coordsFor !== '' && coordsFor === locLabel(city, country);
      setDraftLat(coordsMatch ? safeReadNum('isa:lat') : null);
      setDraftLng(coordsMatch ? safeReadNum('isa:lng') : null);
      setLocDirty(false);
    } catch {}
  };

  const detectLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGpsDenied(true);
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);
    setGpsDenied(false);
    setIpFailed(false);

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
          setDraftLat(lat);
          setDraftLng(lng);
          setLocDirty(true);
        } catch {
          setGeoError('Location found but city lookup failed. Please type your city below.');
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setGpsDenied(true);
          setGeoError('Browser blocked GPS access. Use "Detect by IP" or type your city below.');
        } else {
          setGeoError('GPS unavailable. Try "Detect by IP" or type your city below.');
        }
      },
      { timeout: 10_000 },
    );
  };

  const detectByIP = async () => {
    setGeoLoading(true);
    setGeoError('');
    setGeoSuccess(false);
    setIpFailed(false);
    try {
      const loc = await detectLocationByIP();
      if (loc.city && loc.country) {
        setDraftCity(loc.city);
        setDraftCountry(loc.country);
        setGeoSuccess(true);
        setDraftLat(loc.lat);
        setDraftLng(loc.lng);
        setLocDirty(true);
      } else {
        setIpFailed(true);
        setGeoError('Could not detect your city from IP. Please type it manually.');
      }
    } catch {
      setIpFailed(true);
      setGeoError('IP detection failed. Check your internet connection.');
    } finally {
      setGeoLoading(false);
    }
  };

  // Advance from a step. On the location step we verify via geocoding that the
  // city actually exists in the stated country. AlAdhan's API ignores the country
  // field and returns prayer times for the city globally, so it would silently
  // accept "Taxila, Canada" — geocoding is the only way to catch the mismatch.
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
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1` +
        `&q=${encodeURIComponent(`${city}, ${country}`)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'NoorIslamicApp/1.0' },
        cache: 'no-store',
      });
      const hits: any[] = res.ok ? await res.json() : [];

      if (!hits.length) {
        setLocError(`"${city}, ${country}" couldn't be found. Please check the spelling.`);
        return;
      }

      // Check the top result's country against what the user typed (case-insensitive).
      const resultCountry: string = (hits[0].address?.country ?? '').toLowerCase();
      const typed = country.toLowerCase();
      const countryOk =
        resultCountry.includes(typed) || typed.includes(resultCountry);

      if (!countryOk) {
        const actual = hits[0].address?.country ?? 'a different country';
        setLocError(
          `"${city}" is in ${actual}, not "${country}". Please fix the city or country.`,
        );
        return;
      }

      // Cache geocoded coords so save() uses them without another API call.
      if (draftLat == null || draftLng == null) {
        setDraftLat(parseFloat(hits[0].lat));
        setDraftLng(parseFloat(hits[0].lon));
      }

      setStep((s) => s + 1);
    } catch {
      // Nominatim unreachable — allow through rather than blocking the user.
      setStep((s) => s + 1);
    } finally {
      setValidating(false);
    }
  };

  const save = async () => {
    const school = draftSect;
    const city    = draftCity.trim()    || 'Karachi';
    const country = draftCountry.trim() || 'Pakistan';
    // Prefer the regional convention for the user's country; fall back to the
    // sect's traditional default only when the country is unrecognised.
    const sectMethod = SECTS.find((s) => s.id === school)?.method ?? 1;
    const method = methodByCountry(country) ?? sectMethod;

    // Map the onboarding school to the sect/fiqh format the prayer-times page expects.
    // Onboarding uses: hanafi, shafii, maliki, hanbali, shia
    // Prayer-times uses: isa:sect = 'sunni'|'shia', isa:fiqh = 'hanafi'|'shafi'|…
    const sectValue = school === 'shia' ? 'shia' : 'sunni';
    const FIQH_MAP: Record<string, string> = {
      hanafi: 'hanafi', shafii: 'shafi', maliki: 'maliki', hanbali: 'hanbali', shia: 'jafari',
    };
    const fiqhValue = FIQH_MAP[school] ?? 'hanafi';

    const persist = (key: string, val: unknown) => {
      const json = JSON.stringify(val);
      localStorage.setItem(key, json);
      // Notify same-tab listeners (useLocalStorage hooks listen to storage events)
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
    };

    setSaving(true);

    persist('isa:sect',      sectValue);
    persist('isa:fiqh',      fiqhValue);
    persist('isa:method',    method);
    persist('isa:language',  draftLang);
    persist('isa:name',      draftName.trim());

    // Location — keep coordinates in sync with the chosen city so a previously
    // detected GPS fix can never override an explicitly typed city/country.
    if (draftLat != null && draftLng != null) {
      // Coords already match the shown city (from detection or an untouched prefill).
      // Clear a stale pinned mosque only when the location actually changed.
      setLocationByCoords(draftLat, draftLng, city, country, { clearMosque: locDirty });
    } else {
      // Manually typed / changed city → geocode to fresh coords (also clears the mosque).
      await setLocationByCity(city, country);
    }

    persist('isa:setupDone', true);

    // First-visit only: if user didn't enable auto-Azan in this wizard, turn it
    // off so the floating "Enable auto-Azan" toast never appears to them separately.
    // (forceOpen = re-edit from profile — don't override their existing preference.)
    if (!forceOpen && azanStatus !== 'done') {
      persist('isa:azanAutoplay', false);
    }

    setSaving(false);
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
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* header */}
        <div className="relative bg-mosque-gradient text-parchment px-8 pt-8 pb-6 overflow-hidden shrink-0">
          <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-glow-emerald pointer-events-none" />
          <button
            onClick={() => { setShow(false); onClose?.(); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-parchment transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
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
              {step === 3 && 'Enable Auto-Azan'}
            </h2>
            <p className="text-emerald-100/75 text-sm mt-1">
              {step === 0 && 'Needed for accurate prayer times and Azan scheduling'}
              {step === 1 && 'Sets the correct prayer time calculation method'}
              {step === 2 && 'Preferred translation language for the Holy Quran'}
              {step === 3 && 'Hear the call to prayer automatically — 5 times a day'}
            </p>
          </div>
        </div>

        {/* body — scrolls vertically when a step's content is taller than the
            available space (e.g. the language list on a short phone screen) so
            the fixed footer / Next button always stays visible */}
        <div className="px-8 py-6 flex flex-col flex-1 min-h-0 overflow-y-auto">
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

                {/* GPS blocked — show how-to-enable hint */}
                {gpsDenied && !geoSuccess && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 leading-relaxed space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={13} /> GPS access blocked by your browser</p>
                    <p>To enable it: click the lock/info icon in your browser's address bar → <strong>Site settings</strong> → set <strong>Location</strong> to "Allow". Then click "Use GPS" again.</p>
                    <p>Alternatively, use <strong>Detect by IP</strong> — it works without any browser permission.</p>
                  </div>
                )}

                {/* IP detection failed — show retry */}
                {ipFailed && !geoSuccess && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 leading-relaxed space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5"><AlertTriangle size={13} /> IP detection failed</p>
                    <p>Check your internet connection or disable any active VPN, then try again.</p>
                    <button
                      onClick={detectByIP}
                      disabled={geoLoading}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 transition"
                    >
                      <Compass size={12} /> Retry IP Detection
                    </button>
                  </div>
                )}

                {geoError && !gpsDenied && !ipFailed && (
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
                      onChange={(e) => { setDraftCity(e.target.value); setLocError(''); setDraftLat(null); setDraftLng(null); setLocDirty(true); }}
                      placeholder="Karachi"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink/55 mb-1 block">Country</label>
                    <input
                      value={draftCountry}
                      onChange={(e) => { setDraftCountry(e.target.value); setLocError(''); setDraftLat(null); setDraftLng(null); setLocDirty(true); }}
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
                      onClick={() => {
                        setDraftLang(l.id);
                        // Apply immediately — don't wait for Done so the rest
                        // of the app (Quran ayah, player) updates in real time.
                        const json = JSON.stringify(l.id);
                        localStorage.setItem('isa:language', json);
                        window.dispatchEvent(new StorageEvent('storage', { key: 'isa:language', newValue: json }));
                      }}
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
            {/* ── Step 3 : Auto-Azan ── */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Prayer pills */}
                <div className="flex flex-wrap justify-center gap-2">
                  {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((p) => (
                    <span key={p} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {p}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-ink/60 text-center leading-relaxed">
                  The Azan plays automatically in this browser tab at each prayer time.
                  One tap unlocks audio — no app installation needed.
                </p>

                {/* Enable button / success state */}
                {azanStatus !== 'done' ? (
                  <motion.button
                    onClick={enableAzan}
                    disabled={azanStatus === 'enabling'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-70 transition"
                  >
                    {azanStatus === 'enabling'
                      ? <><Loader2 size={16} className="animate-spin" /> Enabling…</>
                      : <><BellRing size={16} /> Enable Auto-Azan</>}
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-700 font-semibold text-sm"
                  >
                    <Check size={17} strokeWidth={2.5} /> Auto-Azan enabled!
                  </motion.div>
                )}

                {/* Notification result */}
                <AnimatePresence>
                  {azanStatus === 'done' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed
                        ${notifPermission === 'granted'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border border-amber-200 text-amber-800'}`}
                    >
                      {notifPermission === 'granted'
                        ? <Bell size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                        : <Bell size={14} className="shrink-0 mt-0.5 text-amber-600" />}
                      {notifPermission === 'granted'
                        ? 'Notifications allowed — you\'ll be alerted even when the tab is in the background.'
                        : 'Notification permission denied. Keep this tab open to hear the Azan. You can allow notifications in browser settings anytime.'}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info row */}
                <div className="flex items-center gap-4 pt-1">
                  {[
                    { icon: Volume2, label: 'Azan audio' },
                    { icon: Bell,    label: 'Notifications' },
                    { icon: Check,   label: 'No app needed' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <Icon size={14} className="text-emerald-600" />
                      </div>
                      <span className="text-[10px] text-ink/50 font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer — pinned below the scrollable body so Next/Done is always reachable */}
        <div className="px-8 pt-4 pb-7 flex items-center justify-between shrink-0 border-t border-emerald-900/5 bg-white">
          {/* Left action */}
          {step === 3 ? (
            azanStatus !== 'done'
              ? <button onClick={save} disabled={saving} className="text-sm text-ink/45 hover:text-ink/80 transition disabled:opacity-50">
                  Skip Azan for now
                </button>
              : <div />
          ) : step > 0 ? (
            <button onClick={() => setStep((s) => s - 1)} className="text-sm text-ink/45 hover:text-ink/80 transition">
              ← Back
            </button>
          ) : (
            <div />
          )}

          {/* Right action */}
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
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : <><Check size={16} /> {azanStatus === 'done' ? 'Finish' : 'Done'}</>}
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

function safeReadNum(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const v = JSON.parse(raw);
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
