'use client';

/**
 * The glass prayer card shown in the landing hero (right column), styled to match
 * the marketing design. It shows LIVE prayer times for the visitor's saved
 * location, and falls back to a fixed "London" mockup (identical to the design)
 * until a location has actually been set — so first paint always looks right.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Settings, Clock, Sparkles, BookOpen, Compass, CircleDot, Heart } from 'lucide-react';
import {
  fetchTimingsByCity, fetchTimingsByCoords, nextPrayerInZone, formatCountdown,
  LocationError, type PrayerTimes,
} from '@/lib/prayer';

const ORDER: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Exact values from the reference design — used until the visitor sets a location.
const MOCKUP = {
  city: 'London',
  country: 'United Kingdom',
  hijriDate: '29 Dhul Hijjah 1445',
  timings: { Fajr: '03:42', Sunrise: '05:18', Dhuhr: '13:05', Asr: '16:37', Maghrib: '21:02', Isha: '22:39' } as PrayerTimes,
  currentName: 'Asr' as keyof PrayerTimes,
  nextName: 'Maghrib' as keyof PrayerTimes,
  countdown: '04:24',
};

const QUICK = [
  { icon: BookOpen, label: 'Quran',        sub: 'Recitation & Translation', href: '/dashboard/quran' },
  { icon: Compass,  label: 'Qibla Finder', sub: 'Find Direction',           href: '/dashboard/qibla' },
  { icon: CircleDot, label: 'Tasbih',      sub: 'Digital Counter',          href: '/dashboard' },
  { icon: Heart,    label: 'Daily Duas',   sub: 'Supplications',            href: '/dashboard' },
];

function fmt12(t: string): { time: string; period: string } {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { time: `${h12}:${String(m ?? 0).padStart(2, '0')}`, period };
}

/** The prayer immediately before `name` in the daily order (wraps Fajr→Isha). */
function prevOf(name: keyof PrayerTimes): keyof PrayerTimes {
  const i = ORDER.indexOf(name);
  return ORDER[(i - 1 + ORDER.length) % ORDER.length];
}

type Props = { lat?: number; lng?: number; city?: string; country?: string; method?: number };

export function HeroPrayerCard({ lat, lng, city = 'Karachi', country = 'Pakistan', method }: Props) {
  // Only fetch live data once the visitor has actually saved a location — a brand
  // new visitor (no stored keys) sees the design's London mockup instead of the
  // app's Karachi default. Read raw localStorage so we don't treat the default as "set".
  const [located, setLocated] = useState(false);
  useEffect(() => {
    try {
      const ls = window.localStorage;
      setLocated(Boolean(ls.getItem('isa:city') || (ls.getItem('isa:lat') && ls.getItem('isa:lng'))));
    } catch { /* no localStorage — stay on mockup */ }
  }, []);

  const byCoords = typeof lat === 'number' && typeof lng === 'number';
  const { data, isError } = useQuery({
    queryKey: byCoords ? ['hero-timings', 'coords', lat, lng, method] : ['hero-timings', 'city', city, country],
    queryFn: () =>
      byCoords
        ? fetchTimingsByCoords(lat!, lng!, { method, school: 0, label: [city, country].filter(Boolean).join(', ') })
        : fetchTimingsByCity(city, country),
    enabled: located,
    staleTime: 5 * 60 * 1000,
    retry: (n, err) => !(err instanceof LocationError) && n < 2,
  });

  // Live ticking clock for the countdown (only matters in live mode).
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const live = located && !!data && !isError;
  const next = useMemo(() => (live ? nextPrayerInZone(data!.timings, data!.timezone, now) : null), [live, data, now]);

  const timings    = live ? data!.timings : MOCKUP.timings;
  const cityName   = live ? (city || data!.city) : MOCKUP.city;
  const country2   = live ? (country || data!.country) : MOCKUP.country;
  const hijri      = live ? data!.hijriDate : MOCKUP.hijriDate;
  const nextName   = live ? (next?.name ?? MOCKUP.nextName) : MOCKUP.nextName;
  const currentNm  = live ? prevOf(nextName) : MOCKUP.currentName;
  const countdown  = live ? (next ? formatCountdown(next.inMs) : '--:--:--') : MOCKUP.countdown;

  return (
    <div className="glass-dark rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-950/40 w-full">
      {/* header: location + hijri date + settings */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-parchment truncate">
            <MapPin size={16} className="text-gold-300 shrink-0" />
            {cityName}{country2 ? `, ${country2}` : ''}
          </p>
          <p className="text-gold-300 text-sm font-medium mt-0.5">{hijri}</p>
        </div>
        <Link
          href="/dashboard/prayer-times"
          title="Prayer settings"
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition shrink-0"
        >
          <Settings size={16} className="text-parchment/80" />
        </Link>
      </div>

      {/* prayer-time cells (current prayer highlighted in gold) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5">
        {ORDER.map((name) => {
          const { time, period } = fmt12(timings[name]);
          const active = name === currentNm;
          return (
            <div
              key={name}
              className={`rounded-xl px-1 py-3 text-center border ${
                active
                  ? 'bg-gold-gradient text-midnight-900 border-gold-300 shadow-glow-gold'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <p className={`text-[11px] font-semibold ${active ? 'text-midnight-900/70' : 'text-parchment/60'}`}>{name}</p>
              <p className={`text-base font-bold tabular-nums mt-1 ${active ? '' : 'text-parchment'}`}>{time}</p>
              <p className={`text-[10px] font-semibold ${active ? 'text-midnight-900/70' : 'text-parchment/50'}`}>{period}</p>
            </div>
          );
        })}
      </div>

      {/* next prayer countdown + dhikr */}
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="flex items-center gap-1.5 text-parchment/60 text-xs font-semibold">
            <Clock size={13} /> Next Prayer
          </p>
          <p className="text-lg font-bold mt-1 text-parchment">{nextName}</p>
          <p className="text-4xl font-display font-bold text-gold-300 tabular-nums leading-none mt-1">{countdown}</p>
          <p className="text-parchment/55 text-xs mt-2">Left until Adhan</p>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center justify-center text-center">
          <p className="text-parchment/60 text-xs">And remember Allah often</p>
          <p className="font-arabic text-2xl text-parchment mt-2" dir="rtl">وَاذْكُرِ اللَّهَ كَثِيرًا</p>
          <p className="text-gold-300 text-xs font-semibold mt-2 flex items-center gap-1">
            <Sparkles size={11} /> Al-Ahzab 33:41
          </p>
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
        {QUICK.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="rounded-xl px-2 py-2 hover:bg-white/5 transition flex items-center gap-2"
          >
            <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gold-300 shrink-0">
              <q.icon size={15} />
            </span>
            <span className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate text-parchment">{q.label}</p>
              <p className="text-[10px] text-parchment/50 leading-tight truncate">{q.sub}</p>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
