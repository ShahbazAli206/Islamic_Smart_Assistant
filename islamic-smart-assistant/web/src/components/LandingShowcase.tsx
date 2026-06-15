'use client';

/**
 * Landing-page feature showcases — Azan, Quran & Translation (with schedules),
 * and Devices. Each mirrors the matching dashboard page and is fully
 * self-contained: vector (SVG) artwork so it stays razor-sharp at any DPI,
 * animated gradient auroras + the Islamic geometric pattern for moving
 * backgrounds, and live data (azan previews, saved schedules, real audio-output
 * rescan) so the page demonstrates the product rather than just describing it.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell, BellRing, Play, Pause, MapPin, ArrowRight, Sparkles,
  BookOpen, Languages, Plus, Volume2,
  Headphones, Speaker, Bluetooth, RefreshCw, Smartphone, Tablet, Monitor,
  Radio, Wifi, CheckCircle2, Moon,
  Globe2, BellPlus, Users, Bookmark, Sun,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';

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
   2 · QURAN EXPERIENCE — recite · reflect · transform
   ──────────────────────────────────────────────────────────────────────
   Hero (illustrated Quran-on-rehal scene + a floating ayah card) → the
   translation-languages bar → the World-Class Qaris and Recitation Alarms
   panels → a closing feature strip. The hero artwork is pure CSS + SVG so it
   stays razor-sharp, works offline, and a real photo can later drop straight
   into <RehalScene/> without disturbing the surrounding layout.
   ════════════════════════════════════════════════════════════════════════ */

// Headline stats beneath the hero copy (icon · value · caption).
const HERO_STATS = [
  { icon: BookOpen, value: '114 Surahs',    caption: 'Complete Quran' },
  { icon: Globe2,   value: '10+ Languages', caption: 'Translations & UI' },
  { icon: BellPlus, value: 'Smart Alarms',  caption: 'Never Miss a Word' },
];

// Translation / UI languages — 2-letter code, native script, English label and
// a Tailwind gradient for the code badge. (Flag emoji render as plain letters
// on Windows, so coloured code badges are used instead — identical everywhere.)
const LANGUAGES = [
  { code: 'EN', native: 'English',  label: 'English', rtl: false, accent: 'from-blue-500 to-indigo-600' },
  { code: 'AR', native: 'العربية',  label: 'Arabic',  rtl: true,  accent: 'from-emerald-500 to-teal-600' },
  { code: 'UR', native: 'اردو',     label: 'Urdu',    rtl: true,  accent: 'from-green-500 to-emerald-600' },
  { code: 'TR', native: 'Türkçe',   label: 'Turkish', rtl: false, accent: 'from-red-500 to-rose-600' },
  { code: 'ZH', native: '中文',      label: 'Chinese', rtl: false, accent: 'from-rose-600 to-red-700' },
  { code: 'FR', native: 'Français', label: 'French',  rtl: false, accent: 'from-indigo-500 to-violet-600' },
  { code: 'BN', native: 'বাংলা',    label: 'Bengali', rtl: false, accent: 'from-orange-500 to-amber-600' },
  { code: 'FA', native: 'فارسی',    label: 'Persian', rtl: true,  accent: 'from-teal-500 to-emerald-600' },
  { code: 'MS', native: 'Melayu',   label: 'Malay',   rtl: false, accent: 'from-lime-600 to-yellow-600' },
];

// Featured reciters (English + Arabic name). `edition` is the islamic.network
// CDN identifier used to stream a short Surah Al-Fatiha preview; unknown
// editions simply fail silently (the button resets) so a row never plays the
// wrong voice. `accent` themes the avatar tile.
const QARIS = [
  { name: 'Abdul Basit Abdul Samad',  arabic: 'عبد الباسط عبد الصمد', edition: 'ar.abdulbasitmurattal', accent: 'from-emerald-500 to-emerald-700' },
  { name: 'Mishary Rashid Alafasy',   arabic: 'مشاري بن راشد العفاسي', edition: 'ar.alafasy',           accent: 'from-gold-400 to-gold-600' },
  { name: 'Mahmoud Khalil Al Husary', arabic: 'محمود خليل الحصري',    edition: 'ar.husary',            accent: 'from-cyan-500 to-emerald-600' },
  { name: 'Saad Al-Ghamdi',           arabic: 'سعد الغامدي',          edition: 'ar.saadalghamadi',     accent: 'from-amber-500 to-rose-500' },
  { name: 'Ahmed Al Ajmi',            arabic: 'أحمد العجمي',          edition: 'ar.ahmedajamy',        accent: 'from-violet-500 to-indigo-600' },
];

