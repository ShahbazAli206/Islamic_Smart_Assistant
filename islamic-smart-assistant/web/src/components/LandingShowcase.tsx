'use client';

/**
 * Landing-page feature showcases — Azan, Quran & Translation (with schedules),
 * and Devices. Each mirrors the matching dashboard page and is fully
 * self-contained: vector (SVG) artwork so it stays razor-sharp at any DPI,
 * animated gradient auroras + the Islamic geometric pattern for moving
 * backgrounds, and live data (azan previews, saved schedules, real audio-output
 * rescan) so the page demonstrates the product rather than just describing it.
 */

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell, BellRing, Play, Pause, MapPin, ArrowRight, Sparkles,
  BookOpen, Languages, Plus, Volume2,
  Headphones, Bluetooth, RefreshCw, Smartphone, Tablet, Laptop, Mic2,
  Radio, CheckCircle2, Moon,
  Globe2, BellPlus, Users, Bookmark, Sun,
  Settings, Home, Cast, Airplay,
  Clock, Compass,
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
      <h2 className={`section-heading mt-4 ${light ? 'text-parchment' : 'text-ink'}`}>
        {title}
      </h2>
      <p className={`mt-3 text-base md:text-lg leading-relaxed
        ${light ? 'text-parchment/70' : 'text-ink/65'}`}>
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
   1 · AZAN SHOWCASE  (light theme)
   ════════════════════════════════════════════════════════════════════════ */

type AzanCard = {
  icon: React.ElementType; title: string; desc: string;
  href: string; btn: string; image: string;
  bg: string; iconBg: string; titleColor: string; btnBg: string;
};

const AZAN_CARDS: AzanCard[] = [
  {
    icon: Bell,       title: 'Auto Azan',
    desc: 'Automatically play Adhan at every prayer time on all your devices.',
    href: '/dashboard/azan',         btn: 'Manage',
    image: '/card_images/Auto_Azan_card_image.png',
    bg: 'bg-gold-50', iconBg: 'bg-gold-600', titleColor: 'text-gold-700', btnBg: 'bg-gold-600',
  },
  {
    icon: Clock,      title: 'Prayer Times',
    desc: 'Accurate prayer times based on your location with multiple methods.',
    href: '/dashboard/prayer-times', btn: 'View Times',
    image: '/card_images/prayers_times_card_image.png',
    bg: 'bg-parchment', iconBg: 'bg-gold-500', titleColor: 'text-gold-600', btnBg: 'bg-gold-500',
  },
  {
    icon: BookOpen,   title: 'Quran & Translation',
    desc: 'Read and listen to the Quran with beautiful translations in your language.',
    href: '/dashboard/quran',        btn: 'Open Quran',
    image: '/card_images/Quran_Translation_Card_image.png',
    bg: 'bg-gold-100', iconBg: 'bg-gold-600', titleColor: 'text-gold-700', btnBg: 'bg-gold-600',
  },
  {
    icon: Compass,    title: 'Qibla Finder',
    desc: 'Find the exact direction of Qibla from your current location.',
    href: '/dashboard/qibla',        btn: 'Find Qibla',
    image: '/card_images/Qibla_finder_card_image.png',
    bg: 'bg-gold-50', iconBg: 'bg-gold-700', titleColor: 'text-gold-700', btnBg: 'bg-gold-700',
  },
  {
    icon: Headphones, title: 'Islamic Voices',
    desc: "Choose from world's best reciters and muezzins voices.",
    href: '/dashboard/azan',         btn: 'Explore',
    image: '/card_images/Islamic_Voices_card_image.png',
    bg: 'bg-parchment', iconBg: 'bg-gold-600', titleColor: 'text-gold-700', btnBg: 'bg-gold-600',
  },
];

const AZAN_STATS = [
  { icon: Bell,     label: 'Next Prayer',     value: 'Dhuhr',            sub: '12:32 PM · 01:15:44', iconBg: 'bg-gold-100', iconColor: 'text-gold-700' },
  { icon: Volume2,  label: 'Auto-Azan',       value: 'Enabled',          sub: 'All devices synced',  iconBg: 'bg-gold-50',  iconColor: 'text-gold-600' },
  { icon: Compass,  label: 'Qibla Direction', value: '292° NW',          sub: 'From your location',  iconBg: 'bg-gold-100', iconColor: 'text-gold-600' },
  { icon: BookOpen, label: "Today's Verse",   value: 'Al-Baqarah 2:186', sub: 'Tap to read',         iconBg: 'bg-gold-50',  iconColor: 'text-gold-500' },
];

