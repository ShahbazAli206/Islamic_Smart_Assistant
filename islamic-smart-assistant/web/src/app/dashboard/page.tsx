'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search, MapPin, Sun, Sunrise, Sunset, Moon, Clock, ChevronDown,
  Compass, Bell, Play, BookOpen, Bookmark, Hand, CircleDot, Calendar, Star,
  StickyNote, MoreHorizontal, Globe, GraduationCap, Calculator, SlidersHorizontal,
  User,
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

// Soft fade so a rectangular illustration melts into the card instead of
// showing a hard edge — solid at the bottom-right corner, transparent toward
// the top-left where the text sits.
const FADE_TL = {
  WebkitMaskImage: 'linear-gradient(to top left, black 35%, transparent 80%)',
  maskImage: 'linear-gradient(to top left, black 35%, transparent 80%)',
} as const;

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
    return total > 0 ? Math.min(100, Math.max(2, (elapsed / total) * 100)) : 0;
  }, [data, next, currentName, now]);

  const bearing = byCoords ? qiblaBearing(loc.lat!, loc.lng!) : 248;
  const methodLabel = METHOD_LABELS[methodRaw >= 0 ? methodRaw : 3] ?? 'Muslim World League';
  const openPrefs = () => window.dispatchEvent(new Event('isa:edit-prefs'));

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const c = isDark
    ? {
        text: 'text-parchment', muted: 'text-parchment/60', faint: 'text-parchment/45',
        card: 'bg-midnight-800/80 border border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]',
        soft: 'bg-white/[0.04] border border-white/10',
        divider: 'border-white/10',
        search: 'bg-white/[0.05] border-white/10 text-parchment placeholder:text-parchment/40 shadow-none',
        kbd: 'bg-white/10 text-parchment/55',
        track: 'bg-white/10',
      }
    : {
        text: 'text-emerald-950', muted: 'text-emerald-900/55', faint: 'text-emerald-900/40',
        card: 'bg-white border border-emerald-900/[0.05] shadow-[0_1px_3px_rgba(16,40,30,0.04),0_14px_34px_-16px_rgba(16,40,30,0.16)]',
        soft: 'bg-emerald-50/40 border border-emerald-900/[0.06]',
        divider: 'border-emerald-900/[0.08]',
        search: 'bg-white border-emerald-900/[0.06] text-emerald-950 placeholder:text-emerald-900/40 shadow-[0_1px_3px_rgba(16,40,30,0.04),0_10px_24px_-14px_rgba(16,40,30,0.18)]',
        kbd: 'bg-emerald-900/[0.05] text-emerald-900/45',
        track: 'bg-emerald-900/[0.07]',
      };
  const cardCls = `relative overflow-hidden rounded-[26px] ${c.card}`;

  // The app's <body> keeps its cream gradient even in dark mode, so in dark we
  // bleed a deep-green backdrop out to the main padding edges; otherwise the
  // parchment header text would sit unreadable on the light page background.
  const rootCls = isDark
    ? `-m-5 sm:-m-8 p-5 sm:p-8 min-h-screen space-y-5 ${c.text}`
    : `space-y-5 ${c.text}`;
  const rootStyle = isDark
    ? { background: 'radial-gradient(1000px 520px at 12% -12%, rgba(16,185,129,0.07), transparent 60%), linear-gradient(180deg,#0a1c14 0%,#07140e 100%)' }
    : undefined;

  return (
    <div className={rootCls} style={rootStyle}>
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="flex flex-wrap items-center gap-4 xl:flex-nowrap">
        <div className="min-w-[210px]">
          <h1 className="h-display text-3xl sm:text-[2.5rem] font-bold leading-[1.05]">
            Assalamu Alaikum, <span className="inline-block">👋</span>
          </h1>
          <p className={`mt-1 text-sm ${c.muted}`}>May Allah bless your day and ease your journey.</p>
        </div>

        {/* Search */}
        <div className="order-3 xl:order-2 w-full xl:flex-1 xl:max-w-[560px] xl:mx-auto">
          <div className={`flex items-center gap-2 rounded-full border px-4 py-2.5 ${c.search}`}>
            <Search size={18} className={c.faint} />
            <input
              placeholder="Search anything..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <span className={`hidden sm:inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${c.kbd}`}>
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
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold ring-2 ring-white shadow-md">
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

              <div className="mt-5 grid grid-cols-6 gap-2">
                {ORDER.map((p) => {
                  const meta = PRAYER_META[p];
                  const t = to12h(data?.timings[p]);
                  const active = currentName === p;
                  return (
                    <div
                      key={p}
                      className={`flex flex-col items-center rounded-2xl py-3.5 px-1 text-center transition ${
                        active ? 'bg-emerald-50 ring-1 ring-emerald-300/70 shadow-[0_8px_20px_-12px_rgba(5,150,105,0.5)]' : ''
                      }`}
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-emerald-100' : meta.badge}`}>
                        <meta.icon size={18} className={active ? 'text-emerald-600' : meta.tint} />
                      </span>
                      <p className={`mt-2 text-[11px] font-medium ${active ? 'text-emerald-700' : c.muted}`}>{p}</p>
                      <p className="mt-1 text-base sm:text-lg font-bold tabular-nums leading-none">{t.hm}</p>
                      <p className={`mt-1 text-[10px] font-semibold ${active ? 'text-emerald-600/70' : c.faint}`}>{t.ap}</p>
                    </div>
                  );
                })}
              </div>

              <div className={`mt-4 flex items-center justify-between rounded-2xl border ${c.divider} ${c.soft} px-4 py-3 text-sm`}>
                <span className="flex items-center gap-2">
                  <Clock size={15} className="text-emerald-600" />
                  <span className={c.muted}>Next Prayer:</span>
                  <span className="font-semibold">{next?.name ?? '—'}</span>
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 tabular-nums">
                  <Clock size={15} /> {next ? formatCountdown(next.inMs) : '--:--:--'}
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
                style={FADE_TL}
                className="pointer-events-none absolute bottom-0 right-0 w-52 select-none opacity-90"
              />
              <div className="relative">
                <h2 className="text-lg font-bold leading-tight">{currentName ?? 'Prayer'} Time Left</h2>
                <p className={`text-xs ${c.muted}`}>Stay mindful of your time</p>

                <p className="mt-8 font-display text-[3.25rem] font-bold tabular-nums leading-none text-emerald-600">
                  {next ? formatCountdown(next.inMs) : '--:--:--'}
                </p>

                <div className={`mt-6 h-2 w-3/4 rounded-full ${c.track} overflow-hidden`}>
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.6 }}
                  />
                </div>
                <p className={`mt-2.5 text-xs ${c.muted}`}>
                  Ends at {next ? next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '—'}
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

              <div className="relative mx-auto my-6 h-44 w-44">
                {/* dial */}
                <div className={`absolute inset-0 rounded-full border ${isDark ? 'border-white/12' : 'border-emerald-900/[0.12]'} ${isDark ? 'bg-white/[0.02]' : 'bg-emerald-50/30'}`} />
                {/* tick marks */}
                <svg viewBox="0 0 176 176" className="absolute inset-0 h-full w-full">
                  {Array.from({ length: 72 }).map((_, i) => {
                    const major = i % 9 === 0;
                    const a = (i * 5 * Math.PI) / 180;
                    const r1 = 84, r2 = major ? 74 : 79;
                    const x1 = 88 + r1 * Math.sin(a), y1 = 88 - r1 * Math.cos(a);
                    const x2 = 88 + r2 * Math.sin(a), y2 = 88 - r2 * Math.cos(a);
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(5,95,70,0.28)'}
                        strokeWidth={major ? 1.6 : 0.8} />
                    );
                  })}
                </svg>
                <span className={`absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-bold ${c.muted}`}>N</span>
                <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold ${c.muted}`}>E</span>
                <span className={`absolute left-1/2 bottom-2 -translate-x-1/2 text-[11px] font-bold ${c.muted}`}>S</span>
                <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold ${c.muted}`}>W</span>

                {/* rotating needle + kaaba */}
                <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
                  <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-[8px] border-b-[34px] border-x-transparent border-b-emerald-600" />
                  <span className="absolute left-1/2 top-[14px] h-5 w-5 -translate-x-1/2 grid place-items-center rounded-[5px] bg-emerald-950 shadow-md">
                    <span className="block h-2.5 w-2.5 rounded-[2px] border border-gold-300/70" />
                  </span>
                </div>
                <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
              </div>

              <div className="text-center">
                <p className="font-display text-3xl font-bold text-emerald-600">
                  {Math.round(bearing)}<span className="align-top text-lg">°</span>
                </p>
                <p className={`text-xs ${c.muted}`}>from North</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <Compass size={12} /> Accurate
                </span>
                <p className={`mt-2 text-[11px] ${c.faint}`}>Makkah, Saudi Arabia</p>
              </div>

              <Link
                href="/dashboard/qibla"
                className={`mt-5 flex items-center justify-center gap-2 rounded-2xl border ${c.divider} py-3 text-sm font-semibold transition hover:border-emerald-400 hover:bg-emerald-50/40`}
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

              <ul className="mt-4 flex-1 space-y-2.5">
                {[
                  { name: 'Mishary Rashid Alafasy', region: 'Makkah, Saudi Arabia', active: true },
                  { name: 'Abdul Basit Abd us-Samad', region: 'Egypt' },
                  { name: 'Maher Al Muaiqly', region: 'Makkah, Saudi Arabia' },
                ].map((r) => (
                  <li
                    key={r.name}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
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
                    <span className={`grid h-7 w-7 place-items-center rounded-full ${r.active ? 'bg-emerald-600 text-white' : `${c.soft} text-emerald-600`}`}>
                      <Play size={12} className="ml-0.5" fill="currentColor" />
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/azan"
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-600 transition hover:border-violet-300"
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
                  <p className="text-2xl font-bold leading-tight">20 <span className={`text-sm font-medium ${c.muted}`}>minutes</span></p>
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

              <div className="mt-4 flex-1 space-y-3.5">
                <div>
                  <p className={`text-[11px] ${c.faint}`}>Next Session</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">Surah Al-Kahf (18)</span>
                    <span className={`text-[11px] ${c.muted}`}>Today, 08:00 PM</span>
                  </div>
                </div>
                <div className={`border-t ${c.divider}`} />
                <div>
                  <p className={`text-[11px] ${c.faint}`}>Last Session</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">Surah Yaseen (36)</span>
                    <span className={`text-[11px] ${c.muted}`}>Today, 06:00 AM</span>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/recitation"
                className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border ${c.divider} py-3 text-sm font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50/40`}
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
            className={`${cardCls} min-h-[360px] p-5`}
            style={!isDark ? { background: 'linear-gradient(160deg,#ffffff 0%,#fbfaff 55%,#f4f1fb 100%)' } : undefined}
          >
            {/* faint dome watermark */}
            <svg aria-hidden viewBox="0 0 120 80" className="pointer-events-none absolute right-3 top-12 w-28 opacity-[0.06]" fill="none" stroke={isDark ? '#fff' : '#5b21b6'} strokeWidth="2">
              <path d="M18 78 V40 Q18 8 60 6 Q102 8 102 40 V78" />
              <line x1="60" y1="6" x2="60" y2="-4" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDark ? '/quran-bg.png' : '/card_images/Quran_Translation_Card_image.png'}
              alt=""
              style={FADE_TL}
              className={`pointer-events-none absolute bottom-2 right-0 w-44 select-none ${isDark ? 'opacity-25' : 'opacity-90'}`}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <BookOpen size={17} />
                </span>
                <h3 className="text-base font-bold">Quran of the Day</h3>
              </div>

              <div className="mt-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold leading-tight">Surah Ar-Rahman</p>
                  <p className={`text-xs ${c.muted}`}>(55:1-3)</p>
                </div>
                <div dir="rtl" className={`font-arabic text-right text-[1.7rem] leading-[1.6] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  <p>الرَّحْمَٰنُ</p>
                  <p>عَلَّمَ الْقُرْآنَ</p>
                  <p>خَلَقَ الْإِنْسَانَ</p>
                </div>
              </div>

              <div className={`mt-4 text-[13px] leading-relaxed ${c.muted}`}>
                <p>The Most Merciful</p>
                <p>Taught the Qur&apos;an</p>
                <p>Created man</p>
              </div>

              <Link
                href="/dashboard/quran"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-600 backdrop-blur transition hover:border-violet-300"
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
            <div className="mt-4 grid grid-cols-4 gap-y-4">
              {[
                { label: 'Quran Library',  icon: BookOpen,        tint: 'text-emerald-600', bg: 'bg-emerald-100',  href: '/dashboard/quran' },
                { label: 'Bookmarks',      icon: Bookmark,        tint: 'text-amber-600',   bg: 'bg-amber-100',    href: '/dashboard/quran' },
                { label: 'Duas',           icon: Hand,            tint: 'text-violet-600',  bg: 'bg-violet-100',   href: '/dashboard/quran' },
                { label: 'Tasbih',         icon: CircleDot,       tint: 'text-rose-500',    bg: 'bg-rose-100',     href: '/dashboard/quran' },
                { label: 'Calendar',       icon: Calendar,        tint: 'text-emerald-600', bg: 'bg-emerald-100',  href: '/dashboard/prayer-times' },
                { label: 'Islamic Events', icon: Star,            tint: 'text-teal-600',    bg: 'bg-teal-100',     href: '/dashboard/prayer-times' },
                { label: 'Notes',          icon: StickyNote,      tint: 'text-amber-600',   bg: 'bg-amber-100',    href: '/dashboard/quran' },
                { label: 'More',           icon: MoreHorizontal,  tint: c.faint,            bg: isDark ? 'bg-white/[0.06]' : 'bg-emerald-900/[0.05]', href: '/dashboard/settings' },
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
          className="pointer-events-none absolute -bottom-3 right-40 hidden h-48 select-none opacity-95 lg:block"
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

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {[
              { icon: Globe,          label: 'Language',           value: LANG_LABELS[language] ?? language },
              { icon: MapPin,         label: 'Location',           value: `${loc.city}${loc.country ? `, ${loc.country}` : ''}` },
              { icon: GraduationCap,  label: 'Sect',               value: SECT_LABELS[sect] ?? sect },
              { icon: Calculator,     label: 'Calculation Method', value: methodLabel },
            ].map((p) => (
              <button
                key={p.label}
                onClick={openPrefs}
                className={`flex items-center gap-3 rounded-2xl border ${c.divider} ${c.soft} px-4 py-3 text-left transition hover:border-emerald-400`}
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
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-700/30 transition hover:bg-emerald-700"
            >
              <SlidersHorizontal size={16} /> Edit Preferences
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
