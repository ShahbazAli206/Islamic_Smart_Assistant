'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, MapPin, Search, LocateFixed, Loader2, Building2, Navigation, X, Check,
  ChevronDown, ChevronRight, Clock, BookOpen, Compass, Bell,
} from 'lucide-react';
import { PrayerCountdownHero } from '@/components/PrayerCountdown';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { searchMosquesNear, type Mosque } from '@/lib/overpass';
import { geocodePlace, reverseGeocodeDetails } from '@/lib/geo';
import { detectLocationByIP } from '@/lib/prayer';
import { readStoredLocation, clearPinnedMosque, setLocationByCoords } from '@/lib/location';
import {
  FIQH_BY_SECT, FIQH_LABEL, METHOD_LABELS, defaultParams, normalizeSect, normalizeFiqh,
  methodByCountry, type Sect, type Fiqh,
} from '@/lib/sect';
import { useTheme } from '@/lib/ThemeContext';

const MosqueMap = dynamic(() => import('@/components/MosqueMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[420px] rounded-2xl bg-white/5 animate-pulse" />,
});

const FALLBACK_CENTER = { lat: 24.8607, lng: 67.0011 }; // Karachi — last resort only

// Bottom feature strip shown beneath the page (matches the reference design).
const FEATURE_STRIP = [
  { icon: Clock,    title: 'Accurate Prayer Times', sub: 'Calculated for your location' },
  { icon: BookOpen, title: 'Quran & Recitation',    sub: 'Listen. Reflect. Grow' },
  { icon: Compass,  title: 'Qibla Finder',          sub: 'Find direction with ease' },
  { icon: Bell,     title: 'Azan & Alerts',         sub: 'Never miss a prayer' },
  { icon: Sparkles, title: 'Smart Assistant',       sub: 'Here to guide you' },
];


