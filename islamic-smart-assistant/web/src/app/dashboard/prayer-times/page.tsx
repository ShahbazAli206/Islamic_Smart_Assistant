'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Search, LocateFixed, Loader2, Building2, Navigation, X, Check } from 'lucide-react';
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
  loading: () => <div className="w-full h-[420px] rounded-2xl bg-emerald-50 animate-pulse" />,
});

const FALLBACK_CENTER = { lat: 24.8607, lng: 67.0011 }; // Karachi — last resort only

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
      //
      // Two-pronged fix for a useLocalStorage hydration race:
      //   1. clearPinnedMosque() removes the key from localStorage AND dispatches
      //      a StorageEvent so the hook's same-tab listener calls setValue(null).
      //      This fires AFTER the hook's read-effect has already scheduled a
      //      re-render with the stale mosque — the StorageEvent fires later during
      //      that same effect flush and its setValue(null) wins as the last update.
      //   2. setSelected(null) also directly sets React state for the common case
      //      where nothing was pinned (so the re-render is cheap).
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
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        setClickedPin(null);
        loadMosques(c.lat, c.lng);
      },
      (err) => setMosqueErr(err.message),
      { enableHighAccuracy: true, timeout: 8000 },
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
        const { lat, lng, label } = hits[0];
        setCenter({ lat, lng });
        // Drop a pin at the geocoded location (same behaviour as a map click).
        setClickedPin({ lat, lng, label });
        setSelected(null);
        loadMosques(lat, lng);
        // Reverse-geocode for city/country, then show the update-location prompt.
        reverseGeocodeDetails(lat, lng).then((detail) => {
          setClickedPin((prev) =>
            prev?.lat === lat && prev?.lng === lng ? { lat, lng, label: detail.label } : prev,
          );
          setUpdateLocPrompt({ lat, lng, ...detail });
        }).catch(() => {
          // Fallback: parse Nominatim display_name for city/country
          const parts = label.split(',').map((s) => s.trim());
          setUpdateLocPrompt({ lat, lng, label, city: parts[0] ?? q.trim(), country: parts[parts.length - 1] ?? '' });
        });
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
    <div className="space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12}/> Prayer Times</p>
        <h1 className="h-display text-4xl font-bold">Pick your mosque, anywhere on earth</h1>
        <p className="text-ink/60 mt-1">
          Find a masjid on the map; times are calculated for its exact location using your sect &amp; madhab.
        </p>
      </div>

      {/* Sect / madhab selector */}
      <div className="card card-pad space-y-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="text-xs text-ink/55 mb-1.5 uppercase tracking-wide">Sect</p>
            <div className="flex gap-2">
              {(['sunni', 'shia'] as Sect[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSect(s); setFiqh(FIQH_BY_SECT[s][0]); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition capitalize
                    ${sect === s ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-emerald-100 bg-white hover:border-emerald-300'}`}
                >
                  {s === 'sunni' ? 'Sunni' : 'Shia'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-ink/55 mb-1.5 uppercase tracking-wide">Madhab / Fiqh</p>
            <div className="flex flex-wrap gap-2">
              {fiqhOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiqh(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition
                    ${fiqh === f ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-emerald-100 bg-white hover:border-emerald-300'}`}
                >
                  {FIQH_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-ink/55 mb-1.5 uppercase tracking-wide">Calculation method</p>
            <select
              value={methodOverride}
              onChange={(e) => setMethodOverride(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-emerald-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value={-1}>Auto (by madhab)</option>
              {METHOD_LABELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
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
        <div className="card card-pad lg:col-span-2 space-y-3">
          <form onSubmit={doGeocode} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a city or area (e.g. London WC2N)…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <button type="submit" disabled={geocoding} className="btn-primary text-sm px-4">
              {geocoding ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Go
            </button>
            <button type="button" onClick={useMyLocation} className="btn-ghost text-sm px-4" title="Use my location">
              <LocateFixed size={16} /> My Location
            </button>
          </form>

          <MosqueMap
            center={center}
            mosques={mosques}
            selectedId={selected?.id ?? null}
            clickPin={clickedPin}
            onMoveEnd={onMoveEnd}
            onSelectMosque={(m) => { setSelected(m); setClickedPin(null); }}
            onMapClick={handleMapClick}
          />

          <p className="text-xs text-ink/50 flex items-center gap-1.5">
            <Navigation size={12}/> Click anywhere on the map to find mosques at that location. Pan or zoom to explore. Data © OpenStreetMap.
          </p>
        </div>

        {/* ── Update-location prompt ── */}
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
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* header */}
                <div className="bg-mosque-gradient text-parchment px-6 py-5 relative overflow-hidden">
                  <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold flex items-center gap-2">
                        <MapPin size={18} className="text-gold-300" /> Update your location?
                      </h3>
                      <p className="text-emerald-100/75 text-sm mt-1">
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
                <div className="px-6 py-5 space-y-3">
                  {/* Selected location */}
                  <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4">
                    <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-widest mb-2">Selected on map</p>
                    <div className="flex items-start gap-2">
                      <MapPin size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[17px] font-extrabold text-emerald-900 leading-tight">
                          {updateLocPrompt.city || updateLocPrompt.label.split(',')[0]}
                        </p>
                        {updateLocPrompt.country && (
                          <p className="text-sm font-semibold text-emerald-700 mt-0.5">{updateLocPrompt.country}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Current saved location */}
                  <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                    <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Your saved location</p>
                    <div className="flex items-start gap-2">
                      <MapPin size={17} className="text-gray-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[17px] font-extrabold text-gray-900 leading-tight">{loc.city}</p>
                        <p className="text-sm font-semibold text-gray-600 mt-0.5">{loc.country}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {/* Dismisses popup — keeps saved location unchanged; map selection
                        remains active on this page for checking times only */}
                    <button
                      onClick={() => setUpdateLocPrompt(null)}
                      className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-gray-800 text-sm font-bold hover:bg-gray-100 hover:border-gray-400 transition"
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
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition flex items-center justify-center gap-1.5"
                    >
                      {savingLoc ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Set as my location
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-500 font-semibold pt-1">
                    Prayer times on this page will continue to use the map selection either way
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Nearby mosque list */}
        <div className="card overflow-hidden lg:col-span-1">
          <div className="p-4 border-b border-emerald-900/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Building2 size={16} className="text-emerald-700"/> Nearby mosques</h3>
            {loadingMosques && <Loader2 size={16} className="animate-spin text-emerald-600" />}
          </div>

          {mosqueErr && (
            <div className="px-4 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">{mosqueErr}</div>
          )}

          <ul className="max-h-[440px] overflow-y-auto divide-y divide-emerald-900/5">
            {mosques.length === 0 && !loadingMosques && (
              <li className="p-4 text-sm text-ink/55">No mosques found in this area. Try zooming out or searching another place.</li>
            )}
            {mosques.map((m, i) => {
              const active = m.id === selected?.id;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => { setSelected(m); setCenter({ lat: m.lat, lng: m.lng }); }}
                    className={`w-full text-left p-4 flex items-start gap-3 transition hover:bg-emerald-50/60 ${active ? 'bg-emerald-50/80' : ''}`}
                  >
                    <span className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                      ${active ? 'bg-gold-gradient text-midnight-900' : 'bg-emerald-100 text-emerald-800'}`}>
                      <MapPin size={15}/>
                    </span>
                    <span className="min-w-0">
                      <p className="font-semibold truncate">{m.name}</p>
                      <p className="text-xs text-ink/55 truncate">
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
  );
}
