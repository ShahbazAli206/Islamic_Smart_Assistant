'use client';

/**
 * Landing-page feature showcases — Azan, Quran & Translation (with schedules),
 * and Devices. Each mirrors the matching dashboard page and is fully
 * self-contained: vector (SVG) artwork so it stays razor-sharp at any DPI,
 * animated gradient auroras + the Islamic geometric pattern for moving
 * backgrounds, and live data (azan previews, saved schedules, real audio-output
 * rescan) so the page demonstrates the product rather than just describing it.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell, BellRing, Play, Pause, Star, MapPin, ArrowRight, Sparkles,
  BookOpen, Languages, Mic2, AlarmClock, CalendarClock, Plus, Volume2,
  Headphones, Speaker, Bluetooth, RefreshCw, Smartphone, Tablet, Monitor,
  Radio, Wifi, CheckCircle2, Moon, Sunrise,
} from 'lucide-react';
import { RECITERS, TRANSLATIONS } from '@/lib/quran';
import { SURAHS } from '@/lib/surahs';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { summarize, type RecitationSchedule } from '@/lib/recitationSchedule';

/* ════════════════════════════════════════════════════════════════════════
   Shared decorative primitives
   ════════════════════════════════════════════════════════════════════════ */

/** A slow-drifting coloured aurora blob — the "moving background". */
function Aurora({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full blur-3xl pointer-events-none animate-aurora ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/** Section eyebrow + heading + subtitle, animated in on scroll. */
function SectionHead({
  chip, icon: Icon, title, subtitle, light = false, center = false,
}: {
  chip: string; icon: any; title: React.ReactNode; subtitle: string;
  light?: boolean; center?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.6 }}
      className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-3 py-1 border
          ${light
            ? 'bg-white/10 text-gold-200 border-gold-300/30 backdrop-blur'
            : 'bg-gold-100 text-gold-700 border-gold-300/40'}`}
      >
        <Icon size={13} /> {chip}
      </span>
      <h2 className={`h-display text-4xl md:text-5xl font-bold mt-4 leading-[1.08]
        ${light ? 'text-parchment' : 'text-ink'}`}>
        {title}
      </h2>
      <p className={`mt-3 text-base md:text-lg leading-relaxed
        ${light ? 'text-emerald-100/80' : 'text-ink/65'}`}>
        {subtitle}
      </p>
    </motion.div>
  );
}

/* ── Sharp vector artwork (HD at any size) ─────────────────────────────── */

/** Mosque skyline silhouette — dome flanked by two minarets. */
function MosqueSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 200" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="mosqueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* left minaret */}
      <path d="M70 200V70a8 8 0 0 1 16 0v130z" fill="url(#mosqueFill)" />
      <path d="M78 70c0-10-7-14-7-22s7-10 7-18 7 10 7 18-7 12-7 22z" fill="url(#mosqueFill)" />
      <circle cx="78" cy="26" r="4" fill="currentColor" fillOpacity="0.5" />
      {/* right minaret */}
      <path d="M434 200V70a8 8 0 0 1 16 0v130z" fill="url(#mosqueFill)" />
      <path d="M442 70c0-10-7-14-7-22s7-10 7-18 7 10 7 18-7 12-7 22z" fill="url(#mosqueFill)" />
      <circle cx="442" cy="26" r="4" fill="currentColor" fillOpacity="0.5" />
      {/* main hall + big dome */}
      <path d="M150 200v-70h220v70z" fill="url(#mosqueFill)" />
      <path d="M160 130c0-55 45-80 100-80s100 25 100 80z" fill="url(#mosqueFill)" />
      <path d="M260 50c0-14-9-18-9-28s9-14 9-22 9 12 9 22-9 14-9 28z" fill="url(#mosqueFill)" />
      <circle cx="260" cy="2" r="5" fill="currentColor" fillOpacity="0.55" />
      {/* arched doorway */}
      <path d="M240 200v-34a20 20 0 0 1 40 0v34z" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}

/** 8-point Islamic star (Khatam) — used as a turning emblem. */
function KhatamStar({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeWidth="1.4" fill="none">
        <rect x="22" y="22" width="56" height="56" transform="rotate(0 50 50)" rx="4" />
        <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" rx="4" />
        <circle cx="50" cy="50" r="38" strokeOpacity="0.45" />
        <circle cx="50" cy="50" r="14" strokeOpacity="0.7" />
      </g>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   1 · AZAN SHOWCASE
   ════════════════════════════════════════════════════════════════════════ */

type Voice = {
  id: string; name: string; subtitle: string; region: string;
  duration: string; src: string; accent: string;
};

const VOICES: Voice[] = [
  { id: 'makkah',   name: 'Makkah — Haramain',     subtitle: 'Sheikh Ali Mulla',     region: 'Saudi Arabia', duration: '4:38', src: '/audio/azan/makkah.mp3',   accent: 'from-emerald-400 to-emerald-600' },
  { id: 'madinah',  name: 'Madinah — Nabawi',      subtitle: 'Sheikh Essam Bukhari', region: 'Saudi Arabia', duration: '4:12', src: '/audio/azan/madinah.mp3',  accent: 'from-gold-300 to-gold-500' },
  { id: 'pakistan', name: 'Pakistan — Lahore',     subtitle: 'Classical style',      region: 'Pakistan',     duration: '3:58', src: '/audio/azan/pakistan.mp3', accent: 'from-rose-400 to-amber-400' },
  { id: 'turkey',   name: 'Türkiye — Istanbul',    subtitle: 'Hafiz Mustafa Özcan',  region: 'Türkiye',      duration: '4:21', src: '/audio/azan/turkey.mp3',   accent: 'from-cyan-400 to-indigo-500' },
  { id: 'egypt',    name: 'Egypt — Cairo',         subtitle: 'Maqam style',          region: 'Egypt',        duration: '4:46', src: '/audio/azan/egypt.mp3',    accent: 'from-fuchsia-400 to-rose-400' },
];

export function AzanShowcase() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = (v: Voice) => {
    const el = audioRef.current;
    if (!el) return;
    if (activeId === v.id) { el.pause(); setActiveId(null); return; }
    el.src = v.src;
    el.play().then(() => setActiveId(v.id)).catch(() => setActiveId(null));
  };

  return (
    <section id="azan" className="relative overflow-hidden bg-mosque-gradient text-parchment">
      {/* moving background layers */}
      <div className="absolute inset-0 pattern-bg opacity-[0.18] pointer-events-none" />
      <Aurora className="w-[34rem] h-[34rem] bg-emerald-400/25 -top-40 -left-32" />
      <Aurora className="w-[30rem] h-[30rem] bg-gold-400/20 top-20 -right-32" delay={4} />
      <MosqueSilhouette className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(900px,95%)] text-gold-200/70 animate-float-y" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            light
            chip="Azan Library"
            icon={BellRing}
            title={<>The call to prayer,<br /><span className="bg-clip-text text-transparent bg-gold-gradient">in every voice you love.</span></>}
            subtitle="Authentic Adhan from the world's great mosques — auto-played on every linked device the moment a prayer time arrives."
          />
          <Link href="/dashboard/azan" className="btn-primary shrink-0">
            <Bell size={18} /> Explore voices <ArrowRight size={16} />
          </Link>
        </div>

        {/* live "Auto-Azan ON" pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/15 backdrop-blur px-4 py-2 text-sm"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
          </span>
          Auto-Azan synced & ready — next at <strong className="text-gold-200">Maghrib</strong>
        </motion.div>

        {/* voice cards */}
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {VOICES.map((v, i) => {
            const playing = activeId === v.id;
            return (
              <motion.button
                key={v.id}
                onClick={() => toggle(v)}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className={`group relative overflow-hidden rounded-2xl p-5 text-left border transition
                  ${playing
                    ? 'bg-white/15 border-gold-300/60 shadow-glow-gold'
                    : 'bg-white/[0.07] border-white/12 hover:bg-white/[0.12] hover:border-white/25 backdrop-blur'}`}
              >
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${v.accent} opacity-25 group-hover:opacity-45 transition`} />
                {/* equalizer / icon */}
                <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${v.accent} text-midnight-900 shadow-lg`}>
                  {playing ? (
                    <span className="flex items-end gap-[3px] h-5">
                      {[0, 1, 2, 3].map((b) => (
                        <motion.span
                          key={b}
                          className="w-[3px] rounded-full bg-midnight-900"
                          animate={{ height: ['30%', '100%', '45%', '90%', '30%'] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: b * 0.12, ease: 'easeInOut' }}
                          style={{ height: '30%' }}
                        />
                      ))}
                    </span>
                  ) : (
                    <Bell size={22} />
                  )}
                </div>

                <h3 className="relative mt-4 font-bold text-[15px] leading-tight">{v.name}</h3>
                <p className="relative text-sm text-emerald-100/70">{v.subtitle}</p>
                <p className="relative mt-1 text-xs text-emerald-100/50 flex items-center gap-1">
                  <MapPin size={11} /> {v.region} · {v.duration}
                </p>

                <span className={`relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition
                  ${playing ? 'bg-gold-300 text-midnight-900' : 'bg-white/12 text-parchment group-hover:bg-white/20'}`}>
                  {playing ? <><Pause size={13} /> Playing…</> : <><Play size={13} /> Preview</>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <audio ref={audioRef} onEnded={() => setActiveId(null)} hidden />
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   2 · QURAN · TRANSLATION · SCHEDULES
   ════════════════════════════════════════════════════════════════════════ */

// Languages with native script, derived from the real TRANSLATIONS catalogue.
const LANGS = [
  { code: 'en', label: 'English',  native: 'English',  flag: '🇬🇧' },
  { code: 'ur', label: 'Urdu',     native: 'اردو',      flag: '🇵🇰' },
  { code: 'ar', label: 'Arabic',   native: 'العربية',   flag: '🇸🇦' },
  { code: 'tr', label: 'Turkish',  native: 'Türkçe',    flag: '🇹🇷' },
  { code: 'zh', label: 'Chinese',  native: '中文',       flag: '🇨🇳' },
  { code: 'fr', label: 'French',   native: 'Français',  flag: '🇫🇷' },
  { code: 'bn', label: 'Bengali',  native: 'বাংলা',     flag: '🇧🇩' },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa', flag: '🇮🇩' },
  { code: 'ja', label: 'Japanese', native: '日本語',     flag: '🇯🇵' },
];

// Friendly sample schedules shown when the user hasn't made any yet.
const SAMPLE_SCHEDULES = [
  { title: 'Surah Yaseen', when: 'Every day · after Fajr', icon: Sunrise, accent: 'from-amber-400 to-gold-500' },
  { title: 'Surah Al-Mulk', when: 'Every night · before sleep', icon: Moon, accent: 'from-indigo-400 to-violet-500' },
  { title: 'Surah Al-Kahf', when: 'Every Friday · morning', icon: BookOpen, accent: 'from-emerald-400 to-teal-500' },
];

export function QuranShowcase() {
  const [schedules] = useLocalStorage<RecitationSchedule[]>('isa:recitationSchedules', []);
  const userSchedules = schedules.slice(0, 3);
  const hasUserSchedules = userSchedules.length > 0;

  return (
    <section id="quran" className="relative overflow-hidden">
      {/* moving background */}
      <Aurora className="w-[30rem] h-[30rem] bg-emerald-300/30 top-0 -left-40" />
      <Aurora className="w-[28rem] h-[28rem] bg-gold-300/25 bottom-0 -right-32" delay={5} />
      <KhatamStar className="absolute top-24 right-10 w-64 h-64 text-emerald-500/10 animate-spin-slow hidden lg:block" />
      <KhatamStar className="absolute -bottom-10 left-6 w-44 h-44 text-gold-500/10 animate-spin-rev hidden lg:block" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
        <SectionHead
          center
          chip="Holy Quran"
          icon={BookOpen}
          title={<>Recite, translate &<br /><span className="bg-clip-text text-transparent bg-gold-gradient">schedule your daily wird.</span></>}
          subtitle="All 114 Surahs by seven world-renowned Qaris, spoken translations in many languages, and gentle recurring recitation alarms — set once, hear them forever."
        />

        {/* translation languages — marquee ribbon */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative mt-12 overflow-hidden rounded-2xl border border-emerald-100/70 bg-white/60 backdrop-blur py-5"
        >
          <div className="flex items-center gap-2 px-5 mb-3 text-sm font-semibold text-emerald-800">
            <Languages size={16} /> Translations & UI in {LANGS.length}+ languages
          </div>
          <div className="relative flex">
            {/* fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />
            <div className="flex gap-3 animate-marquee whitespace-nowrap pr-3">
              {[...LANGS, ...LANGS].map((l, i) => (
                <span
                  key={`${l.code}-${i}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2.5 shadow-sm shrink-0"
                >
                  <span className="text-lg leading-none">{l.flag}</span>
                  <span className="font-arabic text-lg text-emerald-900" style={{ direction: 'ltr' }}>{l.native}</span>
                  <span className="text-xs text-ink/50">{l.label}</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-10 grid lg:grid-cols-5 gap-6">
          {/* Reciters panel */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
            className="lg:col-span-2 card card-pad relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 opacity-15" />
            <div className="flex items-center gap-2 mb-4">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
                <Mic2 size={18} />
              </span>
              <div>
                <h3 className="font-bold leading-tight">{RECITERS.length} world-class Qaris</h3>
                <p className="text-xs text-ink/55">Murattal, ayah-by-ayah, full surah</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {RECITERS.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-emerald-50/70 transition"
                >
                  <span className="text-sm font-medium text-ink">{r.name}</span>
                  <span className="font-arabic text-lg text-emerald-700">{r.arabic}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Schedules panel */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 card card-pad relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 opacity-15" />
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-midnight-900 flex items-center justify-center shadow-md">
                  <AlarmClock size={18} />
                </span>
                <div>
                  <h3 className="font-bold leading-tight">
                    {hasUserSchedules ? 'Your recitation schedule' : 'Recitation alarms'}
                  </h3>
                  <p className="text-xs text-ink/55">
                    {hasUserSchedules
                      ? `${schedules.length} active · plays automatically`
                      : 'Auto-recite Surahs at the times you choose'}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/recitation"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white text-sm font-semibold px-4 py-2 shadow-glow-emerald hover:bg-emerald-700 transition shrink-0"
              >
                <Plus size={15} /> New schedule
              </Link>
            </div>

            <div className="space-y-2.5">
              {hasUserSchedules
                ? userSchedules.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white/70 p-3.5"
                    >
                      <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CalendarClock size={17} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink truncate">{summarize(s)}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.surahs.slice(0, 4).map((n) => (
                            <span key={n} className="text-[11px] bg-emerald-50 text-emerald-800 rounded-full px-2 py-0.5 border border-emerald-100">
                              {SURAHS.find((x) => x.number === n)?.englishName ?? `Surah ${n}`}
                            </span>
                          ))}
                          {s.surahs.length > 4 && (
                            <span className="text-[11px] text-ink/50">+{s.surahs.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.enabled ? 'bg-emerald-500 animate-pulse-soft' : 'bg-slate-300'}`} />
                    </motion.div>
                  ))
                : SAMPLE_SCHEDULES.map((s, i) => (
                    <motion.div
                      key={s.title}
                      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-white/50 p-3.5"
                    >
                      <span className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shrink-0 shadow`}>
                        <s.icon size={17} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-ink">{s.title}</p>
                        <p className="text-xs text-ink/55">{s.when}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 border border-emerald-100">
                        Suggested
                      </span>
                    </motion.div>
                  ))}
            </div>

            {!hasUserSchedules && (
              <p className="mt-3 text-xs text-ink/50 flex items-center gap-1.5">
                <Sparkles size={12} className="text-gold-500" />
                Tap “New schedule” to set your own — these are just ideas to start with.
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   3 · DEVICES & OUTPUTS
   ════════════════════════════════════════════════════════════════════════ */

const SAMPLE_DEVICES = [
  { name: 'iPhone 15',    owner: 'Home',   icon: Smartphone, status: 'playing', accent: 'from-emerald-400 to-emerald-600' },
  { name: 'iPad Pro',     owner: 'Home',   icon: Tablet,     status: 'online',  accent: 'from-cyan-400 to-emerald-500' },
  { name: 'Macbook Pro',  owner: 'Office', icon: Monitor,    status: 'online',  accent: 'from-indigo-400 to-violet-500' },
  { name: 'Echo Dot',     owner: 'Kitchen',icon: Speaker,    status: 'idle',    accent: 'from-slate-400 to-slate-600' },
];

/** Concentric broadcast rings that pulse outward. */
function BroadcastRings() {
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute w-24 h-24 rounded-full border border-cyan-300/40 animate-ring"
          style={{ animationDelay: `${i * 1.1}s` }}
        />
      ))}
    </span>
  );
}