/** Custom, fully-styled Calculation-method dropdown (replaces the native <select>). */
function MethodDropdown({
  value, onChange, options, isDark, locationLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { id: number; label: string }[];
  isDark: boolean;
  locationLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const autoLabel = locationLabel ? `Auto — ${locationLabel}` : 'Auto (by location)';
  const items = [{ id: -1, label: autoLabel }, ...options];
  const selected = items.find((m) => m.id === value) ?? items[0];

  const trig = isDark
    ? 'border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.07)] text-white hover:bg-[rgba(255,255,255,0.14)]'
    : 'border-emerald-900/15 bg-white text-black hover:bg-emerald-50';

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-2.5 min-w-[17rem] pl-2.5 pr-3 py-2.5 rounded-xl border text-sm font-medium shadow-sm transition ${trig}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-gradient text-midnight-900 shrink-0 shadow-glow-gold">
          <Compass size={14} />
        </span>
        <span className="flex-1 text-left truncate">{selected.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className={isDark ? 'text-white/60' : 'text-emerald-700/60'} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-50 mt-2 left-0 w-[21rem] max-w-[82vw] rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#0c1f16] border-white/12 shadow-black/50' : 'bg-white border-emerald-900/10 shadow-emerald-900/15'}`}
          >
            <div className={`px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? 'text-[#E9CF7A]/70' : 'text-emerald-600/70'}`}>
              Calculation method
            </div>
            <div className="max-h-72 overflow-y-auto pb-1.5">
              {items.map((m, i) => {
                const sel = m.id === value;
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    onClick={() => { onChange(m.id); setOpen(false); }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.14 }}
                    whileHover={{ x: 3 }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors
                      ${sel
                        ? (isDark ? 'bg-emerald-500/15 text-emerald-200 font-semibold' : 'bg-emerald-50 text-emerald-800 font-semibold')
                        : (isDark ? 'text-parchment/85 hover:bg-white/5' : 'text-ink hover:bg-emerald-50/60')}`}
                  >
                    <span className="flex items-center gap-2.5">
                      {m.id === -1 && <Sparkles size={13} className={sel ? 'text-emerald-500' : isDark ? 'text-gold-300' : 'text-gold-600'} />}
                      {m.label}
                    </span>
                    {sel && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                        <Check size={15} className="text-emerald-500 shrink-0" />
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PrayerTimesPage() {
  // --- sect / madhab (persisted) ---
  // The onboarding wizard may store isa:sect as a madhab name ('hanafi', 'shafii', …)
  // instead of 'sunni'/'shia'. We normalize on read so the page never crashes.
  const [rawSect, setRawSect] = useLocalStorage<string>('isa:sect', 'sunni');
  const [rawFiqh, setRawFiqh] = useLocalStorage<string>('isa:fiqh', 'hanafi');
  const [methodOverride, setMethodOverride] = useLocalStorage<number>('isa:method', -1);

  const { isDark } = useTheme();
  const sect: Sect = normalizeSect(rawSect);
  const fiqh: Fiqh = normalizeFiqh(rawFiqh);
  const setSect = (s: Sect) => setRawSect(s);
  const setFiqh = (f: Fiqh) => setRawFiqh(f);

  // --- map + mosques ---
  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [mapZoom, setMapZoom] = useState(13); // zoom floor for the next recenter
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loadingMosques, setLoadingMosques] = useState(false);
  const [mosqueErr, setMosqueErr] = useState<string | null>(null);
  const [selected, setSelected] = useLocalStorage<Mosque | null>('isa:mosque', null);

  // --- clicked pin (map click drops a pin and re-centres mosques) ---
  const [clickedPin, setClickedPin] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // --- update-location prompt shown after a map click ---
  type LocPrompt = { lat: number; lng: number; city: string; country: string; label: string };
  const [updateLocPrompt, setUpdateLocPrompt] = useState<LocPrompt | null>(null);
  const [savingLoc, setSavingLoc] = useState(false);

  // --- city search ---
  const [q, setQ] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // Reactive stored location — keeps hero and map in sync with the profile popup.
  const loc = useStoredLocation();

  const params = useMemo(() => {
    const base = defaultParams(fiqh);
    if (methodOverride >= 0) return { method: methodOverride, school: base.school };
    const countryMethod = methodByCountry(loc.country ?? '');
    return { method: countryMethod ?? base.method, school: base.school };
  }, [fiqh, methodOverride, loc.country]);

  // Label shown in the "Auto" dropdown item so the user sees which method their location resolves to.
  const autoMethodLabel = useMemo(() => {
    const m = methodByCountry(loc.country ?? '');
    if (m == null) return undefined;
    return METHOD_LABELS.find((l) => l.id === m)?.label;
  }, [loc.country]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialised = useRef(false);
  const locChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last known country so we can detect when it changes and reset the
  // method override to auto, ensuring the new country's convention is used.
  const lastCountryRef = useRef<string>(
    typeof window !== 'undefined' ? (readStoredLocation().country ?? '') : '',
  );

  const loadMosques = useCallback(async (lat: number, lng: number) => {
    setLoadingMosques(true);
    setMosqueErr(null);
    try {
      const list = await searchMosquesNear(lat, lng, 6000, 60);
      setMosques(list);
    } catch (e: any) {
      setMosqueErr(e?.message ?? 'Could not load mosques (Overpass busy) — try again.');
    } finally {
      setLoadingMosques(false);
    }
  }, []);

  // Re-centre the map whenever the user saves a new location in the profile popup.
  // We listen to StorageEvents (fired by persist()) rather than the reactive hook so
  // we never trigger on the initial hydration transition (default → actual values).
  useEffect(() => {
    const LOCATION_KEYS = new Set(['isa:city', 'isa:country', 'isa:lat', 'isa:lng', 'isa:coordsFor']);
    const handler = (e: StorageEvent) => {
      if (!LOCATION_KEYS.has(e.key ?? '')) return;
      // When the country changes, reset the method override to auto so the new
      // location's regional convention is used instead of the old one.
      if (e.key === 'isa:country') {
        try {
          const newCountry = e.newValue ? (JSON.parse(e.newValue) as string) : '';
          if (newCountry && newCountry !== lastCountryRef.current) {
            lastCountryRef.current = newCountry;
            setMethodOverride(-1);
          }
        } catch { /* ignore malformed value */ }
      }
      // Debounce: setLocationByCity calls persist() several times in a row.
      if (locChangeTimer.current) clearTimeout(locChangeTimer.current);
      locChangeTimer.current = setTimeout(() => {
        const newLoc = readStoredLocation();
        setSelected(null);
        setClickedPin(null);
        if (newLoc.hasCoords && newLoc.lat != null && newLoc.lng != null) {
          setCenter({ lat: newLoc.lat, lng: newLoc.lng });
          loadMosques(newLoc.lat, newLoc.lng);
        } else if (newLoc.city) {
          geocodePlace(`${newLoc.city}, ${newLoc.country}`, 1)
            .then((hits) => {
              if (hits[0]) {
                const c = { lat: hits[0].lat, lng: hits[0].lng };
                setCenter(c);
                loadMosques(c.lat, c.lng);
              }
            })
            .catch(() => {});
        }
      }, 200);
    };
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('storage', handler);
      if (locChangeTimer.current) clearTimeout(locChangeTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMosques]);

  // Initialise the map center ONCE on mount, from the best available source:
  //   1. Stored coordinates that belong to the chosen city (onboarding/profile)
  //   2. Stored city → geocode to coordinates
  //   3. Browser geolocation (GPS)   4. IP geolocation   5. Karachi fallback
  // We read localStorage synchronously here to avoid the hydration race where
  // the reactive hook still holds its defaults during the first render.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const init = async () => {
      const loc = readStoredLocation();

      // Heal: a mosque pinned by an older build could be left over from a
      // previous location. If the stored coords are stale (the user has since
      // changed their city), drop the stale pin so it can't override the center.
      if (loc.coordsAreStale) {
        clearPinnedMosque();
        setSelected(null);
      }

      // 1. Stored coordinates that match the chosen city
      if (loc.hasCoords && loc.lat != null && loc.lng != null) {
        const c = { lat: loc.lat, lng: loc.lng };
        setCenter(c);
        loadMosques(c.lat, c.lng);
        return;
      }

      // 2. Stored city — geocode it
      if (loc.city && loc.city !== 'Karachi') {
        try {
          const hits = await geocodePlace(`${loc.city}, ${loc.country}`, 1);
          if (hits[0]) {
            const c = { lat: hits[0].lat, lng: hits[0].lng };
            setCenter(c);
            loadMosques(c.lat, c.lng);
            return;
          }
        } catch { /* fall through */ }
      }

      // 3. Try browser geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 8000,
            }),
          );
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(c);
          loadMosques(c.lat, c.lng);
          return;
        } catch { /* fall through */ }
      }

      // 4. IP-based geolocation
      try {
        const ip = await detectLocationByIP();
        if (ip.lat && ip.lng) {
          const c = { lat: ip.lat, lng: ip.lng };
          setCenter(c);
          loadMosques(c.lat, c.lng);
          return;
        }
      } catch { /* fall through */ }

      // 5. Last resort — use fallback
      loadMosques(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reload when the map centre changes.
  const onMoveEnd = useCallback((c: { lat: number; lng: number }) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadMosques(c.lat, c.lng), 600);
  }, [loadMosques]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMosqueErr('This browser does not support geolocation.');
      return;
    }
    setMosqueErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        setMapZoom(15);              // pull the view in so the exact spot is clear
        setSelected(null);
        setClickedPin({ lat, lng, label: 'My location' });
        loadMosques(lat, lng);
        // Reverse-geocode the GPS point for city/country, then offer to save it
        // as the default — same "Update your location?" prompt as a map click.
        reverseGeocodeDetails(lat, lng)
          .then((detail) => {
            setClickedPin((prev) => prev?.lat === lat && prev?.lng === lng ? { lat, lng, label: detail.label } : prev);
            setUpdateLocPrompt({ lat, lng, ...detail });
          })
          .catch(() => {
            setUpdateLocPrompt({ lat, lng, label: 'My location', city: '', country: '' });
          });
      },
      (err) => setMosqueErr(err.message),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const doGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setGeocoding(true);
    setMosqueErr(null);
    try {
      const hits = await geocodePlace(q, 1);
      if (hits[0]) {
        const { lat, lng, label, name, city, country } = hits[0];
        // Trust the forward-geocode match for naming — the user searched for this
        // exact place. We deliberately do NOT reverse-geocode the centroid here.
        const placeCity = name || city || label.split(',')[0].trim();
        const placeCountry = country || label.split(',').slice(-1)[0].trim();
        const pinLabel = placeCity + (placeCountry ? `, ${placeCountry}` : '');
        setCenter({ lat, lng });
        setMapZoom(13);
        // Drop a pin at the geocoded location (same behaviour as a map click).
        setClickedPin({ lat, lng, label: pinLabel });
        setSelected(null);
        loadMosques(lat, lng);
        setUpdateLocPrompt({ lat, lng, label, city: placeCity, country: placeCountry });
      } else {
        setMosqueErr(`No place found for "${q}".`);
      }
    } catch (e: any) {
      setMosqueErr(e?.message ?? 'Search failed.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapClick = useCallback(async ({ lat, lng }: { lat: number; lng: number }) => {
    setCenter({ lat, lng });
    setMapZoom(13);
    setSelected(null);
    setClickedPin({ lat, lng, label: 'Selected location' });
    loadMosques(lat, lng);
    // Reverse-geocode to get a human-readable label, then show the update-location prompt.
    reverseGeocodeDetails(lat, lng).then((detail) => {
      setClickedPin((prev) => prev?.lat === lat && prev?.lng === lng ? { lat, lng, label: detail.label } : prev);
      setUpdateLocPrompt({ lat, lng, ...detail });
    }).catch(() => {/* keep default label */});
  }, [loadMosques, setSelected]);

  const fiqhOptions = FIQH_BY_SECT[sect];

  return (
    // Break out of the dashboard's main padding so the dark theme + photo header
    // fill the content area edge-to-edge, matching the reference design.
    <div className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}>

      {/* ── hero section: header + controls + countdown share the background ──
          NB: overflow-hidden lives on the decorative layer below (not this
          wrapper) so the Calculation-method dropdown can overflow the hero
          without being clipped. */}
      <div className="relative overflow-hidden">
        {/* full-cover background image — same as Overview hero */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Overview_Light_Theme_Updated background images first section.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        <div className="relative px-6 sm:px-10 pt-5 pb-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
              <Sparkles size={12} /> Prayer Times
            </span>
            <h1 className="mt-4 font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] whitespace-nowrap text-black"
              style={{ textShadow: '0 1px 8px rgba(255,255,255,0.7)' }}>
              Pick your mosque, anywhere on earth
            </h1>
            {/* subtitle — light glass panel matching Overview */}
            <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-base sm:text-lg leading-relaxed text-black/85">
                Find a masjid on the map; times are calculated for its exact location using your sect &amp; madhab.
              </p>
            </div>
          </div>

          {/* ayah — light glass card matching Overview hero exactly */}
          <div className="hidden md:block" style={{ maxWidth: '360px' }}>
            <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                    ٤٥
                  </span>
                  <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                    وَأَقِمِ الصَّلَاةَ ۖ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ
                  </p>
                </div>
                <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                  And establish prayer. Indeed, prayer prohibits immorality and wrong-doing.
                </p>
                <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-Ankabut (29:45)</p>
              </div>
            </div>
          </div>
        </div>
        {/* sect controls + countdown — inside hero so they sit over the background.
            z-20 keeps this region (and the open method dropdown) above the
            prayer-cards section that follows. */}
        <div className="relative z-20 px-6 sm:px-10 pb-8 space-y-5">

        {/* ── sect / madhab / method controls (light glass) ── */}
        <div className="relative z-10 rounded-2xl p-5 border border-white/60 bg-white/60 backdrop-blur-sm">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-base mb-2 uppercase tracking-[0.16em] font-bold text-black">Sect</p>
              <div className="flex gap-2">
                {(['sunni', 'shia'] as Sect[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSect(s); setFiqh(FIQH_BY_SECT[s][0]); setMethodOverride(-1); }}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition
                      ${sect === s ? 'border-emerald-400 bg-emerald-600 text-white shadow-glow-emerald' : 'border-emerald-900/15 bg-white/90 text-black hover:bg-white'}`}
                  >
                    {s === 'sunni' ? 'Sunni' : 'Fiqah Jafri'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-base mb-2 uppercase tracking-[0.16em] font-bold text-black">Madhab / Fiqh</p>
              <div className="flex flex-wrap gap-2">
                {fiqhOptions.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFiqh(f); setMethodOverride(-1); }}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition
                      ${fiqh === f ? 'border-emerald-400 bg-emerald-600 text-white shadow-glow-emerald' : 'border-emerald-900/15 bg-white/90 text-black hover:bg-white'}`}
                  >
                    {FIQH_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-base mb-2 uppercase tracking-[0.16em] font-bold text-black">Calculation method</p>
              <MethodDropdown value={methodOverride} onChange={setMethodOverride} options={METHOD_LABELS} isDark={isDark} locationLabel={autoMethodLabel} />
            </div>
          </div>
        </div>

        </div>{/* closes sect controls px wrapper */}
      </div>{/* closes hero section */}

      <div className="relative px-6 sm:px-10 pb-10 space-y-5">
        {/* Prayer countdown: outside hero so background image stays above */}
        <PrayerCountdownHero
          lat={selected?.lat ?? clickedPin?.lat ?? (loc.lat ?? undefined)}
          lng={selected?.lng ?? clickedPin?.lng ?? (loc.lng ?? undefined)}
          city={loc.city}
          country={loc.country}
          method={params.method}
          school={params.school}
          isDark={isDark}
          label={
            selected
              ? `${selected.name}${selected.city ? ', ' + selected.city : ''}`
              : clickedPin
                ? clickedPin.label
                : `${loc.city}, ${loc.country}`
          }
        />
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Map + search */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-4 space-y-3">
            <form onSubmit={doGeocode} className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-parchment/40' : 'text-neutral-400'}`} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search a city or area (e.g. London WC2N)…"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${isDark ? 'border border-white/10 bg-white/[0.06] text-parchment placeholder:text-parchment/40' : 'border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400'}`}
                />
              </div>
              <button
                type="submit"
                disabled={geocoding}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition"
              >
                {geocoding ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Go
              </button>
              <button
                type="button"
                onClick={useMyLocation}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${isDark ? 'border border-white/15 bg-white/[0.06] text-parchment/85 hover:bg-white/10' : 'border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'}`}
                title="Use my location"
              >
                <LocateFixed size={16} className={isDark ? 'text-gold-300' : 'text-emerald-600'} /> My Location
              </button>
            </form>

            <MosqueMap
              center={center}
              zoom={mapZoom}
              mosques={mosques}
              selectedId={selected?.id ?? null}
              clickPin={clickedPin}
              userLocation={loc.hasCoords && loc.lat != null && loc.lng != null ? { lat: loc.lat, lng: loc.lng } : null}
              onMoveEnd={onMoveEnd}
              onSelectMosque={(m) => { setSelected(m); setClickedPin(null); }}
              onMapClick={handleMapClick}
            />

            <p className="text-xs text-parchment/50 flex items-center gap-1.5">
              <Navigation size={12} /> Click anywhere on the map to find mosques at that location. Pan or zoom to explore. Data © OpenStreetMap.
            </p>
          </div>

          {/* Nearby mosque list — the masjid-e-nabwi sits behind it (bottom-right).
              `isolate` makes this card its own stacking context so the -z-10
              image stays above the card background but below the list content. */}
          <div className="relative isolate rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden lg:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masjid-e-nabwi.png" alt="" aria-hidden
              className="pointer-events-none select-none absolute right-0 bottom-0 -z-10 w-[200px] opacity-90" />
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-parchment"><Building2 size={16} className="text-gold-300" /> Nearby Mosques</h3>
              {loadingMosques && <Loader2 size={16} className="animate-spin text-gold-300" />}
            </div>

            {mosqueErr && (
              <div className={`px-4 py-3 text-sm border-b ${isDark ? 'text-rose-200 bg-rose-500/15 border-rose-500/20' : 'text-rose-800 bg-rose-100 border-rose-200'}`}>{mosqueErr}</div>
            )}

            <ul className="max-h-[440px] overflow-y-auto divide-y divide-white/5">
              {mosques.length === 0 && !loadingMosques && (
                <li className="p-4 text-sm text-parchment/55">No mosques found in this area. Try zooming out or searching another place.</li>
              )}
              {mosques.map((m) => {
                const active = m.id === selected?.id;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => { setSelected(m); setCenter({ lat: m.lat, lng: m.lng }); }}
                      className={`w-full text-left p-4 flex items-start gap-3 transition hover:bg-white/5 ${active ? 'bg-white/[0.07]' : ''}`}
                    >
                      <span className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                        ${active ? 'bg-gold-gradient text-midnight-900' : 'bg-emerald-600/25 text-gold-300 border border-white/10'}`}>
                        <Building2 size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-parchment">{m.name}</p>
                        <p className="text-xs text-parchment/55 truncate">
                          {m.city ? m.city + ' · ' : ''}{m.distanceKm != null ? `${m.distanceKm.toFixed(1)} km away` : ''}
                        </p>
                      </span>
                      <ChevronRight size={16} className="text-parchment/40 shrink-0 self-center" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ── bottom feature strip (dark translucent glass, central ornament) ── */}
      <div style={{ background: isDark ? 'rgba(8,22,15,0.82)' : 'rgba(10,30,20,0.66)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderTop: '1px solid rgba(233,207,122,0.18)' }}>
        <div className="px-6 sm:px-10 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {FEATURE_STRIP.slice(0, 2).map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(233,207,122,0.12)] border border-[rgba(233,207,122,0.3)] text-[#E9CF7A] shrink-0 animate-pulse-soft">
                <f.icon size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-white/55">{f.sub}</p>
              </div>
            </div>
          ))}

          {/* central ornament (slow continuous spin) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prayer/star-ornament.svg" alt="" aria-hidden className="w-14 h-14 shrink-0 animate-spin-slow" />

          {FEATURE_STRIP.slice(2).map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(233,207,122,0.12)] border border-[rgba(233,207,122,0.3)] text-[#E9CF7A] shrink-0 animate-pulse-soft">
                <f.icon size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-white/55">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Update-location prompt (shown after a map click / search / My Location) ── */}
      <AnimatePresence>
        {updateLocPrompt && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setUpdateLocPrompt(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-ink"
            >
              {/* header */}
              <div className="bg-mosque-gradient text-parchment px-7 py-6 relative overflow-hidden">
                <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-bold flex items-center gap-2">
                      <MapPin size={20} className="text-gold-300" /> Update your location?
                    </h3>
                    <p className="text-emerald-100/75 text-[15px] mt-1.5">
                      Save this spot as your default prayer location
                    </p>
                  </div>
                  <button
                    onClick={() => setUpdateLocPrompt(null)}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* body */}
              <div className="px-7 py-6 space-y-4">
                <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5">
                  <p className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-2.5">Selected on map</p>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={19} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[20px] font-extrabold text-emerald-900 leading-tight">
                        {updateLocPrompt.city || updateLocPrompt.label.split(',')[0]}
                      </p>
                      {updateLocPrompt.country && (
                        <p className="text-[15px] font-semibold text-emerald-700 mt-0.5">{updateLocPrompt.country}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2.5">Your saved location</p>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={19} className="text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[20px] font-extrabold text-gray-900 leading-tight">{loc.city}</p>
                      <p className="text-[15px] font-semibold text-gray-600 mt-0.5">{loc.country}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setUpdateLocPrompt(null)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-800 text-[15px] font-bold hover:bg-gray-100 hover:border-gray-400 transition"
                  >
                    Just previewing
                  </button>
                  <button
                    disabled={savingLoc}
                    onClick={async () => {
                      setSavingLoc(true);
                      const p = updateLocPrompt;
                      setUpdateLocPrompt(null);
                      const city    = p.city    || p.label.split(',')[0].trim();
                      const country = p.country || p.label.split(',').slice(-1)[0].trim();
                      setLocationByCoords(p.lat, p.lng, city, country, { clearMosque: true });
                      setSavingLoc(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[15px] font-bold hover:bg-emerald-700 disabled:opacity-60 transition flex items-center justify-center gap-1.5"
                  >
                    {savingLoc ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Set as my location
                  </button>
                </div>

                <p className="text-center text-[13px] text-gray-500 font-semibold pt-1">
                  Prayer times on this page will continue to use the map selection either way
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
