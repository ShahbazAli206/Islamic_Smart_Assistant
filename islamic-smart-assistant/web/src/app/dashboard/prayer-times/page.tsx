'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Search, LocateFixed, Loader2, Building2, Navigation } from 'lucide-react';
import { PrayerCountdownHero } from '@/components/PrayerCountdown';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { searchMosquesNear, type Mosque } from '@/lib/overpass';
import { geocodePlace, reverseGeocode } from '@/lib/geo';
import { detectLocationByIP } from '@/lib/prayer';
import { readStoredLocation, clearPinnedMosque } from '@/lib/location';
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
        const c = { lat: hits[0].lat, lng: hits[0].lng };
        setCenter(c);
        setClickedPin(null);
        loadMosques(c.lat, c.lng);
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
    // Reverse-geocode in background to get a human-readable label.
    reverseGeocode(lat, lng).then((label) => {
      setClickedPin((prev) => prev?.lat === lat && prev?.lng === lng ? { lat, lng, label } : prev);
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
              <LocateFixed size={16} /> Near me
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
