'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search, MapPin, Sun, Sunrise, Sunset, Moon, Clock, ChevronRight, ChevronDown,
  Compass, Bell, Play, BookOpen, Bookmark, Hand, CircleDot, Calendar, Star,
  StickyNote, MoreHorizontal, Globe, GraduationCap, Calculator, SlidersHorizontal,
  ArrowUpRight, User,
} from 'lucide-react';
import {
  fetchTimingsByCity, fetchTimingsByCoords, nextPrayerInZone, formatCountdown,
  type PrayerTimes,
} from '@/lib/prayer';
import { qiblaBearing } from '@/lib/qibla';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalStorage } from '@/lib/useLocalStorage';

const ORDER: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Per-prayer icon + accent, tuned to the reference design (warm dawn → cool night).
const PRAYER_META: Record<keyof PrayerTimes, { icon: any; tint: string; badge: string }> = {
  Fajr:    { icon: Sunrise, tint: 'text-amber-500',   badge: 'bg-amber-100'   },
  Sunrise: { icon: Sun,     tint: 'text-orange-400',  badge: 'bg-orange-100'  },
  Dhuhr:   { icon: Sun,     tint: 'text-emerald-500', badge: 'bg-emerald-100' },
  Asr:     { icon: Sun,     tint: 'text-emerald-600', badge: 'bg-emerald-100' },
  Maghrib: { icon: Sunset,  tint: 'text-rose-500',    badge: 'bg-rose-100'    },
  Isha:    { icon: Moon,    tint: 'text-violet-500',  badge: 'bg-violet-100'  },
};

const SECT_LABELS: Record<string, string> = {
  hanafi: 'Hanafi', shafii: "Shafi'i", maliki: 'Maliki', hanbali: 'Hanbali', shia: 'Shia (Jafari)',
};
const LANG_LABELS: Record<string, string> = { ur: 'Urdu', en: 'English', none: 'Arabic only' };
const METHOD_LABELS: Record<number, string> = {
  0: 'Shia (Jafari)', 1: 'University of Karachi', 2: 'ISNA',
  3: 'Muslim World League', 4: 'Umm al-Qura, Makkah', 5: 'Egyptian Authority', 7: 'Tehran',
};

function to12h(time?: string): { hm: string; ap: string } {
  if (!time || !time.includes(':')) return { hm: '--:--', ap: '' };
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { hm: `${String(h12).padStart(2, '0')}:${mStr}`, ap };
}