// Sample recitation alarms — `tint` colours the glyph on its dark glass tile.
const ALARMS = [
  { icon: Sun,      time: '05:30 AM', surah: 'Surah Yaseen',  when: 'Every day after Fajr',    tint: 'text-amber-300' },
  { icon: Moon,     time: '09:00 PM', surah: 'Surah Al-Mulk', when: 'Every night before sleep', tint: 'text-indigo-300' },
  { icon: BookOpen, time: '06:00 AM', surah: 'Surah Al-Kahf', when: 'Every Friday morning',    tint: 'text-emerald-300' },
];

// Closing feature strip.
const QURAN_FEATURES = [
  { icon: BookOpen,   title: 'Authentic Recitations', desc: 'By world-renowned Qaris' },
  { icon: Languages,  title: 'Accurate Translations', desc: 'In 10+ global languages' },
  { icon: Headphones, title: 'Crystal-Clear Audio',   desc: 'High quality & offline ready' },
  { icon: Bookmark,   title: 'Smart Bookmarks',       desc: 'Save, continue, reflect' },
  { icon: Moon,       title: 'Dark & Light Mode',     desc: 'Comfort for every reader' },
];

// 192 kbps surah recitations on the public islamic.network CDN (open tier).
const QURAN_AUDIO_CDN = 'https://cdn.islamic.network/quran/audio-surah/192';

/**
 * Warm, softly-lit scene of an open Quran on a wooden rehal (X-stand), built
 * entirely from CSS gradients + SVG so it stays razor-sharp and works offline.
 */
function RehalScene({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl ${className}`}>
      {/* deep interior + a warm pool of light */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 28%, #1c3d30 0%, #0f2920 46%, #08160f 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(46% 42% at 52% 44%, rgba(233,207,122,0.45) 0%, rgba(221,185,75,0.12) 45%, transparent 72%)' }} />

      {/* pointed mosque arch + hanging lantern behind */}
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="archStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E9CF7A" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path d="M118 300 V120 Q118 58 200 38 Q282 58 282 120 V300" fill="none" stroke="url(#archStroke)" strokeWidth="2.5" />
        <path d="M150 300 V126 Q150 84 200 70 Q250 84 250 126 V300" fill="none" stroke="url(#archStroke)" strokeWidth="1.4" opacity="0.6" />
        <g stroke="#E9CF7A" strokeOpacity="0.5" strokeWidth="1.3" fill="none">
          <line x1="200" y1="0" x2="200" y2="28" />
          <path d="M189 28 h22 l-4 24 h-14 z" fill="rgba(233,207,122,0.18)" />
          <circle cx="200" cy="54" r="2.6" fill="#E9CF7A" fillOpacity="0.65" stroke="none" />
        </g>
      </svg>

      {/* soft light shafts */}
      <div aria-hidden className="absolute -top-10 left-1/4 h-[150%] w-24 rotate-[14deg] bg-gradient-to-b from-gold-200/25 to-transparent blur-md" />
      <div aria-hidden className="absolute -top-10 right-1/3 h-[150%] w-16 -rotate-[12deg] bg-gradient-to-b from-gold-100/20 to-transparent blur-md" />

      {/* the open Quran resting on a rehal */}
      <svg viewBox="0 0 420 320" aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-[80%]">
        <defs>
          <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8A5A22" />
            <stop offset="100%" stopColor="#4A2F12" />
          </linearGradient>
          <linearGradient id="pageL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FBF3D9" />
            <stop offset="100%" stopColor="#E6D199" />
          </linearGradient>
          <linearGradient id="pageR" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#FBF3D9" />
            <stop offset="100%" stopColor="#E6D199" />
          </linearGradient>
          <linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B5A3F" />
            <stop offset="100%" stopColor="#063826" />
          </linearGradient>
          <radialGradient id="bookGlow" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#E9CF7A" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E9CF7A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* glow behind the book */}
        <ellipse cx="210" cy="150" rx="185" ry="120" fill="url(#bookGlow)" />

        {/* rehal X-stand */}
        <g strokeLinecap="round">
          <line x1="155" y1="160" x2="300" y2="300" stroke="url(#wood)" strokeWidth="17" />
          <line x1="265" y1="160" x2="120" y2="300" stroke="url(#wood)" strokeWidth="17" />
          <line x1="150" y1="248" x2="270" y2="248" stroke="#3A2410" strokeWidth="9" strokeLinecap="round" />
          <circle cx="155" cy="160" r="6" fill="#E9CF7A" />
          <circle cx="265" cy="160" r="6" fill="#E9CF7A" />
        </g>

        {/* cover peeking below the pages + gold fore-edge */}
        <path d="M78 170 L210 184 L342 170 L330 198 L210 188 L90 198 Z" fill="url(#cover)" stroke="#E9CF7A" strokeOpacity="0.45" strokeWidth="1.4" />
        <path d="M90 198 L210 188 L330 198 L330 203 L210 193 L90 203 Z" fill="#DDB94B" />

        {/* the two open pages */}
        <path d="M75 128 L210 150 L210 178 L98 165 Z" fill="url(#pageL)" stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M345 128 L210 150 L210 178 L322 165 Z" fill="url(#pageR)" stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
        <line x1="210" y1="150" x2="210" y2="178" stroke="#B08A2E" strokeWidth="1.4" strokeOpacity="0.6" />

        {/* faint lines of script (RTL hint) */}
        <g stroke="#9A7B33" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round">
          <line x1="112" y1="142" x2="198" y2="151" />
          <line x1="108" y1="150" x2="198" y2="158" />
          <line x1="112" y1="158" x2="198" y2="165" />
          <line x1="222" y1="151" x2="308" y2="142" />
          <line x1="222" y1="158" x2="312" y2="150" />
          <line x1="222" y1="165" x2="308" y2="158" />
        </g>

        {/* bookmark ribbon */}
        <path d="M205 150 L215 150 L215 200 L210 191 L205 200 Z" fill="#C0392B" opacity="0.85" />
      </svg>
    </div>
  );
}

/** Floating glassmorphic ayah card overlaid on the hero scene. */
function AyahGlassCard({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={`w-[19rem] max-w-[86%] rounded-2xl border border-gold-300/30 bg-emerald-950/55 p-6 pt-8 text-center shadow-2xl backdrop-blur-xl ${className}`}
    >
      <Sparkles size={12} className="absolute left-3 top-3 text-gold-300/60" />
      <Sparkles size={12} className="absolute right-3 top-3 text-gold-300/60" />
      <span className="absolute -top-6 left-1/2 inline-flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-parchment text-emerald-800 shadow-lg ring-4 ring-emerald-950/40">
        <BookOpen size={22} />
      </span>
      <p className="font-arabic text-2xl leading-[1.9] text-gold-100" style={{ direction: 'rtl' }}>
        إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ
      </p>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50/90">
        Indeed, this Qur’an guides to that which is most upright.
      </p>
      <p className="mt-3 text-xs font-semibold tracking-wide text-gold-300/80">Surah Al-Isra 17:9</p>
    </motion.div>
  );
}

/** Interactive on/off pill used by the recitation alarms. */
function ToggleSwitch({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/15'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

/** Circular reciter avatar — gradient tile with initials (photo-free). */
function QariAvatar({ name, accent }: { name: string; accent: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-sm font-bold text-white shadow-md ring-2 ring-white/10`}>
      {initials}
    </span>
  );
}