export function AzanShowcase() {
  return (
    <section id="azan" className="relative overflow-hidden bg-white text-ink">
      {/* Islamic geometric pattern — far left, gold tint, very faint */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-80 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' stroke='rgba(201,162,39,0.20)' stroke-width='1'><path d='M40 4 L74 24 L74 56 L40 76 L6 56 L6 24 Z'/><path d='M40 16 L62 28 L62 52 L40 64 L18 52 L18 28 Z'/><circle cx='40' cy='40' r='10'/></g></svg>")`,
          backgroundSize: '80px 80px',
          opacity: 0.7,
        }}
      />

      {/* hero-bg.jpg mosque photo — full section background (light theme).
          A single light, EVEN veil so the photo is equally visible across the
          whole section (left and right). The copy sits on its own dark panel,
          so no heavy left-side wash is needed for legibility. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* The photo's detail sits on one side, so a single full-width copy left
            the other side plain. Duplicate it across two halves — left half
            mirrored — so the mosque scene is visible on BOTH sides. Each half is
            slightly wider than 50% and overlaps at the centre so no seam/white
            line can show through (even when zoomed). */}
        <div className="absolute inset-0">
          <img src="/hero-bg.jpg" alt="" className="absolute inset-y-0 left-0 h-full w-[51%] object-cover object-center -scale-x-100" />
          <img src="/hero-bg.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-[51%] object-cover object-center" />
        </div>
        <div className="absolute inset-0 bg-white/15" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-0">
        {/* ── hero ── */}
        <div className="grid lg:grid-cols-2 gap-8 items-start min-h-[340px]">
          {/* left: copy — sits on a dark frosted (translucent) panel so it stands
              out against the light photo background */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.6 }}
            className="space-y-5 rounded-3xl border border-white/15 bg-midnight-900/55 backdrop-blur-md p-6 sm:p-8 shadow-2xl mb-8 lg:mb-10"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-50 border border-gold-200 px-4 py-1.5 text-sm font-semibold text-gold-700">
              <Sparkles size={14} /> Auto-Azan Enabled
            </span>
            {/* White first line + gold-gradient last line — reads on the dark panel */}
            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-[1.04]">
              <span className="text-white">The call to prayer,</span><br />
              <span className="bg-clip-text text-transparent bg-gold-gradient">in every voice you love.</span>
              <span className="ml-2 text-gold-400" aria-hidden>✦</span>
            </h2>
            {/* Body — light muted colour to read on the dark panel */}
            <p className="text-lg text-parchment/80 max-w-xl leading-relaxed">
              Authentic Adhan from the world's great mosques, automatically
              played on every linked device the moment a prayer time arrives.
            </p>
            <p className="text-lg md:text-xl font-bold text-gold-300">
              Stay connected. Stay mindful. Stay blessed.
            </p>
            {/* CTA moved into the copy column so the right side can host the ayah card */}
            <Link
              href="/dashboard/azan"
              className="inline-flex w-fit items-center gap-2.5 rounded-full bg-gold-gradient hover:brightness-110 text-midnight-900 px-7 py-4 font-semibold text-sm shadow-glow-gold transition"
            >
              <Headphones size={18} /> Explore Voices <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* right: floating ayah card — verse about praying at appointed times,
              translation in the user's selected language (matches the hero card) */}
          <motion.div
            initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.6, delay: 0.15 }}
            className="hidden lg:flex items-start justify-end pt-2"
          >
            <AzanAyahCard />
          </motion.div>
        </div>

        {/* ── stats bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10 rounded-2xl border border-white/15 bg-midnight-900/55 backdrop-blur-md shadow-2xl overflow-hidden"
        >
          {AZAN_STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5 px-5 py-4">
              <span className={`w-11 h-11 rounded-full ${s.iconBg} flex items-center justify-center shrink-0`}>
                <s.icon size={18} className={s.iconColor} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-parchment/50 uppercase tracking-wide">{s.label}</p>
                <p className="text-sm font-bold text-parchment leading-tight truncate">{s.value}</p>
                <p className="text-[11px] text-parchment/50 truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── feature cards — continuous left→right marquee ──
            The five cards scroll horizontally; duplicated once for a seamless
            loop, reversed direction so they travel left → right, and paused on
            hover so the buttons stay clickable. Edges fade out via mask-image. */}
        <div className="mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
          <div className="flex w-max gap-4 animate-marquee [animation-direction:reverse] hover:[animation-play-state:paused]">
            {[...AZAN_CARDS, ...AZAN_CARDS].map((card, i) => {
              const k = i % AZAN_CARDS.length; // keep duplicated cards in sync
              return (
                <motion.div
                  key={`${card.title}-${i}`}
                  whileHover={{ y: -4 }}
                  className={`group relative w-[260px] shrink-0 overflow-hidden rounded-2xl ${card.bg} p-5 min-h-[230px] flex flex-col`}
                >
                  {/* continuously sweeping shimmer sheen */}
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(212,160,23,0.35) 50%, transparent 65%)' }}
                    animate={{ x: ['-120%', '120%'] }}
                    transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut', delay: k * 0.4 }}
                  />
                  <motion.span
                    className={`inline-flex w-12 h-12 rounded-2xl ${card.iconBg} items-center justify-center text-white shadow-md shrink-0`}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: k * 0.25 }}
                  >
                    <card.icon size={22} />
                  </motion.span>
                  {/* decorative card art — floats up and down continuously */}
                  <motion.img
                    src={card.image} alt="" aria-hidden
                    className="absolute right-0 top-0 h-[78%] w-[55%] object-contain object-right-top pointer-events-none"
                    animate={{ y: [0, -9, 0] }}
                    transition={{ duration: 4 + k * 0.3, repeat: Infinity, ease: 'easeInOut', delay: k * 0.35 }}
                  />
                  <h3 className={`relative mt-4 font-bold text-lg ${card.titleColor}`}>{card.title}</h3>
                  <p className="relative mt-1.5 text-sm text-ink/70 leading-relaxed flex-1">{card.desc}</p>
                  <Link
                    href={card.href}
                    className={`relative mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${card.btnBg} text-white shadow-sm w-fit transition hover:opacity-90`}
                  >
                    {card.btn} <ArrowRight size={13} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="pb-10" />
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   2 · QURAN EXPERIENCE — recite · reflect · transform
   ════════════════════════════════════════════════════════════════════════ */

const HERO_STATS = [
  { icon: BookOpen, value: '114 Surahs',    caption: 'Complete Quran' },
  { icon: Globe2,   value: '10+ Languages', caption: 'Translations & UI' },
  { icon: BellPlus, value: 'Smart Alarms',  caption: 'Never Miss a Word' },
];

const LANGUAGES = [
  { code: 'EN', native: 'English',  label: 'English', rtl: false, accent: 'from-gold-600 to-gold-900' },
  { code: 'AR', native: 'العربية',  label: 'Arabic',  rtl: true,  accent: 'from-gold-500 to-gold-700' },
  { code: 'UR', native: 'اردو',     label: 'Urdu',    rtl: true,  accent: 'from-gold-400 to-gold-600' },
  { code: 'TR', native: 'Türkçe',   label: 'Turkish', rtl: false, accent: 'from-midnight-600 to-midnight-800' },
  { code: 'ZH', native: '中文',      label: 'Chinese', rtl: false, accent: 'from-midnight-700 to-midnight-900' },
  { code: 'FR', native: 'Français', label: 'French',  rtl: false, accent: 'from-gold-700 to-midnight-700' },
  { code: 'BN', native: 'বাংলা',    label: 'Bengali', rtl: false, accent: 'from-gold-500 to-midnight-800' },
  { code: 'FA', native: 'فارسی',    label: 'Persian', rtl: true,  accent: 'from-midnight-600 to-gold-700' },
  { code: 'MS', native: 'Melayu',   label: 'Malay',   rtl: false, accent: 'from-gold-600 to-midnight-700' },
];

const QARIS = [
  { name: 'Abdul Basit Abdul Samad',  arabic: 'عبد الباسط عبد الصمد', edition: 'ar.abdulbasitmurattal', accent: 'from-gold-500 to-gold-700' },
  { name: 'Mishary Rashid Alafasy',   arabic: 'مشاري بن راشد العفاسي', edition: 'ar.alafasy',           accent: 'from-gold-400 to-gold-600' },
  { name: 'Mahmoud Khalil Al Husary', arabic: 'محمود خليل الحصري',    edition: 'ar.husary',            accent: 'from-midnight-600 to-midnight-800' },
  { name: 'Saad Al-Ghamdi',           arabic: 'سعد الغامدي',          edition: 'ar.saadalghamadi',     accent: 'from-gold-600 to-midnight-700' },
  { name: 'Ahmed Al Ajmi',            arabic: 'أحمد العجمي',          edition: 'ar.ahmedajamy',        accent: 'from-midnight-700 to-midnight-900' },
];

const ALARMS = [
  { icon: Sun,      time: '05:30 AM', surah: 'Surah Yaseen',  when: 'Every day after Fajr',    tint: 'bg-gold-500 text-white' },
  { icon: Moon,     time: '09:00 PM', surah: 'Surah Al-Mulk', when: 'Every night before sleep', tint: 'bg-midnight-700 text-white' },
  { icon: BookOpen, time: '06:00 AM', surah: 'Surah Al-Kahf', when: 'Every Friday morning',    tint: 'bg-gold-600 text-white' },
];

const QURAN_FEATURES = [
  { icon: BookOpen,   title: 'Authentic Recitations', desc: 'By world-renowned Qaris' },
  { icon: Languages,  title: 'Accurate Translations', desc: 'In 10+ global languages' },
  { icon: Headphones, title: 'Crystal-Clear Audio',   desc: 'High quality & offline ready' },
  { icon: Bookmark,   title: 'Smart Bookmarks',       desc: 'Save, continue, reflect' },
  { icon: Moon,       title: 'Dark & Light Mode',     desc: 'Comfort for every reader' },
];

const QURAN_AUDIO_CDN = 'https://cdn.islamic.network/quran/audio-surah/192';

function RehalScene({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl ${className}`}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 28%, #1c3d30 0%, #0f2920 46%, #08160f 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(46% 42% at 52% 44%, rgba(233,207,122,0.45) 0%, rgba(221,185,75,0.12) 45%, transparent 72%)' }} />
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
      <div aria-hidden className="absolute -top-10 left-1/4 h-[150%] w-24 rotate-[14deg] bg-gradient-to-b from-gold-200/25 to-transparent blur-md" />
      <div aria-hidden className="absolute -top-10 right-1/3 h-[150%] w-16 -rotate-[12deg] bg-gradient-to-b from-gold-100/20 to-transparent blur-md" />
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
        <ellipse cx="210" cy="150" rx="185" ry="120" fill="url(#bookGlow)" />
        <g strokeLinecap="round">
          <line x1="155" y1="160" x2="300" y2="300" stroke="url(#wood)" strokeWidth="17" />
          <line x1="265" y1="160" x2="120" y2="300" stroke="url(#wood)" strokeWidth="17" />
          <line x1="150" y1="248" x2="270" y2="248" stroke="#3A2410" strokeWidth="9" strokeLinecap="round" />
          <circle cx="155" cy="160" r="6" fill="#E9CF7A" />
          <circle cx="265" cy="160" r="6" fill="#E9CF7A" />
        </g>
        <path d="M78 170 L210 184 L342 170 L330 198 L210 188 L90 198 Z" fill="url(#cover)" stroke="#E9CF7A" strokeOpacity="0.45" strokeWidth="1.4" />
        <path d="M90 198 L210 188 L330 198 L330 203 L210 193 L90 203 Z" fill="#DDB94B" />
        <path d="M75 128 L210 150 L210 178 L98 165 Z" fill="url(#pageL)" stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M345 128 L210 150 L210 178 L322 165 Z" fill="url(#pageR)" stroke="#C9A227" strokeOpacity="0.4" strokeWidth="1" />
        <line x1="210" y1="150" x2="210" y2="178" stroke="#B08A2E" strokeWidth="1.4" strokeOpacity="0.6" />
        <g stroke="#9A7B33" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round">
          <line x1="112" y1="142" x2="198" y2="151" />
          <line x1="108" y1="150" x2="198" y2="158" />
          <line x1="112" y1="158" x2="198" y2="165" />
          <line x1="222" y1="151" x2="308" y2="142" />
          <line x1="222" y1="158" x2="312" y2="150" />
          <line x1="222" y1="165" x2="308" y2="158" />
        </g>
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
      className={`w-[19rem] max-w-[86%] rounded-2xl border border-gold-300/30 bg-midnight-900/55 p-6 pt-8 text-center shadow-2xl backdrop-blur-xl ${className}`}
    >
      <Sparkles size={12} className="absolute left-3 top-3 text-gold-300/60" />
      <Sparkles size={12} className="absolute right-3 top-3 text-gold-300/60" />
      <span className="absolute -top-6 left-1/2 inline-flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-parchment text-gold-700 shadow-lg ring-4 ring-midnight-900/40">
        <BookOpen size={22} />
      </span>
      <p className="font-arabic text-2xl leading-[1.9] text-gold-100" style={{ direction: 'rtl' }}>
        إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ
      </p>
      <p className="mt-3 text-sm leading-relaxed text-parchment/80">
        Indeed, this Qur'an guides to that which is most upright.
      </p>
      <p className="mt-3 text-xs font-semibold tracking-wide text-gold-300/80">Surah Al-Isra 17:9</p>
    </motion.div>
  );
}

/* Verse about establishing prayer at its appointed times (An-Nisa 4:103) —
   shown in the Azan hero. Translation rendered in the user's chosen language
   (isa:language: 'ur' | 'en' | 'none' → Arabic only). */
const AZAN_AYAH = {
  arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا',
  reference: 'Surah An-Nisa 4:103',
  translations: {
    en: 'Indeed, prayer has been decreed upon the believers a decree of specified times.',
    ur: 'بے شک نماز مومنوں پر مقررہ وقتوں میں فرض کی گئی ہے۔',
  } as Record<string, string>,
};

/** Floating ayah card for the Azan hero — verse on praying at appointed times,
 *  with the translation in the user's selected language (falls back to English;
 *  'none' shows the Arabic only). Mirrors the AyahGlassCard styling. */
function AzanAyahCard({ className = '' }: { className?: string }) {
  const [language] = useLocalStorage<string>('isa:language', 'ur');
  const translation = language === 'none' ? null : (AZAN_AYAH.translations[language] ?? AZAN_AYAH.translations.en);
  const rtl = language === 'ur';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className={`relative w-[25rem] max-w-[92%] rounded-2xl border border-gold-300/30 bg-midnight-900/55 p-8 pt-10 text-center shadow-2xl backdrop-blur-xl ${className}`}
    >
      <Sparkles size={15} className="absolute left-4 top-4 text-gold-300/60" />
      <Sparkles size={15} className="absolute right-4 top-4 text-gold-300/60" />
      <span className="absolute -top-7 left-1/2 inline-flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-parchment text-gold-700 shadow-lg ring-4 ring-midnight-900/40">
        <BookOpen size={28} />
      </span>
      <p className="font-arabic text-3xl leading-[1.9] text-gold-100" style={{ direction: 'rtl' }}>
        {AZAN_AYAH.arabic}
      </p>
      {translation && (
        <p
          className={`mt-4 text-base leading-relaxed text-parchment/80 ${rtl ? 'font-arabic' : ''}`}
          style={rtl ? { direction: 'rtl' } : undefined}
        >
          {translation}
        </p>
      )}
      <p className="mt-4 text-sm font-semibold tracking-wide text-gold-300/80">{AZAN_AYAH.reference}</p>
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
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-gold-600' : 'bg-white/20'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

/** Circular reciter avatar — gradient tile with initials (photo-free). */
function QariAvatar({ name, accent }: { name: string; accent: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-xs font-bold text-white shadow-md ring-2 ring-stone-100`}>
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
    el.src = `${QURAN_AUDIO_CDN}/${q.edition}/1.mp3`;
    el.play().then(() => setPlayingQari(q.name)).catch(() => setPlayingQari(null));
  };

  return (
    <section id="quran" className="relative overflow-hidden bg-mosque-gradient text-parchment">
      {/* ── full-section background image ── */}
      <div className="absolute inset-0 pointer-events-none">
        <img src="/backgound-image2.png" alt="" className="w-full h-full object-cover object-center" />
        {/* dark midnight wash so the parchment heading + gold stat pills pop
            against the golden photo; darker on the left where the copy sits,
            letting the image show through on the right as ambiance */}
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-900/88 via-midnight-900/62 to-midnight-900/38" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-900/45 via-transparent to-midnight-900/55" />
      </div>
      {/* pattern + aurora */}
      <div className="absolute inset-0 pattern-bg opacity-[0.15] pointer-events-none" />
      <Aurora className="w-[34rem] h-[34rem] bg-gold-400/10 -top-40 -left-32" />
      <KhatamStar className="absolute top-16 left-[34%] w-52 h-52 text-gold-300/[0.07] animate-spin-slow hidden lg:block" />

      <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-0">
        {/* quran-bg.png — right-half photo */}
        <div
          aria-hidden
          className="absolute top-[29px] right-0 w-[52%] h-[382px] hidden lg:block overflow-hidden rounded-l-2xl rounded-b-2xl rounded-tr-2xl pointer-events-none"
        >
          <img src="/quran-bg.png" alt="" className="w-full h-full object-cover object-center" />
        </div>

        {/* ── hero ── */}
        <div className="grid lg:grid-cols-[45%_55%] gap-8 items-start">
          {/* left: copy + stats — on a dark frosted panel (matches the ayah card) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.6 }}
            className="space-y-5 rounded-3xl border border-white/15 bg-midnight-900/55 backdrop-blur-md p-6 sm:p-8 shadow-2xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gold-200 backdrop-blur">
              <Sparkles size={13} /> Quran Experience
            </span>
            {/* Heading + body matched to the first section (hero) format:
                same font/size/leading and gold-gradient last word, same body size. */}
            <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-[1.04] text-parchment">
              Recite. Reflect.<br />
              <span className="bg-clip-text text-transparent bg-gold-gradient">Transform.</span>
            </h2>
            <p className="text-lg text-parchment/75 max-w-xl leading-relaxed">
              Explore the beauty of the Quran with crystal-clear recitations, authentic
              translations, and smart scheduling to keep you connected every day.
            </p>
            {/* stat pills styled like the hero "Launch Dashboard" button:
                gold-gradient bg, midnight text, rounded-xl, gold glow, hover brighten */}
            <div className="flex flex-wrap gap-3 pt-1">
              {HERO_STATS.map((s) => (
                <div
                  key={s.value}
                  className="flex items-center gap-2.5 rounded-xl bg-gold-gradient text-midnight-900 px-4 py-2.5 shadow-glow-gold transition hover:brightness-105"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-midnight-900/10 text-midnight-900">
                    <s.icon size={18} />
                  </span>
                  <div className="leading-tight">
                    <div className="text-sm font-bold text-midnight-900">{s.value}</div>
                    <div className="text-xs font-medium text-midnight-900/70">{s.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* right: ayah card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-90px' }} transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex items-start justify-end pt-[19px]"
          >
            <AyahGlassCard />
          </motion.div>
        </div>

        {/* ── translation languages bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
          className="mt-6 glass-dark rounded-2xl px-5 py-4 shadow-2xl shadow-emerald-950/40"
        >
          <div className="mb-3 flex items-center gap-2 text-gold-300">
            <Globe2 size={21} />
            <h3 className="text-lg font-bold">Translations &amp; UI in 10+ Languages</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {LANGUAGES.map((l, i) => (
              <motion.div
                key={l.code}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.03, duration: 0.35 }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${l.accent} text-[13px] font-extrabold tracking-wide text-white`}>
                  {l.code}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={`truncate text-[15px] font-bold text-parchment ${l.rtl ? 'font-arabic' : ''}`}
                    style={l.rtl ? { direction: 'rtl' } : undefined}
                  >
                    {l.native}
                  </span>
                  <span className="truncate text-[12px] font-medium text-parchment/45">{l.label}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── qaris + alarms ── */}
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {/* World-Class Qaris */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden glass-dark rounded-2xl p-5 shadow-2xl shadow-emerald-950/40"
          >
            <div className="mb-3.5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gold-300">
                <Headphones size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold leading-tight text-parchment">World-Class Qaris</h3>
                <p className="text-xs text-parchment/55">Listen to the voices of the Quran</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {QARIS.map((q, i) => {
                const playing = playingQari === q.name;
                return (
                  <motion.li
                    key={q.name}
                    initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition
                      ${playing ? 'border-gold-300/50 bg-gold-300/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <QariAvatar name={q.name} accent={q.accent} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-parchment">{q.name}</span>
                    <span className="font-arabic shrink-0 text-sm text-parchment/50" style={{ direction: 'rtl' }}>{q.arabic}</span>
                    <button
                      type="button"
                      onClick={() => toggleQari(q)}
                      aria-label={playing ? `Pause ${q.name}` : `Play ${q.name}`}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition
                        ${playing ? 'border-gold-300 bg-gold-gradient text-midnight-900' : 'border-white/10 bg-white/5 text-gold-300 hover:bg-white/10'}`}
                    >
                      {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
            <Link
              href="/dashboard/quran"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-parchment/80 transition hover:bg-white/10"
            >
              View All Qaris <Users size={15} />
            </Link>
          </motion.div>

          {/* Recitation Alarms */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden glass-dark rounded-2xl p-5 shadow-2xl shadow-emerald-950/40"
          >
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gold-300">
                  <BellRing size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold leading-tight text-parchment">Recitation Alarms</h3>
                  <p className="text-xs text-parchment/55">Auto-recite Surahs at the times you choose</p>
                </div>
              </div>
              <Link
                href="/dashboard/recitation"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-gradient px-3.5 py-2 text-xs font-bold text-midnight-900 shadow-glow-gold transition hover:brightness-105"
              >
                <Plus size={13} /> New Schedule
              </Link>
            </div>
            <div className="space-y-2.5">
              {ALARMS.map((a, i) => (
                <motion.div
                  key={a.surah}
                  initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.tint}`}>
                    <a.icon size={18} />
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-parchment">{a.time}</span>
                  <span aria-hidden className="h-7 w-px bg-white/10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-parchment">{a.surah}</p>
                    <p className="truncate text-xs text-parchment/50">{a.when}</p>
                  </div>
                  <ToggleSwitch />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── closing feature strip ── */}
      <div className="relative mt-5 border-t border-white/10 bg-midnight-900/50 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-3 lg:grid-cols-5">
          {QURAN_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-300/30 bg-white/[0.05] text-gold-300">
                <f.icon size={17} />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-bold text-parchment">{f.title}</p>
                <p className="text-[10px] text-parchment/50">{f.desc}</p>
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
   3 · DEVICES & OUTPUTS — cinematic Islamic night scene
   ════════════════════════════════════════════════════════════════════════ */

const DEVICES = [
  { name: 'iPhone 15',   owner: 'Home',    Icon: Smartphone, accent: 'from-gold-400 to-gold-600',        fill: 'bg-gold-400',     vol: 65 },
  { name: 'iPad Pro',    owner: 'Home',    Icon: Tablet,     accent: 'from-midnight-400 to-midnight-600', fill: 'bg-midnight-400', vol: 38 },
  { name: 'MacBook Pro', owner: 'Office',  Icon: Laptop,     accent: 'from-gold-600 to-midnight-700',    fill: 'bg-gold-600',     vol: 55 },
  { name: 'Echo Dot',    owner: 'Kitchen', Icon: Mic2,       accent: 'from-midnight-600 to-midnight-800', fill: 'bg-midnight-600', vol: 28 },
];

const BADGE = {
  playing: { ring: 'bg-gold-400',  cls: 'bg-gold-400/20 text-gold-300 border border-gold-400/30' },
  online:  { ring: 'bg-gold-400',  cls: 'bg-gold-400/10 text-gold-300/80 border border-gold-400/20' },
  idle:    { ring: 'bg-slate-400', cls: 'bg-slate-500/20 text-slate-300 border border-slate-500/20' },
};

const PLATFORMS = [
  { label: 'Amazon Alexa', Icon: Radio  },
  { label: 'Google Home',  Icon: Home   },
  { label: 'Chromecast',   Icon: Cast   },
  { label: 'AirPlay',      Icon: Airplay },
];

/** Crescent moon — top-right of the section. */
function DevCrescent({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 66" fill="none" aria-hidden className={className}>
      <path d="M40 6A28 28 0 1 0 48 52 22 22 0 1 1 40 6Z" fill="#E9CF7A" />
    </svg>
  );
}

/** One ornate hanging lantern — glows warm gold. */
function DevLantern({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 136" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="dlBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6D67A" /><stop offset="100%" stopColor="#A6791E" />
        </linearGradient>
        <radialGradient id="dlFlame" cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#FCE7A6" stopOpacity="0.9" /><stop offset="100%" stopColor="#F2C94C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M27 0V22" stroke="url(#dlBrass)" strokeWidth="2.5" />
      <circle cx="27" cy="4" r="4" fill="url(#dlBrass)" />
      <path d="M16 24c0-10 5-16 11-16s11 6 11 16z" fill="url(#dlBrass)" />
      <path d="M13 32h28l6 64c0 12-12 20-20 20s-20-8-20-20z" fill="url(#dlBrass)" fillOpacity="0.75" />
      <path d="M20 36h14l3 58c0 7-7 11-10 11s-10-4-10-11z" fill="#FCE7A6" fillOpacity="0.2" />
      <circle cx="27" cy="62" r="20" fill="url(#dlFlame)" />
      <path d="M27 50c6 6 7 12 3 19-1 3 0 5 2 6-8 0-13-7-10-16 1-4 3-7 5-9z" fill="#F2994A" opacity="0.85" />
      <line x1="27" y1="34" x2="27" y2="94" stroke="#A6791E" strokeWidth="1.6" opacity="0.5" />
      <line x1="17" y1="60" x2="37" y2="60" stroke="#A6791E" strokeWidth="1.6" opacity="0.5" />
      <path d="M19 98h18l-3 16H22z" fill="url(#dlBrass)" />
      <rect x="21" y="114" width="12" height="6" rx="2" fill="url(#dlBrass)" />
    </svg>
  );
}

function MughalArch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 380" fill="none" aria-hidden className={className} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="mihrabGlow" cx="50%" cy="40%" r="62%">
          <stop offset="0%"  stopColor="#E9CF7A" stopOpacity="0.20" />
          <stop offset="45%" stopColor="#C9A227" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0B1D14" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mihrabStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#F6D67A" />
          <stop offset="55%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#8A6B16" />
        </linearGradient>
      </defs>
      <path d="M30 380V176C30 96 64 44 140 22 216 44 250 96 250 176V380Z" fill="url(#mihrabGlow)" />
      <path d="M22 380V178
               C22 150 26 128 36 110
               Q44 122 56 116 Q50 100 62 92
               Q72 104 84 96  Q80 78 94 72
               Q104 84 116 74 Q116 56 132 52
               L140 40 L148 52 Q164 56 164 74
               Q176 84 186 72 Q200 78 196 96
               Q208 104 218 92 Q230 100 224 116
               Q236 122 244 110 C254 128 258 150 258 178 V380"
            stroke="url(#mihrabStroke)" strokeOpacity="0.55" strokeWidth="2.2"
            strokeLinejoin="round" fill="none" />
      <path d="M48 380V190C48 116 80 74 140 56 200 74 232 116 232 190V380"
        stroke="#E9CF7A" strokeOpacity="0.30" strokeWidth="1.5" fill="none" />
      <path d="M72 380V202C72 138 102 100 140 86 178 100 208 138 208 202V380"
        stroke="#E9CF7A" strokeOpacity="0.16" strokeWidth="1" fill="none" />
      <path d="M140 40C140 28 134 24 134 16 134 9 140 2 140 2 140 2 146 9 146 16 146 24 140 28 140 40Z"
        fill="url(#mihrabStroke)" fillOpacity="0.55" />
      <circle cx="140" cy="20" r="11" stroke="#E9CF7A" strokeOpacity="0.55" strokeWidth="1.5" fill="none" />
      <circle cx="140" cy="20" r="5.5" fill="#E9CF7A" fillOpacity="0.5" />
      <circle cx="140" cy="20" r="2.2" fill="#F6D67A" fillOpacity="0.95" />
      <path d="M126 12L122 8M154 12L158 8M140 2V-3"
        stroke="#E9CF7A" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
      {[206,230,254,278,302,326,350].map((y) => (
        <g key={y}>
          <circle cx="38"  cy={y} r="2.6" fill="#E9CF7A" fillOpacity="0.22" />
          <circle cx="242" cy={y} r="2.6" fill="#E9CF7A" fillOpacity="0.22" />
          <circle cx="27"  cy={y + 12} r="1.6" fill="#E9CF7A" fillOpacity="0.12" />
          <circle cx="253" cy={y + 12} r="1.6" fill="#E9CF7A" fillOpacity="0.12" />
        </g>
      ))}
      <line x1="22" y1="236" x2="48" y2="236" stroke="#E9CF7A" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="232" y1="236" x2="258" y2="236" stroke="#E9CF7A" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="22" y1="300" x2="48" y2="300" stroke="#E9CF7A" strokeOpacity="0.16" strokeWidth="1" />
      <line x1="232" y1="300" x2="258" y2="300" stroke="#E9CF7A" strokeOpacity="0.16" strokeWidth="1" />
    </svg>
  );
}

/** Continuously animated audio waveform for the bottom banner. */
function BannerWaveform() {
  const HEIGHTS = [8,14,22,32,20,28,36,22,14,30,38,24,16,32,22,10,18,28,36,26,18,12,32,24,16,28,20,10,24,34,18,26,12,8,22,30,24,36,16,24];
  return (
    <div className="flex items-center justify-center gap-[3px] h-10 overflow-hidden" aria-hidden>
      {HEIGHTS.map((h, i) => (
        <motion.span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 3.5,
            height: h,
            background: 'linear-gradient(to top, #C9A227, #F6D67A)',
            transformOrigin: 'bottom',
          }}
          animate={{ scaleY: [0.2, 1, 0.3, 0.85, 0.15, 0.95, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.045, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/** Outward-pulsing broadcast rings. */
function DevBroadcastRings() {
  return (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-gold-300/35"
          style={{ width: 80, height: 80 }}
          animate={{ scale: [1, 3], opacity: [0.65, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.92, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}

function DevSpeakerOrb() {
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <DevBroadcastRings />
      <motion.span
        aria-hidden
        className="absolute rounded-full border border-dashed border-gold-300/30"
        style={{ width: 134, height: 134 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.span
        aria-hidden
        className="absolute rounded-full border border-gold-300/15"
        style={{ width: 108, height: 108 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at 32% 26%, #F8DD8C 0%, #DDB94B 38%, #C9A227 64%, #A6831A 100%)' }}
        animate={{
          scale: [1, 1.06, 1],
          boxShadow: [
            '0 0 18px 2px rgba(233,207,122,0.35)',
            '0 0 34px 8px rgba(233,207,122,0.55)',
            '0 0 18px 2px rgba(233,207,122,0.35)',
          ],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 48 48" width="46" height="46" fill="none" aria-hidden>
          <path d="M7 19h7l9-7v24l-9-7H7z" fill="#0B1D14" />
          {[
            { d: 'M27 18c3.4 3.4 3.4 8.6 0 12',     dur: 1.3, delay: 0    },
            { d: 'M31.5 13.5c6 6 6 15 0 21',         dur: 1.3, delay: 0.18 },
            { d: 'M36 9c8.6 8.6 8.6 21.4 0 30',      dur: 1.3, delay: 0.36 },
          ].map((a, i) => (
            <motion.path
              key={i}
              d={a.d}
              stroke="#0B1D14"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{ duration: a.dur, repeat: Infinity, delay: a.delay, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  );
}

/** Thin horizontal volume bar with accent fill + circular thumb. */
function VolumeBar({ pct, fill, idle }: { pct: number; fill: string; idle: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-2.5">
      <Volume2 size={13} className="text-parchment/35 shrink-0" />
      <div className="relative flex-1 h-[5px] rounded-full bg-white/10 overflow-visible">
        <div className={`absolute inset-y-0 left-0 rounded-full ${idle ? 'bg-slate-500/50' : fill}`}
             style={{ width: `${pct}%` }} />
        <div className={`absolute top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full shadow-md
                         ${idle ? 'bg-slate-400' : fill}`}
             style={{ left: `calc(${pct}% - 6.5px)` }} />
      </div>
    </div>
  );
}

export function DevicesShowcase() {
  const [outputLabel] = useLocalStorage<string>('isa:audioOutputLabel', 'System default');
  const [scanning, setScanning] = useState(false);
  const [outCount, setOutCount] = useState<number | null>(null);
  const [liveDevices, setLiveDevices] = useState<string[]>([]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        setLiveDevices(devs.filter((d) => d.kind === 'audiooutput').map((d) => d.label.toLowerCase()));
      }).catch(() => {});
    }
  }, []);

  const getDeviceStatus = (deviceName: string): 'playing' | 'online' | 'idle' => {
    const name = deviceName.toLowerCase().split(' ')[0];
    const label = outputLabel.toLowerCase();
    if (label !== 'system default' && (label.includes(name) || name.includes(label.split(' ')[0]))) return 'playing';
    if (liveDevices.some((l) => l.length > 0 && (l.includes(name) || name.includes(l.split(' ')[0])))) return 'online';
    return 'idle';
  };

  const rescan = async () => {
    setScanning(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setOutCount(devs.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications').length);
      } else { setOutCount(0); }
    } catch { setOutCount(0); }
    finally { setTimeout(() => setScanning(false), 600); }
  };

  return (
    <section
      id="devices"
      className="relative overflow-hidden text-parchment"
      style={{
        backgroundImage: "url('/devices-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* ══ legibility overlays ══ */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'rgba(6,14,10,0.12)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(4,10,7,0.62) 0%, rgba(4,10,7,0.22) 42%, rgba(4,10,7,0.02) 72%, rgba(4,10,7,0) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(4,10,7,0.30) 0%, rgba(4,10,7,0) 25%, rgba(4,10,7,0) 70%, rgba(4,10,7,0.32) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 120% 120% at 55% 45%, transparent 58%, rgba(2,6,4,0.28) 100%)' }} />
        {[
          { r: 310, t: 38,  s: 2.2 },
          { r: 238, t: 18,  s: 1.6 },
          { r: 192, t: 54,  s: 1.4 },
          { r: 270, t: 72,  s: 1.8 },
          { r: 160, t: 28,  s: 1.3 },
          { r: 340, t: 58,  s: 2   },
        ].map((st, i) => (
          <motion.span key={i} className="absolute rounded-full"
            style={{ right: st.r, top: st.t, width: st.s, height: st.s, background: '#E9CF7A' }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2 + i * 0.38, repeat: Infinity, delay: i * 0.52, ease: 'easeInOut' }}
          />
        ))}
        <div className="absolute inset-0 pattern-bg opacity-[0.04]" />
      </div>

      {/* ══ content ══ */}
      <div className="relative max-w-7xl mx-auto px-6 py-6 md:py-8">

        {/* ── two-column grid: heading+cards LEFT, mihrab RIGHT ── */}
        <div className="grid lg:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* LEFT column: heading + device cards + pills + banner */}
          <motion.div
            initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6 }}
            className="flex flex-col gap-4"
          >
            {/* heading */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur">
                  <Radio size={12} className="rotate-90" /> Connected everywhere
                </span>
                <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-[1.04]">
                  <span className="text-parchment">One tap, every speaker</span><br />
                  <span className="bg-clip-text text-transparent bg-gold-gradient">in your home answers.</span>
                </h2>
                <p className="mt-4 text-lg text-parchment/75 max-w-xl leading-relaxed">
                  Route Azan and Quran to your earbuds, a Bluetooth speaker, the whole house —
                  phones, tablets, desktops and smart speakers, kept in sync.
                </p>
              </div>
            </div>

            {/* ↓ device cards, pills and banner follow inside this same column ↓ */}
            <div className="grid sm:grid-cols-2 gap-3">
              {DEVICES.map((d, i) => {
                const status = getDeviceStatus(d.name);
                const badge = BADGE[status];
                const idle = status === 'idle';
                return (
                  <motion.div
                    key={d.name}
                    initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.45 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 p-3.5"
                    style={{ background: 'linear-gradient(145deg,#0F2A1C 0%,#0B1A12 100%)' }}
                  >
                    <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br ${d.accent} opacity-20 blur-xl`} />

                    <div className="relative flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${d.accent} text-white shadow-md shrink-0`}>
                        <d.Icon size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-[13px] font-bold text-parchment leading-tight truncate">{d.name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${badge.cls}`}>
                            {status === 'playing'
                              ? <span className="flex items-end gap-[2px] h-3">
                                  {[0, 1, 2].map((b) => (
                                    <motion.span key={b}
                                      className="w-[2.5px] rounded-full bg-gold-400"
                                      animate={{ height: ['2px', '9px', '3px', '8px', '2px'] }}
                                      transition={{ duration: 0.85, repeat: Infinity, delay: b * 0.11, ease: 'easeInOut' }}
                                      style={{ height: '2px' }}
                                    />
                                  ))}
                                </span>
                              : <motion.span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.ring}`}
                                  animate={idle ? {} : { opacity: [1, 0.35, 1] }}
                                  transition={{ duration: 1.6, repeat: Infinity }}
                                />
                            }
                            {status === 'playing' ? 'Playing' : status === 'online' ? 'Online' : 'Idle'}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-parchment/50">
                          <MapPin size={9} /> {d.owner}
                        </p>
                      </div>
                    </div>

                    <VolumeBar pct={d.vol} fill={d.fill} idle={idle} />
                  </motion.div>
                );
              })}
            </div>

            {/* Platform integration pills */}
            <div className="flex flex-wrap gap-2.5">
              {PLATFORMS.map(({ label, Icon }) => (
                <span key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-parchment/60 backdrop-blur">
                  <Icon size={14} className="text-gold-300/55" /> {label}
                </span>
              ))}
            </div>

            {/* "Everything in harmony" banner */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 flex items-center gap-5 px-5 py-4"
              style={{ background: 'linear-gradient(135deg,#0F2A1C 0%,#0D2217 55%,#0B1D14 100%)' }}
            >
              <div className="flex items-center gap-3.5 shrink-0">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
                  <svg viewBox="0 0 54 64" width="44" height="50" fill="none" aria-hidden>
                    <defs>
                      <radialGradient id="bhGlow" cx="50%" cy="65%" r="58%">
                        <stop offset="0%" stopColor="#E9CF7A" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#E9CF7A" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="27" cy="56" rx="24" ry="10" fill="url(#bhGlow)" />
                    <path d="M17 64V38C17 22 23 12 27 9 31 12 37 22 37 38V64z" fill="#E9CF7A" opacity="0.9" />
                    <path d="M27 9C27 2 23 0 23 0 23 0 20 4 20 9 22.5 7 25 6.5 27 9z" fill="#E9CF7A" />
                    <circle cx="27" cy="0" r="2.5" fill="#E9CF7A" />
                    <path d="M10 64V46Q10 38 17 37" stroke="#E9CF7A" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M44 64V46Q44 38 37 37" stroke="#E9CF7A" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M4 22L5.4 18 6.8 22 10 23 6.8 24 5.4 28 4 24 0 23z" fill="#E9CF7A" opacity="0.82" />
                    <path d="M44 14L45 11 46 14 49 15 46 16 45 19 44 16 41 15z" fill="#E9CF7A" opacity="0.7" />
                  </svg>
                </motion.div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-gold-300">Everything in harmony</p>
                  <p className="text-xs text-parchment/60 mt-0.5">Azan. Quran. Wherever you are.</p>
                </div>
              </div>
              <div className="flex-1 min-w-0"><BannerWaveform /></div>
              <div className="relative flex items-end gap-3 shrink-0 pb-1">
                <motion.div animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: 'top center' }}>
                  <DevLantern className="w-9 h-auto" />
                </motion.div>
                <motion.div animate={{ rotate: [3.5, -3.5, 3.5] }} transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.55 }} style={{ transformOrigin: 'top center' }}>
                  <DevLantern className="w-7 h-auto" />
                </motion.div>
                <motion.span className="absolute -top-1 left-0 text-gold-300 font-bold select-none" style={{ fontSize: 14 }} animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }} transition={{ duration: 2.1, repeat: Infinity }}>✦</motion.span>
                <motion.span className="absolute -top-2 right-0 text-gold-200 select-none" style={{ fontSize: 11 }} animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.35 }}>✦</motion.span>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT column: Manage-devices button (top-right) above the mihrab card */}
          <motion.div
            initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: 0.12 }}
            className="flex flex-col gap-4"
          >
            {/* Manage devices — sits at the top-right, above the mihrab */}
            <Link
              href="/dashboard/devices"
              className="inline-flex items-center gap-2 self-end rounded-full border border-gold-300/30 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-gold-200 backdrop-blur hover:bg-white/[0.12] transition shrink-0"
            >
              <Settings size={15} /> Manage devices <ArrowRight size={14} />
            </Link>

            {/* mihrab card */}
            <div
              className="relative overflow-hidden rounded-3xl border border-white/10 flex flex-col"
              style={{ background: 'linear-gradient(160deg,#0F2A1C 0%,#0B1D14 55%,#091510 100%)' }}
            >
              <MughalArch className="absolute inset-x-0 top-0 w-full h-full" />

            <div className="relative flex flex-col items-center px-6 pt-40 pb-6">
              <DevSpeakerOrb />

              <p className="mt-4 text-[10px] font-bold tracking-[0.22em] uppercase text-gold-400">Current Output</p>
              <p className="mt-1 text-xl font-bold text-parchment">{outputLabel}</p>

              <div className="mt-5 flex gap-2 justify-center">
                <button
                  onClick={rescan}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-parchment/80 hover:bg-white/[0.13] transition"
                >
                  <RefreshCw size={11} className={`text-gold-300 ${scanning ? 'animate-spin' : ''}`} />
                  {scanning ? 'Scanning…' : 'Rescan'}
                </button>
                <Link
                  href="/dashboard/devices"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-parchment/80 hover:bg-white/[0.13] transition"
                >
                  <Bluetooth size={11} className="text-gold-300" /> Pair
                </Link>
              </div>

              {outCount !== null && !scanning && (
                <p className="mt-3 text-xs text-parchment/50 text-center">
                  {outCount > 0
                    ? <><CheckCircle2 size={11} className="inline mr-1 text-gold-400" />{outCount} output{outCount !== 1 ? 's' : ''} detected</>
                    : 'Connect a device to detect outputs'}
                </p>
              )}
            </div>

              <MosqueSilhouette className="shrink-0 w-full text-midnight-900/60" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
