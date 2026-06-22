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
// showing a hard edge — solid at the bottom-right corner, fading top-left.
const FADE_TL = {
  WebkitMaskImage: 'linear-gradient(to top left, black 30%, transparent 78%)',
  maskImage: 'linear-gradient(to top left, black 30%, transparent 78%)',
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
    return total > 0 ? Math.min(100, Math.max(3, (elapsed / total) * 100)) : 0;
  }, [data, next, currentName, now]);

  const bearing = byCoords ? qiblaBearing(loc.lat!, loc.lng!) : 256;
  const methodLabel = METHOD_LABELS[methodRaw >= 0 ? methodRaw : 3] ?? 'Muslim World League';
  const openPrefs = () => window.dispatchEvent(new Event('isa:edit-prefs'));

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const c = isDark
    ? {
        text: 'text-parchment', muted: 'text-parchment/60', faint: 'text-parchment/45',
        card: 'bg-midnight-800/80 border border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]',
        soft: 'bg-white/[0.04] border border-white/10',
        divider: 'border-white/10',
        search: 'bg-white/[0.06] border-white/10 text-parchment placeholder:text-parchment/40',
        kbd: 'bg-white/10 text-parchment/55',
        track: 'bg-white/10',
      }
    : {
        text: 'text-emerald-950', muted: 'text-emerald-900/55', faint: 'text-emerald-900/40',
        card: 'bg-white border border-emerald-900/[0.05] shadow-[0_1px_3px_rgba(16,40,30,0.04),0_16px_38px_-18px_rgba(16,40,30,0.18)]',
        soft: 'bg-emerald-50/40 border border-emerald-900/[0.06]',
        divider: 'border-emerald-900/[0.08]',
        search: 'bg-white border-emerald-900/[0.06] text-emerald-950 placeholder:text-emerald-900/40 shadow-[0_1px_3px_rgba(16,40,30,0.04),0_10px_24px_-14px_rgba(16,40,30,0.18)]',
        kbd: 'bg-emerald-900/[0.05] text-emerald-900/45',
        track: 'bg-emerald-900/[0.07]',
      };
  const cardCls = `relative overflow-hidden rounded-[26px] ${c.card}`;

  const rootCls = isDark
    ? `-m-5 sm:-m-8 p-5 sm:p-8 min-h-screen space-y-5 ${c.text}`
    : `space-y-5 ${c.text}`;
  const rootStyle = isDark
    ? { background: 'radial-gradient(1000px 520px at 12% -12%, rgba(16,185,129,0.07), transparent 60%), linear-gradient(180deg,#0a1c14 0%,#07140e 100%)' }
    : undefined;

  return (
    <div className={rootCls} style={rootStyle}>
      {/* ─────────── First section: full-bleed mosque banner behind the
          search/status bar, greeting and verse card. The photo is always a
          light scene, so text colours inside are hardcoded light-on-image
          (independent of the dark/light theme). ─────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden -mt-5 -mx-5 sm:-mt-8 sm:-mx-8"
      >
        {/* full-cover background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/overview_first_section_bg_image.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        <div className="relative p-5 sm:p-6">
          {/* top bar: centered search + right-aligned status */}
          <div className="relative flex flex-col gap-4 sm:block">
            <div className="mx-auto w-full sm:max-w-[560px]">
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2.5 text-emerald-950 backdrop-blur-sm shadow-[0_1px_3px_rgba(16,40,30,0.06),0_10px_24px_-14px_rgba(16,40,30,0.25)]">
                <Search size={18} className="text-emerald-900/40" />
                <input placeholder="Search anything..." className="flex-1 bg-transparent text-sm text-emerald-950 placeholder:text-emerald-900/40 focus:outline-none" />
                <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-900/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-emerald-900/45">Ctrl /</span>
                <button aria-label="Search" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-700/30 hover:bg-emerald-700 transition">
                  <Search size={15} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 text-emerald-950 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
              <div className="flex items-center gap-5 rounded-2xl border border-white/60 bg-white/50 px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">{loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                    <p className="text-[11px] text-emerald-900/55">{data?.hijriDate ?? '—'}</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Sun size={18} className="text-amber-500" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">18°C</p>
                    <p className="text-[11px] text-emerald-900/55">Clear</p>
                  </div>
                </div>
              </div>
              <button onClick={() => window.dispatchEvent(new Event('isa:open-profile'))} className="relative shrink-0" aria-label="Open profile">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold ring-2 ring-white shadow-md">
                  {name ? name.trim().charAt(0).toUpperCase() : <User size={20} />}
                </span>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* hero content: greeting (top-left, three lines) + verse card */}
          <div className="mt-8 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_minmax(0,560px)]">
          {/* greeting — light translucent panel behind just this text block */}
          <div className="w-fit rounded-2xl bg-white/50 px-4 py-3 backdrop-blur-sm">
            <h1 className="h-display text-3xl sm:text-4xl font-bold leading-[1.05] text-emerald-950">
              Assalamu Alaikum, <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-900/80">
              May Allah bless your day<br />and ease your journey.
            </p>
          </div>

          {/* verse glass card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-5 pr-[48%] backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
            {/* Quran-on-rehal image fills the right ~50% of the card, shown
                clearly; only the inner edge is softly faded into the card. */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quran-bg-overview-page.png"
                alt=""
                className="h-full w-full select-none object-cover"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 16%)', maskImage: 'linear-gradient(to right, transparent 0%, black 16%)' }}
              />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">۲۸</span>
                <p dir="rtl" className="font-arabic text-2xl leading-snug text-emerald-900">أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</p>
              </div>
              <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-emerald-950">
                Verily, in the remembrance of Allah do hearts find rest.
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-800/70">Surah Ar-Ra&apos;d (13:28)</p>
            </div>
          </div>
          </div>
        </div>
      </motion.section>

      {/* ─────────────────── Main grid: left stack + right rail ─────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* LEFT */}
        <div className="min-w-0 space-y-5">
          {/* Row 1 — Prayer Times + Countdown */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
            {/* Prayer Times */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${cardCls} p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600"><Clock size={20} /></span>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">Prayer Times</h2>
                    <p className={`text-xs ${c.muted}`}>Today, {data?.hijriDate ?? '—'}</p>
                  </div>
                </div>
                <ChevronDown size={18} className={c.faint} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {ORDER.map((p) => {
                  const meta = PRAYER_META[p];
                  const t = to12h(data?.timings[p]);
                  const active = currentName === p;
                  return (
                    <div
                      key={p}
                      className={`relative flex flex-col items-center rounded-2xl border py-3.5 px-1 text-center transition ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-[0_10px_22px_-10px_rgba(5,150,105,0.7)]'
                          : `${c.divider} ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`
                      }`}
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-white/20' : meta.badge}`}>
                        <meta.icon size={18} className={active ? 'text-white' : meta.tint} />
                      </span>
                      <p className={`mt-2 text-[11px] font-medium ${active ? 'text-white/85' : c.muted}`}>{p}</p>
                      <p className="mt-1 text-base font-bold tabular-nums leading-none">{t.hm}</p>
                      <p className={`mt-1 text-[10px] font-semibold ${active ? 'text-white/70' : c.faint}`}>{t.ap}</p>
                      {active && <span className="absolute bottom-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-white/80" />}
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

            {/* Countdown — "{current} Time Left" (green-tinted) */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className={`relative overflow-hidden rounded-[26px] border p-5 ${isDark ? 'border-white/10' : 'border-emerald-200/60'}`}
              style={{ background: isDark
                ? 'linear-gradient(150deg,#103a2c 0%,#0c2c21 100%)'
                : 'linear-gradient(150deg,#eafaf1 0%,#e2f5ee 55%,#dbf1ec 100%)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/masjid_img.png" alt="" style={FADE_TL} className="pointer-events-none absolute bottom-0 right-0 w-52 select-none opacity-95" />
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600/15 text-emerald-600"><Moon size={17} /></span>
                  <div>
                    <h2 className="text-base font-bold leading-tight">{currentName ?? 'Prayer'} Time Left</h2>
                    <p className={`text-xs ${c.muted}`}>Stay mindful of your time</p>
                  </div>
                </div>

                <p className="mt-7 font-display text-[3.25rem] font-bold tabular-nums leading-none text-emerald-700">
                  {next ? formatCountdown(next.inMs) : '--:--:--'}
                </p>

                <div className={`mt-5 h-2 w-4/5 rounded-full ${isDark ? 'bg-white/10' : 'bg-emerald-900/[0.08]'} overflow-hidden`}>
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.6 }} />
                </div>
                <p className={`mt-2.5 text-xs ${c.muted}`}>
                  Ends at {next ? next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '—'}
                </p>
              </div>
            </motion.section>
          </div>

          {/* Row 2 — Qibla + Azan + Recitation */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Qibla Direction — photographic dark card */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="relative flex flex-col overflow-hidden rounded-[26px] p-5 text-white shadow-[0_16px_38px_-18px_rgba(16,40,30,0.5)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(7,40,28,0.78) 0%,rgba(6,28,20,0.88) 100%)' }} />
              <div className="relative flex flex-1 flex-col">
                <h3 className="text-base font-bold leading-tight">Qibla Direction</h3>
                <p className="text-xs text-white/65">Find the direction of the Kaaba</p>

                <div className="relative mx-auto my-6 h-40 w-40">
                  <div className="absolute inset-0 rounded-full border border-white/25 bg-white/[0.06] backdrop-blur-sm" />
                  <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
                    {Array.from({ length: 72 }).map((_, i) => {
                      const major = i % 9 === 0;
                      const a = (i * 5 * Math.PI) / 180;
                      const r1 = 76, r2 = major ? 66 : 71;
                      return <line key={i}
                        x1={80 + r1 * Math.sin(a)} y1={80 - r1 * Math.cos(a)}
                        x2={80 + r2 * Math.sin(a)} y2={80 - r2 * Math.cos(a)}
                        stroke="rgba(255,255,255,0.45)" strokeWidth={major ? 1.6 : 0.7} />;
                    })}
                  </svg>
                  <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-bold text-white/80">N</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/80">E</span>
                  <span className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[11px] font-bold text-white/80">S</span>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/80">W</span>
                  <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
                    <div className="absolute left-1/2 top-[18px] h-0 w-0 -translate-x-1/2 border-x-[8px] border-b-[30px] border-x-transparent border-b-emerald-400" />
                  </div>
                  {/* Kaaba at center */}
                  <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[5px] bg-midnight-900 shadow-lg ring-1 ring-gold-400/50">
                    <span className="block h-3.5 w-3.5 rounded-[2px] border border-gold-300/80" />
                  </span>
                </div>

                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">{Math.round(bearing)}<span className="align-top text-lg">°</span></p>
                  <p className="text-xs text-white/65">from North</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                    <Compass size={12} /> Accurate
                  </span>
                  <p className="mt-2 text-[11px] text-white/55">Makkah, Saudi Arabia</p>
                </div>

                <Link href="/dashboard/qibla" className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                  <MapPin size={15} /> View on Map
                </Link>
              </div>
            </motion.section>

            {/* Azan Voices */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${cardCls} p-5 flex flex-col`}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-500"><Bell size={18} /></span>
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
                  <li key={r.name} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${r.active ? 'bg-emerald-50 ring-1 ring-emerald-300/60' : `border ${c.divider}`}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white"><User size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-tight">{r.name}</p>
                      <p className={`truncate text-[11px] ${c.faint}`}>{r.region}</p>
                    </div>
                    <span className={`grid h-7 w-7 place-items-center rounded-full ${r.active ? 'bg-emerald-600 text-white' : `${c.soft} text-emerald-600`}`}><Play size={12} className="ml-0.5" fill="currentColor" /></span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/azan" className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 py-3 text-sm font-semibold text-violet-600 transition hover:border-violet-300">
                <Bell size={15} /> View All Voices
              </Link>
            </motion.section>

            {/* Recitation Scheduler */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className={`${cardCls} p-5 flex flex-col`}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><BookOpen size={18} /></span>
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
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 15.5}`} strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - 0.6)}`} />
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
              <Link href="/dashboard/recitation" className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border ${c.divider} py-3 text-sm font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50/40`}>
                <Calendar size={15} /> Open Scheduler
              </Link>
            </motion.section>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="space-y-5">
          {/* Quran of the Day (purple-tinted) */}
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className={`relative min-h-[360px] overflow-hidden rounded-[26px] border p-5 ${isDark ? 'border-white/10' : 'border-violet-200/60'}`}
          >
            {/* full-bleed background: soft mosque-and-flowers artwork (darkened in dark mode) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/overview_page_bg-1.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              style={{ filter: isDark ? 'brightness(0.4) saturate(1.1)' : 'none' }}
            />
            {/* readability wash so the verse stays legible over the art */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: isDark
                ? 'linear-gradient(160deg,rgba(26,20,48,0.78) 0%,rgba(26,20,48,0.62) 100%)'
                : 'linear-gradient(120deg,rgba(255,255,255,0.62) 0%,rgba(255,255,255,0.32) 50%,rgba(255,255,255,0.12) 100%)' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-200/70 text-violet-700"><BookOpen size={17} /></span>
                <h3 className="text-base font-bold">Quran of the Day</h3>
              </div>
              <div className="mt-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold leading-tight">Surah Ar-Rahman</p>
                  <p className={`text-xs ${c.muted}`}>(55:1-3)</p>
                </div>
                <div dir="rtl" className={`font-arabic text-right text-[1.7rem] leading-[1.6] ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
                  <p>الرَّحْمَٰنُ</p><p>عَلَّمَ الْقُرْآنَ</p><p>خَلَقَ الْإِنْسَانَ</p>
                </div>
              </div>
              <div className={`mt-4 text-[13px] leading-relaxed ${c.muted}`}>
                <p>The Most Merciful</p><p>Taught the Qur&apos;an</p><p>Created man</p>
              </div>
              <Link href="/dashboard/quran" className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-violet-300/70 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-700 backdrop-blur transition hover:bg-white">
                <BookOpen size={15} /> Read More
              </Link>
            </div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${cardCls} p-5`}>
            <h3 className="text-base font-bold">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-4 gap-y-4">
              {[
                { label: 'Quran Library',  icon: BookOpen,       tint: 'text-emerald-600', bg: 'bg-emerald-100', href: '/dashboard/quran' },
                { label: 'Bookmarks',      icon: Bookmark,       tint: 'text-amber-600',   bg: 'bg-amber-100',   href: '/dashboard/quran' },
                { label: 'Duas',           icon: Hand,           tint: 'text-violet-600',  bg: 'bg-violet-100',  href: '/dashboard/quran' },
                { label: 'Tasbih',         icon: CircleDot,      tint: 'text-rose-500',    bg: 'bg-rose-100',    href: '/dashboard/quran' },
                { label: 'Calendar',       icon: Calendar,       tint: 'text-emerald-600', bg: 'bg-emerald-100', href: '/dashboard/prayer-times' },
                { label: 'Islamic Events', icon: Star,           tint: 'text-teal-600',    bg: 'bg-teal-100',    href: '/dashboard/prayer-times' },
                { label: 'Notes',          icon: StickyNote,     tint: 'text-amber-600',   bg: 'bg-amber-100',   href: '/dashboard/quran' },
                { label: 'More',           icon: MoreHorizontal, tint: c.faint,            bg: isDark ? 'bg-white/[0.06]' : 'bg-emerald-900/[0.05]', href: '/dashboard/settings' },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-1.5 text-center">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${a.bg} transition group-hover:scale-105`}><a.icon size={20} className={a.tint} /></span>
                  <span className={`text-[10px] font-medium leading-tight ${c.muted}`}>{a.label}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        </div>
      </div>

      {/* ───────────────────────── Your Preferences ───────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={`${cardCls} p-5`}
        style={{
          backgroundImage: 'url(/OverviewPage_your_preference_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-100 text-gold-600"><Star size={18} /></span>
            <div>
              <h3 className="text-lg font-bold leading-tight">Your Preferences</h3>
              <p className={`text-xs ${c.muted}`}>Customize your experience</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {[
              { icon: Globe,         label: 'Language',           value: LANG_LABELS[language] ?? language },
              { icon: MapPin,        label: 'Location',           value: `${loc.city}${loc.country ? `, ${loc.country}` : ''}` },
              { icon: GraduationCap, label: 'Sect',               value: SECT_LABELS[sect] ?? sect },
              { icon: Calculator,    label: 'Calculation Method', value: methodLabel },
            ].map((p) => (
              <button key={p.label} onClick={openPrefs} className={`flex items-center gap-3 rounded-2xl border ${c.divider} ${c.soft} px-4 py-3 text-left transition hover:border-emerald-400`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><p.icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] ${c.faint}`}>{p.label}</p>
                  <p className="truncate text-sm font-semibold">{p.value}</p>
                </div>
                <ChevronDown size={15} className={c.faint} />
              </button>
            ))}
            <button onClick={openPrefs} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-700/30 transition hover:bg-emerald-700">
              <SlidersHorizontal size={16} /> Edit Preferences
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