export function QuranShowcase() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingQari, setPlayingQari] = useState<string | null>(null);

  const toggleQari = (q: (typeof QARIS)[number]) => {
    const el = audioRef.current;
    if (!el) return;
    if (playingQari === q.name) { el.pause(); setPlayingQari(null); return; }
    el.src = `${QURAN_AUDIO_CDN}/${q.edition}/1.mp3`; // Surah Al-Fatiha preview
    el.play().then(() => setPlayingQari(q.name)).catch(() => setPlayingQari(null));
  };

  return (
    <section id="quran" className="relative overflow-hidden bg-mosque-gradient text-parchment">
      {/* moving background */}
      <div className="absolute inset-0 pattern-bg opacity-[0.15] pointer-events-none" />
      <Aurora className="w-[34rem] h-[34rem] bg-emerald-400/20 -top-40 -left-32" />
      <Aurora className="w-[30rem] h-[30rem] bg-gold-400/15 top-32 -right-40" delay={5} />
      <KhatamStar className="absolute top-24 right-10 w-64 h-64 text-gold-300/10 animate-spin-slow hidden lg:block" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
        {/* ── hero ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* left: copy + stats */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gold-200 backdrop-blur">
              <Sparkles size={13} /> Quran Experience
            </span>
            <h2 className="h-display text-5xl md:text-6xl font-bold leading-[1.02]">
              Recite. Reflect.<br />
              <span className="bg-clip-text text-transparent bg-gold-gradient">Transform.</span>
            </h2>
            <p className="max-w-xl text-base md:text-lg leading-relaxed text-emerald-100/75">
              Explore the beauty of the Quran with crystal-clear recitations, authentic
              translations, and smart scheduling to keep you connected every day.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-5 pt-2">
              {HERO_STATS.map((s) => (
                <div key={s.value} className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-gold-300 backdrop-blur">
                    <s.icon size={20} />
                  </span>
                  <div className="leading-tight">
                    <div className="font-bold text-gold-200">{s.value}</div>
                    <div className="text-sm text-emerald-100/60">{s.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* right: illustrated scene + floating ayah card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.7 }}
            className="relative"
          >
            <RehalScene />
            <AyahGlassCard className="absolute right-2 top-6 sm:right-4 lg:-right-6 lg:top-8" />
          </motion.div>
        </div>

        {/* ── translation languages bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className="mt-16 rounded-3xl border border-emerald-100/70 bg-parchment/95 p-6 md:p-7 shadow-2xl"
        >
          <div className="mb-5 flex items-center gap-2 text-emerald-800">
            <Globe2 size={20} />
            <h3 className="text-lg font-bold">Translations &amp; UI in 10+ Languages</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {LANGUAGES.map((l, i) => (
              <motion.div
                key={l.code}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.4 }}
                className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-2.5 py-2 shadow-sm"
              >
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${l.accent} text-[10px] font-extrabold tracking-wide text-white shadow`}>
                  {l.code}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={`truncate text-[13px] font-bold text-emerald-900 ${l.rtl ? 'font-arabic' : ''}`}
                    style={l.rtl ? { direction: 'rtl' } : undefined}
                  >
                    {l.native}
                  </span>
                  <span className="truncate text-[10px] font-medium text-ink/50">{l.label}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── qaris + alarms ── */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          {/* World-Class Qaris */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-gold-300/25 bg-white/[0.05] p-6 backdrop-blur-md"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold-300/40 bg-white/[0.06] text-gold-300">
                <Headphones size={20} />
              </span>
              <div>
                <h3 className="text-lg font-bold leading-tight">World-Class Qaris</h3>
                <p className="text-sm text-emerald-100/60">Listen to the voices of the Quran</p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {QARIS.map((q, i) => {
                const playing = playingQari === q.name;
                return (
                  <motion.li
                    key={q.name}
                    initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition
                      ${playing ? 'border-gold-300/50 bg-white/[0.1]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                  >
                    <QariAvatar name={q.name} accent={q.accent} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-parchment">{q.name}</span>
                    <span className="font-arabic shrink-0 text-lg text-gold-200/90" style={{ direction: 'rtl' }}>{q.arabic}</span>
                    <button
                      type="button"
                      onClick={() => toggleQari(q)}
                      aria-label={playing ? `Pause ${q.name}` : `Play ${q.name}`}
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition
                        ${playing ? 'border-gold-300 bg-gold-300 text-emerald-900' : 'border-gold-300/50 text-gold-200 hover:bg-gold-300/15'}`}
                    >
                      {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            <Link
              href="/dashboard/quran"
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-gold-300/40 bg-gradient-to-r from-emerald-700/40 to-emerald-800/40 py-3 text-sm font-semibold text-gold-100 transition hover:from-emerald-700/60 hover:to-emerald-800/60"
            >
              View All Qaris <Users size={16} />
            </Link>
          </motion.div>

          {/* Recitation Alarms */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-gold-300/25 bg-white/[0.05] p-6 backdrop-blur-md"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gold-300/40 bg-white/[0.06] text-gold-300">
                  <BellRing size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-bold leading-tight">Recitation Alarms</h3>
                  <p className="text-sm text-emerald-100/60">Auto-recite Surahs at the times you choose</p>
                </div>
              </div>
              <Link
                href="/dashboard/recitation"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-parchment px-4 py-2 text-sm font-bold text-emerald-900 shadow transition hover:bg-white"
              >
                <Plus size={15} /> <span className="hidden sm:inline">New Schedule</span><span className="sm:hidden">New</span>
              </Link>
            </div>

            <div className="space-y-3">
              {ALARMS.map((a, i) => (
                <motion.div
                  key={a.surah}
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] ${a.tint}`}>
                    <a.icon size={20} />
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-parchment">{a.time}</span>
                  <span aria-hidden className="h-8 w-px bg-white/15" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-parchment">{a.surah}</p>
                    <p className="truncate text-xs text-emerald-100/55">{a.when}</p>
                  </div>
                  <ToggleSwitch />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── closing feature strip ── (full-bleed darker band) */}
      <div className="relative border-t border-white/10 bg-emerald-950/50 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-6 px-6 py-8 sm:grid-cols-3 lg:grid-cols-5">
          {QURAN_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-300/30 bg-white/[0.05] text-gold-300">
                <f.icon size={18} />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-parchment">{f.title}</p>
                <p className="text-xs text-emerald-100/55">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingQari(null)} hidden />
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