export function DevicesShowcase() {
  const [outputLabel] = useLocalStorage<string>('isa:audioOutputLabel', 'System default');
  const [scanning, setScanning] = useState(false);
  const [outCount, setOutCount] = useState<number | null>(null);

  const rescan = async () => {
    setScanning(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setOutCount(devs.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications').length);
      } else {
        setOutCount(0);
      }
    } catch {
      setOutCount(0);
    } finally {
      // brief spin so the gesture reads as a real action
      setTimeout(() => setScanning(false), 600);
    }
  };

  return (
    <section id="devices" className="relative overflow-hidden bg-gradient-to-b from-midnight-800 to-midnight-900 text-parchment">
      <div className="absolute inset-0 pattern-bg opacity-[0.12] pointer-events-none" />
      <Aurora className="w-[32rem] h-[32rem] bg-cyan-400/20 -top-32 right-0" />
      <Aurora className="w-[28rem] h-[28rem] bg-indigo-500/20 bottom-0 -left-24" delay={6} />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            light
            chip="Connected everywhere"
            icon={Radio}
            title={<>One tap, every speaker<br /><span className="bg-clip-text text-transparent bg-gold-gradient">in your home answers.</span></>}
            subtitle="Route Azan and Quran to your earbuds, a Bluetooth speaker, the whole house — phones, tablets, desktops and smart speakers, kept in sync."
          />
          <Link href="/dashboard/devices" className="btn-primary shrink-0">
            <Speaker size={18} /> Manage devices <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-10 grid lg:grid-cols-5 gap-6">
          {/* Audio output control */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
            className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white/[0.07] border border-white/12 backdrop-blur p-6"
          >
            <div className="relative h-24 mb-2">
              <BroadcastRings />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-2xl bg-gold-gradient text-midnight-900 flex items-center justify-center shadow-glow-gold">
                  <Volume2 size={28} />
                </span>
              </span>
            </div>
            <p className="text-xs text-emerald-100/60 uppercase tracking-widest text-center">Current output</p>
            <p className="font-bold text-lg text-center mt-0.5">{outputLabel}</p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={rescan}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/20 text-sm font-semibold py-2.5 transition"
              >
                <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'Scanning…' : 'Rescan outputs'}
              </button>
              {outCount !== null && !scanning && (
                <p className="text-center text-xs text-emerald-100/70">
                  {outCount > 0
                    ? <><CheckCircle2 size={12} className="inline mr-1 text-emerald-300" />{outCount} audio output{outCount === 1 ? '' : 's'} detected</>
                    : 'Open in Chrome/Edge & connect a device to detect outputs'}
                </p>
              )}
              <Link
                href="/dashboard/devices"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium py-2.5 transition text-emerald-100/80"
              >
                <Bluetooth size={15} /> Pair Bluetooth…
              </Link>
            </div>
          </motion.div>

          {/* Devices grid */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 grid sm:grid-cols-2 gap-4 content-start"
          >
            {SAMPLE_DEVICES.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-2xl bg-white/[0.07] border border-white/12 backdrop-blur p-5"
              >
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${d.accent} opacity-25`} />
                <div className="relative flex items-start justify-between">
                  <span className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-white bg-gradient-to-br ${d.accent} shadow-md`}>
                    <d.icon size={20} />
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                    ${d.status === 'playing' ? 'bg-emerald-400/20 text-emerald-200'
                      : d.status === 'online' ? 'bg-cyan-400/15 text-cyan-200'
                      : 'bg-white/10 text-emerald-100/60'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'idle' ? 'bg-slate-300' : 'bg-emerald-300 animate-pulse-soft'}`} />
                    {d.status}
                  </span>
                </div>
                <h3 className="relative mt-4 font-bold">{d.name}</h3>
                <p className="relative text-sm text-emerald-100/60 flex items-center gap-1.5 mt-0.5">
                  <Wifi size={12} /> {d.owner}
                </p>
              </motion.div>
            ))}

            {/* smart-speaker integrations strip */}
            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              {['Amazon Alexa', 'Google Home', 'Chromecast', 'AirPlay'].map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3.5 py-1.5 text-xs font-medium text-emerald-100/75">
                  <Headphones size={12} /> {s}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
