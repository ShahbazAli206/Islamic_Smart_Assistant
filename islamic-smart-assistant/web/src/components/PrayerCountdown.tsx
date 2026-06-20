'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sunrise, Sun, Sunset, Moon, Star, Compass, AlertTriangle, Navigation, X, Loader2, Clock } from 'lucide-react';
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

/** Ornate Mughal mihrab arch (matches the landing page) — gold, layered, with a finial. */
function MihrabArch({ isDark, className = '' }: { isDark: boolean; className?: string }) {
  const op = isDark ? 0.6 : 0.75;
  return (
    <svg viewBox="0 0 280 380" fill="none" aria-hidden className={className} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="pcMihrabGlow" cx="50%" cy="40%" r="62%">
          <stop offset="0%"  stopColor="#E9CF7A" stopOpacity={isDark ? 0.22 : 0.16} />
          <stop offset="45%" stopColor="#C9A227" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0B1D14" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pcMihrabStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#F6D67A" />
          <stop offset="55%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#8A6B16" />
        </linearGradient>
      </defs>
      <path d="M30 380V176C30 96 64 44 140 22 216 44 250 96 250 176V380Z" fill="url(#pcMihrabGlow)" />
      <path d="M22 380V178
               C22 150 26 128 36 110
               Q44 122 56 116 Q50 100 62 92
               Q72 104 84 96  Q80 78 94 72
               Q104 84 116 74 Q116 56 132 52
               L140 40 L148 52 Q164 56 164 74
               Q176 84 186 72 Q200 78 196 96
               Q208 104 218 92 Q230 100 224 116
               Q236 122 244 110 C254 128 258 150 258 178 V380"
            stroke="url(#pcMihrabStroke)" strokeOpacity={op} strokeWidth="2.2"
            strokeLinejoin="round" fill="none" />
      <path d="M48 380V190C48 116 80 74 140 56 200 74 232 116 232 190V380"
        stroke="#E9CF7A" strokeOpacity={isDark ? 0.3 : 0.42} strokeWidth="1.5" fill="none" />
      <path d="M72 380V202C72 138 102 100 140 86 178 100 208 138 208 202V380"
        stroke="#E9CF7A" strokeOpacity={isDark ? 0.16 : 0.28} strokeWidth="1" fill="none" />
      <path d="M140 40C140 28 134 24 134 16 134 9 140 2 140 2 140 2 146 9 146 16 146 24 140 28 140 40Z"
        fill="url(#pcMihrabStroke)" fillOpacity={op} />
      <circle cx="140" cy="20" r="11" stroke="#E9CF7A" strokeOpacity={op} strokeWidth="1.5" fill="none" />
      <circle cx="140" cy="20" r="5.5" fill="#E9CF7A" fillOpacity="0.5" />
      <circle cx="140" cy="20" r="2.2" fill="#F6D67A" fillOpacity="0.95" />
    </svg>
  );
}

/** Faint dome watermark for a prayer card corner. */
function DomeMark({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
      <path d="M9 38 L9 22 Q9 6 30 4 Q51 6 51 22 L51 38" />
      <line x1="30" y1="4" x2="30" y2="-2" />
      <path d="M16 38 L16 26 M44 38 L44 26" opacity="0.6" />
    </svg>
  );
}

type HeroProps = {
  city?: string;
  country?: string;
  // Coordinate mode (e.g. a selected mosque). When lat/lng are set, these win.
  lat?: number;
  lng?: number;
  method?: number;
  school?: 0 | 1;
  label?: string; // "Name, City" shown when in coordinate mode
  isDark?: boolean;
};

