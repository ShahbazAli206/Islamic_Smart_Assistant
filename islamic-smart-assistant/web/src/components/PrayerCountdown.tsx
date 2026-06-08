'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Sunrise, Sun, Sunset, Moon, Star, Compass } from 'lucide-react';
import { fetchTimingsByCity, nextPrayer, formatCountdown, type PrayerTimes, type MethodId } from '@/lib/prayer';

const ICONS: Record<keyof PrayerTimes, any> = {
  Fajr: Star, Sunrise: Sunrise, Dhuhr: Sun, Asr: Compass, Maghrib: Sunset, Isha: Moon,
};

const URDU: Record<keyof PrayerTimes, string> = {
  Fajr: 'فجر', Sunrise: 'طلوع', Dhuhr: 'ظهر', Asr: 'عصر', Maghrib: 'مغرب', Isha: 'عشاء',
};

export function PrayerCountdownHero({
  city = 'Karachi',
  country = 'Pakistan',
  method,
}: { city?: string; country?: string; method?: MethodId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['timings', city, country, method],
    queryFn: () => fetchTimingsByCity(city, country, method),
    staleTime: 5 * 60 * 1000,
  });

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(() => (data ? nextPrayer(data.timings, now) : null), [data, now]);

  return (
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
            <MapPin size={16} /> {data?.city ?? city}, {data?.country ?? country}
          </div>
          <p className="text-gold-300 text-sm tracking-widest uppercase">{data?.hijriDate ?? '—'}</p>
          <h2 className="text-4xl md:text-5xl font-display font-semibold leading-tight">
            {next ? `${next.name} in` : 'Loading prayer times…'}
          </h2>
          <p className="text-6xl md:text-7xl font-display font-bold text-gold-300 tabular-nums">
            {next ? formatCountdown(next.inMs) : '--:--:--'}
          </p>
          <p className="text-emerald-100/80">
            {next ? `at ${next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
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
                    {data.timings[name]}
                  </p>
                </motion.div>
              );
            })}
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 bg-white/5 border border-white/10 h-24 animate-pulse" />
            ))}
        </div>
      </div>
    </motion.div>
  );
}