export default function Overview() {
  const { isDark } = useTheme();
  const loc = useStoredLocation();
  const byCoords = typeof loc.lat === 'number' && typeof loc.lng === 'number';

  // Live preference values for the "Your Preferences" banner.
  const [name]      = useLocalStorage<string>('isa:name', '');
  const [language]  = useLocalStorage<string>('isa:language', 'en');
  const [sect]      = useLocalStorage<string>('isa:sect', 'hanafi');
  const [methodRaw] = useLocalStorage<number>('isa:method', -1);

  const { data } = useQuery({
    queryKey: byCoords
      ? ['timings', 'coords', loc.lat, loc.lng, loc.method]
      : ['timings', 'city', loc.city, loc.country],
    queryFn: () =>
      byCoords
        ? fetchTimingsByCoords(loc.lat!, loc.lng!, { method: loc.method ?? 3, label: loc.label })
        : fetchTimingsByCity(loc.city, loc.country),
    staleTime: 5 * 60 * 1000,
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

  // The prayer whose window we're currently inside = the one before `next`.
  const currentName: keyof PrayerTimes | null = useMemo(() => {
    if (!next) return null;
    const i = ORDER.indexOf(next.name);
    return i > 0 ? ORDER[i - 1] : 'Isha';
  }, [next]);

  // Progress through the current prayer window (start → next prayer start).
  const progress = useMemo(() => {
    if (!data || !next || !currentName) return 0;
    const [h, m] = (data.timings[currentName] ?? '0:0').split(':').map(Number);
    let start = new Date(now); start.setHours(h, m, 0, 0);
    if (start.getTime() > next.at.getTime()) start = new Date(start.getTime() - 86_400_000);
    const total = next.at.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
  }, [data, next, currentName, now]);

  const bearing = byCoords ? qiblaBearing(loc.lat!, loc.lng!) : 248;
  const methodLabel = METHOD_LABELS[methodRaw >= 0 ? methodRaw : 3] ?? 'Muslim World League';
  const openPrefs = () => window.dispatchEvent(new Event('isa:edit-prefs'));

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const c = isDark
    ? {
        text: 'text-parchment', heading: 'text-parchment', muted: 'text-parchment/60',
        faint: 'text-parchment/45',
        card: 'bg-midnight-800/70 border border-white/10 shadow-lg shadow-black/30',
        soft: 'bg-white/5 border border-white/10',
        divider: 'border-white/10',
        search: 'bg-white/5 border-white/10 text-parchment placeholder:text-parchment/40',
        kbd: 'bg-white/10 text-parchment/60',
      }
    : {
        text: 'text-emerald-950', heading: 'text-emerald-950', muted: 'text-emerald-900/55',
        faint: 'text-emerald-900/40',
        card: 'bg-white/85 border border-gold-300/25 shadow-card-soft',
        soft: 'bg-white/70 border border-emerald-900/[0.06]',
        divider: 'border-emerald-900/10',
        search: 'bg-white border-emerald-900/10 text-emerald-950 placeholder:text-emerald-900/40',
        kbd: 'bg-emerald-900/[0.06] text-emerald-900/45',
      };
  const cardCls = `relative overflow-hidden rounded-3xl backdrop-blur-md ${c.card}`;

  return (
    <div className={`space-y-5 ${c.text}`}>
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="flex flex-wrap items-center gap-4 xl:flex-nowrap">
        <div className="min-w-[200px]">
          <h1 className="h-display text-3xl sm:text-4xl font-bold leading-tight">
            Assalamu Alaikum, <span className="inline-block">👋</span>
          </h1>
          <p className={`mt-1 text-sm ${c.muted}`}>May Allah bless your day and ease your journey.</p>
        </div>

        {/* Search */}
        <div className="order-3 xl:order-2 w-full xl:flex-1 xl:max-w-xl xl:mx-auto">
          <div className={`flex items-center gap-2 rounded-full border px-4 py-2.5 ${c.search}`}>
            <Search size={18} className="text-emerald-600 shrink-0" />
            <input
              placeholder="Search anything..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <span className={`hidden sm:inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${c.kbd}`}>
              Ctrl /
            </span>
            <button
              aria-label="Search"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-700/30 hover:bg-emerald-700 transition"
            >
              <Search size={15} />
            </button>
          </div>
        </div>

        {/* Location · Weather · Avatar */}
        <div className="order-2 xl:order-3 ml-auto flex items-center gap-5">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-emerald-600" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
              <p className={`text-[11px] ${c.faint}`}>{data?.hijriDate ?? '—'}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Sun size={18} className="text-amber-400" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">18°C</p>
              <p className={`text-[11px] ${c.faint}`}>Clear</p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('isa:open-profile'))}
            className="relative shrink-0"
            aria-label="Open profile"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold ring-2 ring-white/70 shadow-md">
              {name ? name.trim().charAt(0).toUpperCase() : <User size={20} />}
            </span>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </button>
        </div>
      </header>

      {/* ─────────────────── Main grid: left stack + right rail ─────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* LEFT */}
        <div className="min-w-0 space-y-5">
          {/* Row 1 — Prayer Times + Countdown */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
            {/* Prayer Times */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`${cardCls} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                    <Clock size={20} />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">Prayer Times</h2>
                    <p className={`text-xs ${c.muted}`}>Today, {data?.hijriDate ?? '—'}</p>
                  </div>
                </div>
                <ChevronDown size={18} className={c.faint} />
              </div>

              <div className="mt-5 grid grid-cols-6 gap-1.5">
                {ORDER.map((p) => {
                  const meta = PRAYER_META[p];
                  const t = to12h(data?.timings[p]);
                  const active = currentName === p;
                  return (
                    <div
                      key={p}
                      className={`relative flex flex-col items-center rounded-2xl py-3 px-1 text-center transition ${
                        active
                          ? 'bg-emerald-50 ring-1 ring-emerald-300/70'
                          : ''
                      }`}
                    >
                      <span className={`grid h-9 w-9 place-items-center rounded-full ${meta.badge}`}>
                        <meta.icon size={17} className={meta.tint} />
                      </span>
                      <p className={`mt-2 text-[11px] font-medium ${active ? 'text-emerald-700' : c.muted}`}>{p}</p>
                      <p className="mt-0.5 text-base sm:text-lg font-bold tabular-nums leading-none">{t.hm}</p>
                      <p className={`mt-0.5 text-[10px] font-semibold ${c.faint}`}>{t.ap}</p>
                      {active && <span className="absolute -bottom-px left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-full bg-emerald-500" />}
                    </div>
                  );
                })}
              </div>

              <div className={`mt-4 flex items-center justify-between rounded-2xl border ${c.divider} ${c.soft} px-4 py-2.5 text-sm`}>
                <span className="flex items-center gap-2">
                  <Clock size={14} className="text-emerald-600" />
                  <span className={c.muted}>Next Prayer:</span>
                  <span className="font-semibold">{next?.name ?? '—'}</span>
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 tabular-nums">
                  <Clock size={14} /> {next ? formatCountdown(next.inMs) : '--:--:--'}
                </span>
              </div>
            </motion.section>

            {/* Countdown — "{current} Time Left" */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className={`${cardCls} p-5`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/masjid_img.png" alt=""
                className="pointer-events-none absolute -bottom-2 -right-6 w-44 opacity-60 select-none"
              />
              <div className="relative">
                <h2 className="text-lg font-bold leading-tight">{currentName ?? 'Prayer'} Time Left</h2>
                <p className={`text-xs ${c.muted}`}>Stay mindful of your time</p>

                <p className="mt-6 font-display text-5xl font-bold tabular-nums text-emerald-600">
                  {next ? formatCountdown(next.inMs) : '--:--:--'}
                </p>

                <div className={`mt-6 h-2 w-3/4 rounded-full ${isDark ? 'bg-white/10' : 'bg-emerald-900/[0.08]'} overflow-hidden`}>
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.6 }}
                  />
                </div>
                <p className={`mt-2 text-xs ${c.muted}`}>
                  Ends at {next ? next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                </p>
              </div>
            </motion.section>
          </div>

          {/* Row 2 — Qibla + Azan + Recitation */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Qibla Direction */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className={`${cardCls} p-5 flex flex-col`}
            >
              <h3 className="text-base font-bold leading-tight">Qibla Direction</h3>
              <p className={`text-xs ${c.muted}`}>Find the direction of the Kaaba</p>

              <div className="relative mx-auto my-5 grid h-40 w-40 place-items-center">
                <div className={`absolute inset-0 rounded-full border-2 ${isDark ? 'border-white/10' : 'border-emerald-900/10'}`} />
                <div className={`absolute inset-3 rounded-full border ${isDark ? 'border-white/10' : 'border-emerald-900/[0.06]'}`} />
                <span className={`absolute top-1 text-[10px] font-bold ${c.muted}`}>N</span>
                <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${c.muted}`}>E</span>
                <span className={`absolute bottom-1 text-[10px] font-bold ${c.muted}`}>S</span>
                <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${c.muted}`}>W</span>
                {/* needle */}
                <div
                  className="absolute inset-0 grid place-items-center"
                  style={{ transform: `rotate(${bearing}deg)` }}
                >
                  <div className="flex h-full flex-col items-center justify-between py-4">
                    <div className="h-0 w-0 border-x-[7px] border-b-[26px] border-x-transparent border-b-emerald-600" />
                    <span className="grid h-5 w-5 place-items-center rounded-[4px] bg-emerald-950 text-[8px] text-gold-300">▦</span>
                  </div>
                </div>
                <span className="grid h-3 w-3 place-items-center rounded-full bg-emerald-700 ring-4 ring-emerald-100" />
              </div>

              <div className="text-center">
                <p className="font-display text-3xl font-bold text-emerald-600">{Math.round(bearing)}°</p>
                <p className={`text-xs ${c.muted}`}>from North</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <Compass size={12} /> Accurate
                </span>
                <p className={`mt-2 text-[11px] ${c.faint}`}>Makkah, Saudi Arabia</p>
              </div>

              <Link
                href="/dashboard/qibla"
                className={`mt-4 flex items-center justify-center gap-2 rounded-xl border ${c.divider} py-2.5 text-sm font-semibold transition hover:border-emerald-400`}
              >
                <MapPin size={15} className="text-emerald-600" /> View on Map
              </Link>
            </motion.section>

            {/* Azan Voices */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`${cardCls} p-5 flex flex-col`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-500">
                  <Bell size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight">Azan Voices</h3>
                  <p className={`text-xs ${c.muted}`}>Listen to beautiful Azan</p>
                </div>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {[
                  { name: 'Mishary Rashid Alafasy', region: 'Makkah, Saudi Arabia', active: true },
                  { name: 'Abdul Basit Abd us-Samad', region: 'Egypt' },
                  { name: 'Maher Al Muaiqly', region: 'Makkah, Saudi Arabia' },
                ].map((r) => (
                  <li
                    key={r.name}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                      r.active
                        ? 'bg-emerald-50 ring-1 ring-emerald-300/60'
                        : `border ${c.divider}`
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white">
                      <User size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight">{r.name}</p>
                      <p className={`truncate text-[11px] ${c.faint}`}>{r.region}</p>
                    </div>
                    <span className={`grid h-7 w-7 place-items-center rounded-full ${r.active ? 'bg-emerald-600 text-white' : `${c.soft} border ${c.divider} text-emerald-600`}`}>
                      <Play size={12} className="ml-0.5" />
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/azan"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-600 transition hover:border-violet-300"
              >
                <Bell size={15} /> View All Voices
              </Link>
            </motion.section>

            {/* Recitation Scheduler */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className={`${cardCls} p-5 flex flex-col`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight">Recitation Scheduler</h3>
                  <p className={`text-xs ${c.muted}`}>Your daily Quran recitation</p>
                </div>
              </div>

              <div className={`mt-4 flex items-center justify-between rounded-2xl border ${c.divider} ${c.soft} px-4 py-3`}>
                <div>
                  <p className={`text-xs ${c.muted}`}>Daily Goal</p>
                  <p className="text-xl font-bold leading-tight">20 <span className={`text-sm font-medium ${c.muted}`}>minutes</span></p>
                </div>
                <div className="relative grid h-12 w-12 place-items-center">
                  <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(5,95,70,0.12)'} strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 15.5}`} strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - 0.6)}`} />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-emerald-600">60%</span>
                </div>
              </div>

              <div className="mt-3 flex-1 space-y-3 text-sm">
                <div>
                  <p className={`text-[11px] ${c.faint}`}>Next Session</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Surah Al-Kahf (18)</span>
                    <span className={`text-[11px] ${c.muted}`}>Today, 08:00 PM</span>
                  </div>
                </div>
                <div className={`border-t ${c.divider}`} />
                <div>
                  <p className={`text-[11px] ${c.faint}`}>Last Session</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Surah Yaseen (36)</span>
                    <span className={`text-[11px] ${c.muted}`}>Today, 06:00 AM</span>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/recitation"
                className={`mt-4 flex items-center justify-center gap-2 rounded-xl border ${c.divider} py-2.5 text-sm font-semibold text-emerald-600 transition hover:border-emerald-400`}
              >
                <Calendar size={15} /> Open Scheduler
              </Link>
            </motion.section>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="space-y-5">
          {/* Quran of the Day */}
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className={`${cardCls} p-5`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDark ? '/quran-bg.png' : '/card_images/Quran_Translation_Card_image.png'}
              alt=""
              className={`pointer-events-none absolute bottom-0 right-0 w-40 select-none ${isDark ? 'opacity-30' : 'opacity-80'}`}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <BookOpen size={17} />
                </span>
                <h3 className="text-base font-bold">Quran of the Day</h3>
              </div>

              <p className="mt-4 text-lg font-bold">Surah Ar-Rahman</p>
              <p className={`text-xs ${c.muted}`}>(55:1-3)</p>

              <div className={`mt-3 font-arabic text-2xl leading-relaxed ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                <p>الرَّحْمَٰنُ</p>
                <p>عَلَّمَ الْقُرْآنَ</p>
                <p>خَلَقَ الْإِنْسَانَ</p>
              </div>

              <div className={`mt-3 text-xs leading-relaxed ${c.muted}`}>
                <p>The Most Merciful</p>
                <p>Taught the Qur&apos;an</p>
                <p>Created man</p>
              </div>

              <Link
                href="/dashboard/quran"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-2 text-sm font-semibold text-violet-600 transition hover:border-violet-300"
              >
                <BookOpen size={15} /> Read More
              </Link>
            </div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className={`${cardCls} p-5`}
          >
            <h3 className="text-base font-bold">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Quran Library',  icon: BookOpen,        tint: 'text-emerald-600', bg: 'bg-emerald-100',  href: '/dashboard/quran' },
                { label: 'Bookmarks',      icon: Bookmark,        tint: 'text-amber-600',   bg: 'bg-amber-100',    href: '/dashboard/quran' },
                { label: 'Duas',           icon: Hand,            tint: 'text-violet-600',  bg: 'bg-violet-100',   href: '/dashboard/quran' },
                { label: 'Tasbih',         icon: CircleDot,       tint: 'text-rose-500',    bg: 'bg-rose-100',     href: '/dashboard/quran' },
                { label: 'Calendar',       icon: Calendar,        tint: 'text-emerald-600', bg: 'bg-emerald-100',  href: '/dashboard/prayer-times' },
                { label: 'Islamic Events', icon: Star,            tint: 'text-teal-600',    bg: 'bg-teal-100',     href: '/dashboard/prayer-times' },
                { label: 'Notes',          icon: StickyNote,      tint: 'text-amber-600',   bg: 'bg-amber-100',    href: '/dashboard/quran' },
                { label: 'More',           icon: MoreHorizontal,  tint: c.faint,            bg: isDark ? 'bg-white/5' : 'bg-emerald-900/[0.05]', href: '/dashboard/settings' },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-1.5 text-center">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${a.bg} transition group-hover:scale-105`}>
                    <a.icon size={20} className={a.tint} />
                  </span>
                  <span className={`text-[10px] font-medium leading-tight ${c.muted}`}>{a.label}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        </div>
      </div>

      {/* ───────────────────────── Your Preferences ───────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className={`${cardCls} p-5`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/masjid-e-nabwi.png" alt=""
          className="pointer-events-none absolute -bottom-4 right-44 hidden h-44 select-none opacity-90 lg:block"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-100 text-gold-600">
              <Star size={18} />
            </span>
            <div>
              <h3 className="text-lg font-bold leading-tight">Your Preferences</h3>
              <p className={`text-xs ${c.muted}`}>Customize your experience</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {[
              { icon: Globe,          label: 'Language',           value: LANG_LABELS[language] ?? language },
              { icon: MapPin,         label: 'Location',           value: `${loc.city}${loc.country ? `, ${loc.country}` : ''}` },
              { icon: GraduationCap,  label: 'Sect',               value: SECT_LABELS[sect] ?? sect },
              { icon: Calculator,     label: 'Calculation Method', value: methodLabel },
            ].map((p) => (
              <button
                key={p.label}
                onClick={openPrefs}
                className={`flex min-w-[180px] flex-1 items-center gap-3 rounded-2xl border ${c.divider} ${c.soft} px-4 py-3 text-left transition hover:border-emerald-400`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                  <p.icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] ${c.faint}`}>{p.label}</p>
                  <p className="truncate text-sm font-semibold">{p.value}</p>
                </div>
                <ChevronDown size={15} className={c.faint} />
              </button>
            ))}

            <button
              onClick={openPrefs}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-700/30 transition hover:bg-emerald-700"
            >
              <SlidersHorizontal size={16} /> Edit Preferences
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