export function PrayerCountdownHero({
  city = 'Karachi',
  country = 'Pakistan',
  lat,
  lng,
  method = 3,
  school = 0,
  label,
  isDark = false,
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
      <div className="grid lg:grid-cols-[minmax(0,540px)_1fr] gap-4 sm:gap-5 items-stretch">

        {/* ── Countdown card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 ${isDark ? 'border border-gold-400/20 text-parchment shadow-glow-emerald' : 'border border-gold-300/40 text-ink shadow-xl shadow-emerald-950/10'}`}
          style={{ background: isDark
            ? 'linear-gradient(140deg,#0f4030 0%,#0a2c20 52%,#07190f 100%)'
            : 'linear-gradient(140deg,#fffdf7 0%,#fbf6e9 58%,#f3ebd4 100%)' }}
        >
          <div aria-hidden className="absolute inset-0 pattern-bg opacity-[0.06] pointer-events-none" />
          {isDark && <div aria-hidden className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-glow-emerald animate-aurora pointer-events-none" />}
          <MihrabArch isDark={isDark} className="absolute right-1 bottom-0 h-[98%] w-auto pointer-events-none" />

          {/* hanging lantern (continuous float + glow) */}
          <div aria-hidden className="absolute left-4 top-3 pointer-events-none">
            <span className="absolute left-1/2 top-10 -translate-x-1/2 w-12 h-12 rounded-full animate-pulse-soft" style={{ background: 'radial-gradient(circle, rgba(221,185,75,0.45) 0%, transparent 70%)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/recitation/lantern.svg" alt="" className="relative w-12 animate-float" />
          </div>

          <div className="relative pl-16 sm:pl-20 sm:max-w-[64%]">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-emerald-100/85' : 'text-emerald-700'}`}>
              <MapPin size={16} className="shrink-0" /> {label ?? `${city}, ${country}`}
            </div>
            <p className={`mt-1 text-sm font-semibold tracking-widest uppercase ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>{data?.hijriDate ?? '—'}</p>

            {isError ? (
              <>
                <h2 className={`mt-3 text-2xl font-display font-semibold leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Location not found</h2>
                <p className={`text-sm max-w-md mt-1 ${isDark ? 'text-emerald-100/80' : 'text-emerald-900/60'}`}>
                  We couldn&apos;t load prayer times for &ldquo;{city}, {country}&rdquo;. Please update your location.
                </p>
                <button onClick={() => setShowLocPopup(true)} className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-midnight-900 font-semibold text-sm hover:brightness-105 transition">
                  <MapPin size={16} /> Fix location
                </button>
              </>
            ) : (
              <>
                <h2 className={`mt-3 text-2xl sm:text-3xl font-display font-semibold leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>
                  {next ? `${next.name} in` : 'Loading prayer times…'}
                </h2>
                <div className="relative inline-block mt-1">
                  <span aria-hidden className="absolute inset-0 blur-2xl rounded-full animate-pulse-soft" style={{ background: isDark ? 'rgba(221,185,75,0.25)' : 'rgba(201,162,39,0.18)' }} />
                  <p className={`relative text-5xl sm:text-6xl font-display font-bold tabular-nums ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                    {next ? formatCountdown(next.inMs) : '--:--:--'}
                  </p>
                </div>
                <p className={`mt-2 text-sm ${isDark ? 'text-emerald-100/75' : 'text-emerald-900/55'}`}>
                  {next ? `at ${next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Prayer-times grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data &&
            (Object.keys(data.timings) as (keyof PrayerTimes)[]).map((name, i) => {
              const Icon = ICONS[name];
              const isNext = next?.name === name;
              const CARD_BGS_LIGHT = [
                '/OverviewPage_Asr_Time_bg.png',
                '/quran-bg2.png',
                '/OverviewPage_Quran-of-the-day_bg.png',
                '/OverviewPage_sidebar_bottom_bg.png',
                '/mihrab%20bg%20img.png',
                '/masjid%20e%20nabwi.png',
              ];
              const CARD_BGS_DARK = [
                '/OverviewPage_Asr_Time_bg-darkmode.png',
                '/quran-bg2-darkmode.png',
                '/OverviewPage_Quran-of-the-day_bg-darkmode.png',
                '/OverviewPage_sidebar_bottom_bg-darkmode.png',
                '/mihrab%20bg%20img-darkmode.png',
                '/masjid%20e%20nabwi-darkmode.png',
              ];
              const cardBg = (isDark ? CARD_BGS_DARK : CARD_BGS_LIGHT)[i] ?? CARD_BGS_LIGHT[0];
              // Light mode: same cream/parchment as the countdown card (left 40%) → white (right 60%).
              const cardStyle = isNext
                ? { background: isDark
                    ? 'linear-gradient(145deg,#1c5e43 0%,#0e3a29 100%)'
                    : 'linear-gradient(145deg,#e3f4ea 0%,#c8e9d6 100%)' }
                : { background: isDark
                    ? 'linear-gradient(150deg,rgba(22,46,34,0.92) 0%,rgba(10,24,17,0.88) 100%)'
                    : 'linear-gradient(to right, #f3ebd4 0%, #fbf6e9 22%, #fffdf7 40%, #ffffff 56%)' };
              // Fade-overlay colour (used for dark mode and the isNext light card).
              const fadeColor = isNext
                ? (isDark ? '#1c5e43' : '#e3f4ea')
                : 'rgba(18,40,28,1)';
              const cardCls = isNext
                ? (isDark
                    ? 'border border-gold-300/50 text-parchment'
                    : 'border border-emerald-400/70 text-emerald-950')
                : (isDark
                    ? 'border border-white/10 text-parchment'
                    : 'border border-gold-300/30 text-emerald-950');
              const cardShadow = isNext
                ? (isDark
                    ? '0 10px 40px rgba(0,0,0,0.6), 0 0 28px rgba(233,207,122,0.18), inset 0 1px 0 rgba(255,255,255,0.07)'
                    : '0 10px 32px rgba(16,185,129,0.2), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)')
                : (isDark
                    ? '0 6px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 4px 20px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)');
              const badgeBg = isNext
                ? (isDark ? 'bg-gold-300/20' : 'bg-emerald-600/15')
                : (isDark ? 'bg-gold-300/10' : 'bg-gold-500/12');
              const iconColor = isNext
                ? (isDark ? 'text-gold-200' : 'text-emerald-700')
                : (isDark ? 'text-gold-300' : 'text-gold-600');
              const nameColor = isNext
                ? (isDark ? 'text-parchment/80' : 'text-emerald-800')
                : (isDark ? 'text-parchment/65' : 'text-emerald-900/55');
              const endColor = isNext
                ? (isDark ? 'text-parchment/65' : 'text-emerald-700/80')
                : (isDark ? 'text-parchment/45' : 'text-emerald-900/45');
              const domeColor = isNext
                ? (isDark ? 'rgba(233,207,122,0.18)' : 'rgba(5,95,70,0.16)')
                : (isDark ? 'rgba(221,185,75,0.16)' : 'rgba(201,162,39,0.14)');
              // Each prayer's window ends when the next one begins (Isha → next Fajr).
              const PORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as (keyof PrayerTimes)[];
              const endName: keyof PrayerTimes = name === 'Isha' ? 'Fajr' : PORDER[PORDER.indexOf(name) + 1];
              const endTime = to12h(data.timings[endName]);
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.88, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.07 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -7, scale: 1.03, transition: { duration: 0.22, ease: 'easeOut' } }}
                  className={`relative overflow-hidden rounded-2xl p-4 cursor-default ${cardCls}`}
                  style={{ ...cardStyle, boxShadow: cardShadow }}
                >
                  {/* right-side image — full opacity, CSS mask fades its left edge into the card */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardBg}
                    alt=""
                    aria-hidden
                    className="absolute top-1/2 right-0 -translate-y-1/2 h-[92%] w-auto pointer-events-none select-none"
                    style={{
                      opacity: 1,
                      maskImage: 'linear-gradient(to right, transparent 0%, black 52%)',
                      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 52%)',
                    }}
                  />
                  {/* fade overlay — dark mode and isNext only (light non-next uses CSS mask above) */}
                  {(isDark || isNext) && (
                    <div aria-hidden className="absolute inset-y-0 left-0 w-[65%] pointer-events-none"
                      style={{ background: `linear-gradient(to right, ${fadeColor} 35%, transparent 100%)` }} />
                  )}
                  {/* ambient radial glow overlay */}
                  <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
                    background: isNext
                      ? (isDark
                          ? 'radial-gradient(ellipse at 30% 25%, rgba(233,207,122,0.16) 0%, transparent 65%)'
                          : 'radial-gradient(ellipse at 30% 25%, rgba(16,185,129,0.13) 0%, transparent 65%)')
                      : (isDark
                          ? 'radial-gradient(ellipse at 20% 20%, rgba(233,207,122,0.07) 0%, transparent 60%)'
                          : 'radial-gradient(ellipse at 15% 15%, rgba(255,255,255,0.5) 0%, transparent 55%)'),
                  }} />
                  <DomeMark color={domeColor} className="absolute -top-1 right-2 w-14 pointer-events-none" />
                  {/* pulsing border ring for the next prayer */}
                  {isNext && (
                    <motion.span aria-hidden className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: isDark ? 'inset 0 0 0 1.5px rgba(233,207,122,0.6)' : 'inset 0 0 0 1.5px rgba(16,185,129,0.6)' }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  )}
                  {/* outer glow pulse for next prayer */}
                  {isNext && (
                    <motion.span aria-hidden className="absolute inset-0 rounded-2xl pointer-events-none"
                      animate={{ boxShadow: isDark
                        ? ['0 0 0px rgba(233,207,122,0)', '0 0 18px rgba(233,207,122,0.22)', '0 0 0px rgba(233,207,122,0)']
                        : ['0 0 0px rgba(16,185,129,0)', '0 0 18px rgba(16,185,129,0.2)', '0 0 0px rgba(16,185,129,0)'] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
                  )}

                  {/* content floats gently on a continuous slow loop */}
                  <motion.div
                    className="relative"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 3.5 + i * 0.45,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.55 + 0.8,
                    }}
                  >
                    {/* prayer icon in a tinted badge */}
                    <motion.div
                      animate={isNext ? { scale: [1, 1.14, 1], rotate: [0, 5, 0] } : {}}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${badgeBg}`}
                    >
                      <Icon size={20} className={iconColor} />
                    </motion.div>
                    <p className={`mt-3 text-lg font-bold tracking-wide ${nameColor}`}>{name}</p>
                    <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums leading-tight">{to12h(data.timings[name])}</p>
                    <p className={`mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold ${endColor}`}>
                      <Clock size={13} className="shrink-0" /> Ends {endTime}
                    </p>
                  </motion.div>
                </motion.div>
              );
            })}
          {(isLoading || isError) &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`rounded-2xl p-4 border h-24 ${isDark ? 'border-white/10 bg-white/5' : 'border-emerald-900/8 bg-white'} ${isError ? '' : 'animate-pulse'}`} />
            ))}
        </div>
      </div>

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
