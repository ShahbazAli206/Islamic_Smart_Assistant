'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sunrise, Sun, Sunset, Moon, Star, Compass, AlertTriangle, Navigation, X, Loader2 } from 'lucide-react';
import {
  fetchTimingsByCity, fetchTimingsByCoords, detectLocationByIP, nextPrayerInZone, formatCountdown,
  LocationError, type PrayerTimes,
} from '@/lib/prayer';
import { setLocationByCity, setLocationByCoords } from '@/lib/location';

function to12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

const ICONS: Record<keyof PrayerTimes, any> = {
  Fajr: Star, Sunrise: Sunrise, Dhuhr: Sun, Asr: Compass, Maghrib: Sunset, Isha: Moon,
};

const URDU: Record<keyof PrayerTimes, string> = {
  Fajr: 'فجر', Sunrise: 'طلوع', Dhuhr: 'ظهر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء',
};

type HeroProps = {
  city?: string;
  country?: string;
  // Coordinate mode (e.g. a selected mosque). When lat/lng are set, these win.
  lat?: number;
  lng?: number;
  method?: number;
  school?: 0 | 1;
  label?: string; // "Name, City" shown when in coordinate mode
};

export function PrayerCountdownHero({
  city = 'Karachi',
  country = 'Pakistan',
  lat,
  lng,
  method = 3,
  school = 0,
  label,
}: HeroProps) {
  const queryClient = useQueryClient();
  const byCoords = typeof lat === 'number' && typeof lng === 'number';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: byCoords ? ['timings', 'coords', lat, lng, method, school] : ['timings', 'city', city, country],
    queryFn: () =>
      byCoords
        ? fetchTimingsByCoords(lat!, lng!, { method, school, label })
        : fetchTimingsByCity(city, country),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => {
      if (err instanceof LocationError) return false;
      return failureCount < 2;
    },
  });

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(
    () => (data ? nextPrayerInZone(data.timings, data.timezone, now) : null),
    [data, now],
  );

  // ── Location error popup state ──
  const [showLocPopup, setShowLocPopup] = useState(false);
  const [ipLoading, setIpLoading] = useState(false);
  const [popupCity, setPopupCity] = useState('');
  const [popupCountry, setPopupCountry] = useState('');
  const [popupError, setPopupError] = useState('');
  // Exact coords from a detect button in the popup; cleared when the user edits
  // the city/country by hand so "Update location" knows to geocode instead.
  const [popupLat, setPopupLat] = useState<number | null>(null);
  const [popupLng, setPopupLng] = useState<number | null>(null);

  // Show popup automatically when there's a location error
  useEffect(() => {
    if (isError && error instanceof LocationError) {
      setShowLocPopup(true);
      setPopupCity('');
      setPopupCountry('');
      setPopupError('');
      setPopupLat(null);
      setPopupLng(null);
    }
  }, [isError, error]);

  const applyNewLocation = useCallback(async (newCity: string, newCountry: string) => {
    const safeCity = newCity.trim();
    const safeCountry = newCountry.trim();
    if (!safeCity || !safeCountry) {
      setPopupError('Please enter both city and country.');
      return;
    }
    setIpLoading(true);
    setPopupError('');
    // Commit through the centralized writer so coords, labels and the pinned
    // mosque all stay in sync (and listeners get a StorageEvent).
    try {
      if (popupLat != null && popupLng != null) {
        // Exact coords from a detect button → keep that precision.
        setLocationByCoords(popupLat, popupLng, safeCity, safeCountry, { clearMosque: true });
      } else {
        // Manually typed city → geocode to coordinates (falls back to city-only).
        await setLocationByCity(safeCity, safeCountry);
      }
    } catch { /* helpers already degrade gracefully */ }
    setIpLoading(false);
    queryClient.invalidateQueries({ queryKey: ['timings'] });
    setShowLocPopup(false);
  }, [queryClient, popupLat, popupLng]);

  const detectByIP = useCallback(async () => {
    setIpLoading(true);
    setPopupError('');
    try {
      const loc = await detectLocationByIP();
      if (loc.city && loc.country) {
        setPopupCity(loc.city);
        setPopupCountry(loc.country);
        // Stage the coords; they're committed (with a StorageEvent) on "Update location".
        if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          setPopupLat(loc.lat);
          setPopupLng(loc.lng);
        }
      } else {
        setPopupError('Could not detect your city. Please type it manually.');
      }
    } catch {
      setPopupError('IP detection failed. Please type your city and country below.');
    } finally {
      setIpLoading(false);
    }
  }, []);

  const detectByBrowser = useCallback(() => {
    if (!navigator.geolocation) {
      setPopupError('Geolocation is not supported by your browser.');
      return;
    }
    setIpLoading(true);
    setPopupError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
            { headers: { 'User-Agent': 'NoorIslamicApp/1.0' } },
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const detectedCity = addr.city || addr.town || addr.village || addr.county || addr.state || '';
          const detectedCountry = addr.country || '';
          setPopupCity(detectedCity);
          setPopupCountry(detectedCountry);
          // Stage the coords; committed (with a StorageEvent) on "Update location".
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setPopupLat(lat);
            setPopupLng(lng);
          }
        } catch {
          setPopupError('Location detected but city lookup failed. Please type your city below.');
        } finally {
          setIpLoading(false);
        }
      },
      () => {
        setIpLoading(false);
        setPopupError('Permission denied. Try "Detect by IP" or type your city manually.');
      },
      { timeout: 10_000 },
    );
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-mosque-gradient text-parchment p-8 shadow-glow-emerald"
      >
        {/* decorative pattern + glow */}
        <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-glow-emerald pointer-events-none" />

        <div className="relative grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-100/80 text-sm">
              <MapPin size={16} /> {label ?? `${city}, ${country}`}
            </div>
            <p className="text-gold-300 text-sm tracking-widest uppercase">{data?.hijriDate ?? '—'}</p>

            {isError ? (
              <>
                <h2 className="text-2xl md:text-3xl font-display font-semibold leading-tight">
                  Location not found
                </h2>
                <p className="text-emerald-100/80 text-sm max-w-md">
                  We couldn&apos;t load prayer times for &ldquo;{city}, {country}&rdquo;. Please update your location.
                </p>
                <button
                  onClick={() => setShowLocPopup(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-300 text-midnight-900 font-semibold text-sm hover:bg-gold-400 transition"
                >
                  <MapPin size={16} /> Fix location
                </button>
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-display font-semibold leading-tight">
                  {next ? `${next.name} in` : 'Loading prayer times…'}
                </h2>
                <p className="text-6xl md:text-7xl font-display font-bold text-gold-300 tabular-nums">
                  {next ? formatCountdown(next.inMs) : '--:--:--'}
                </p>
                <p className="text-emerald-100/80">
                  {next ? `at ${next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {data &&
              (Object.keys(data.timings) as (keyof PrayerTimes)[]).map((name, i) => {
                const Icon = ICONS[name];
                const isNext = next?.name === name;
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i, duration: 0.4 }}
                    className={`rounded-2xl p-4 border ${
                      isNext
                        ? 'bg-gold-gradient text-midnight-900 border-gold-300 shadow-glow-gold'
                        : 'bg-white/10 border-white/15 backdrop-blur'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon size={18} className={isNext ? 'text-midnight-900' : 'text-gold-300'} />
                      <span className="font-arabic text-lg">{URDU[name]}</span>
                    </div>
                    <p className={`mt-2 text-sm font-medium ${isNext ? 'text-midnight-900/80' : 'text-emerald-100/80'}`}>{name}</p>
                    <p className={`text-xl font-bold tabular-nums ${isNext ? '' : 'text-white'}`}>
                      {to12h(data.timings[name])}
                    </p>
                  </motion.div>
                );
              })}
            {(isLoading || isError) &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`rounded-2xl p-4 border border-white/10 h-24 ${isError ? 'bg-white/5' : 'bg-white/5 animate-pulse'}`} />
              ))}
          </div>
        </div>
      </motion.div>

      {/* ── Location fix popup ── */}
      <AnimatePresence>
        {showLocPopup && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowLocPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-mosque-gradient text-parchment px-6 py-5 relative overflow-hidden">
                <div className="absolute inset-0 pattern-bg opacity-30 pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <AlertTriangle size={18} className="text-gold-300" /> Update your location
                    </h3>
                    <p className="text-emerald-100/75 text-sm mt-1">
                      Prayer times could not be loaded for &ldquo;{city}, {country}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLocPopup(false)}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={detectByBrowser}
                    disabled={ipLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:border-emerald-400 disabled:opacity-60 transition"
                  >
                    {ipLoading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                    Use GPS
                  </button>
                  <button
                    onClick={detectByIP}
                    disabled={ipLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:border-emerald-400 disabled:opacity-60 transition"
                  >
                    {ipLoading ? <Loader2 size={15} className="animate-spin" /> : <Compass size={15} />}
                    Detect by IP
                  </button>
                </div>

                {popupError && (
                  <p className="text-xs text-rose-600 leading-relaxed">{popupError}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-black/30">
                  <div className="flex-1 border-t border-black/10" />
                  <span>or type manually</span>
                  <div className="flex-1 border-t border-black/10" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-black/55 mb-1 block">City</label>
                    <input
                      value={popupCity}
                      onChange={(e) => { setPopupCity(e.target.value); setPopupLat(null); setPopupLng(null); }}
                      placeholder="e.g. Toronto"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-black/55 mb-1 block">Country</label>
                    <input
                      value={popupCountry}
                      onChange={(e) => { setPopupCountry(e.target.value); setPopupLat(null); setPopupLng(null); }}
                      placeholder="e.g. Canada"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={() => applyNewLocation(popupCity, popupCountry)}
                  disabled={!popupCity.trim() || !popupCountry.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Update location
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
