'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, MapPin, Search, LocateFixed, Loader2, Building2, Navigation, X, Check,
  ChevronDown, Clock, BookOpen, Compass, Bell,
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
  type Sect, type Fiqh,
} from '@/lib/sect';

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

export default function PrayerTimesPage() {
  // --- sect / madhab (persisted) ---
  // The onboarding wizard may store isa:sect as a madhab name ('hanafi', 'shafii', …)
  // instead of 'sunni'/'shia'. We normalize on read so the page never crashes.
  const [rawSect, setRawSect] = useLocalStorage<string>('isa:sect', 'sunni');
  const [rawFiqh, setRawFiqh] = useLocalStorage<string>('isa:fiqh', 'hanafi');
  const [methodOverride, setMethodOverride] = useLocalStorage<number>('isa:method', -1);

  const sect: Sect = normalizeSect(rawSect);
  const fiqh: Fiqh = normalizeFiqh(rawFiqh);
  const setSect = (s: Sect) => setRawSect(s);
  const setFiqh = (f: Fiqh) => setRawFiqh(f);

  const params = useMemo(() => {
    const base = defaultParams(fiqh);
    return { method: methodOverride >= 0 ? methodOverride : base.method, school: base.school };
  }, [fiqh, methodOverride]);

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

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialised = useRef(false);
  const locChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="-m-5 sm:-m-8 min-h-full text-parchment"
      style={{ background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' }}>

      {/* ── header banner: mosque photo + title + ayah ── */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0">
          <img src="/backgound-image2.png" alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(8,22,15,0.95) 0%, rgba(8,22,15,0.74) 40%, rgba(8,22,15,0.5) 64%, rgba(8,22,15,0.88) 100%)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08160F]" />
          <div className="absolute inset-0 pattern-bg opacity-[0.05]" />
        </div>

        <div className="relative px-6 sm:px-10 pt-8 pb-7 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur">
              <Sparkles size={12} /> Prayer Times
            </span>
            <h1 className="mt-4 font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-[1.05] text-parchment">
              Pick your mosque, anywhere on earth
            </h1>
            <p className="mt-3 text-parchment/70 max-w-md leading-relaxed">
              Find a masjid on the map; times are calculated for its exact location using your sect &amp; madhab.
            </p>
          </div>

          <div className="hidden md:block max-w-sm text-right">
            <p className="font-arabic text-2xl lg:text-3xl text-gold-200 leading-[1.9]" dir="rtl">
              وَأَقِمِ الصَّلَاةَ ۖ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ
            </p>
            <p className="mt-2 text-sm text-parchment/70 leading-relaxed">
              And establish prayer. Indeed, prayer prohibits immorality and wrong doing.
            </p>
            <p className="mt-1.5 text-xs font-semibold text-gold-300/80">Surah Al-Ankabut (29:45)</p>
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-10 pb-10 space-y-5">

        {/* ── sect / madhab / method controls ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[10px] text-gold-200/60 mb-2 uppercase tracking-[0.16em] font-semibold">Sect</p>
              <div className="flex gap-2">
                {(['sunni', 'shia'] as Sect[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSect(s); setFiqh(FIQH_BY_SECT[s][0]); }}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition
                      ${sect === s ? 'border-emerald-400 bg-emerald-600 text-white shadow-glow-emerald' : 'border-white/10 bg-white/[0.04] text-parchment/75 hover:bg-white/10'}`}
                  >
                    {s === 'sunni' ? 'Sunni' : 'Shia'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gold-200/60 mb-2 uppercase tracking-[0.16em] font-semibold">Madhab / Fiqh</p>
              <div className="flex flex-wrap gap-2">
                {fiqhOptions.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiqh(f)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition
                      ${fiqh === f ? 'border-emerald-400 bg-emerald-600 text-white shadow-glow-emerald' : 'border-white/10 bg-white/[0.04] text-parchment/75 hover:bg-white/10'}`}
                  >
                    {FIQH_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gold-200/60 mb-2 uppercase tracking-[0.16em] font-semibold">Calculation method</p>
              <div className="relative">
                <select
                  value={methodOverride}
                  onChange={(e) => setMethodOverride(Number(e.target.value))}
                  className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-parchment focus:outline-none focus:ring-2 focus:ring-emerald-400/50 min-w-[16rem]"
                >
                  <option value={-1} className="bg-midnight-900 text-parchment">Auto (by madhab)</option>
                  {METHOD_LABELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-midnight-900 text-parchment">{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/50 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero countdown: selected mosque → clicked pin → user's stored location */}
        <PrayerCountdownHero
          lat={selected?.lat ?? clickedPin?.lat ?? (loc.lat ?? undefined)}
          lng={selected?.lng ?? clickedPin?.lng ?? (loc.lng ?? undefined)}
          city={loc.city}
          country={loc.country}
          method={params.method}
          school={params.school}
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
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search a city or area (e.g. London WC2N)…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] text-parchment placeholder:text-parchment/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
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
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-parchment/85 hover:bg-white/10 transition"
                title="Use my location"
              >
                <LocateFixed size={16} className="text-gold-300" /> My Location
              </button>
            </form>

            <MosqueMap
              center={center}
              zoom={mapZoom}
              mosques={mosques}
              selectedId={selected?.id ?? null}
              clickPin={clickedPin}
              onMoveEnd={onMoveEnd}
              onSelectMosque={(m) => { setSelected(m); setClickedPin(null); }}
              onMapClick={handleMapClick}
            />

            <p className="text-xs text-parchment/50 flex items-center gap-1.5">
              <Navigation size={12} /> Click anywhere on the map to find mosques at that location. Pan or zoom to explore. Data © OpenStreetMap.
            </p>
          </div>

          {/* Nearby mosque list */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur overflow-hidden lg:col-span-1">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-parchment"><Building2 size={16} className="text-gold-300" /> Nearby Mosques</h3>
              {loadingMosques && <Loader2 size={16} className="animate-spin text-gold-300" />}
            </div>

            {mosqueErr && (
              <div className="px-4 py-3 text-sm text-rose-200 bg-rose-500/15 border-b border-rose-500/20">{mosqueErr}</div>
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
                      <span className="min-w-0">
                        <p className="font-semibold truncate text-parchment">{m.name}</p>
                        <p className="text-xs text-parchment/55 truncate">
                          {m.city ? m.city + ' · ' : ''}{m.distanceKm != null ? `${m.distanceKm.toFixed(1)} km away` : ''}
                        </p>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ── bottom feature strip ── */}
      <div className="bg-parchment text-ink">
        <div className="px-6 sm:px-10 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {FEATURE_STRIP.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold-50 border border-gold-200 text-gold-700 shrink-0">
                <f.icon size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-ink">{f.title}</p>
                <p className="text-xs text-ink/55">{f.sub}</p>
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
