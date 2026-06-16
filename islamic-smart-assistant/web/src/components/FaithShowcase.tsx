'use client';

/**
 * "A Complete Islamic Lifestyle, Beautifully Orchestrated" — the marketing
 * feature showcase + closing CTA, rebuilt to match the approved design.
 *
 * It is one continuous section sitting on a warm, mosque-at-dawn backdrop:
 *   1. an eyebrow pill ("Blessed by Faith, Guided by Allah") + serif headline,
 *   2. an 8-card feature grid — each card carries a hexagon icon, its own accent
 *      colour, a faint Islamic corner motif, an audio waveform (Azan / Tilawat)
 *      or a themed watermark, and a small arrow button, and
 *   3. a deep-green CTA banner with a glowing lantern + Quran on the left and a
 *      dotted world map (golden pins joined by arcs over a mosque skyline) on
 *      the right.
 *
 * All artwork is inline SVG / CSS so it stays razor-sharp at any DPI and ships
 * no extra image assets — the same bundle the desktop (Electron) build loads.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bell, BookOpen, Compass, Volume2, Smartphone, Languages, ShieldCheck,
  ArrowRight, Moon, Heart, MapPin, LayoutGrid, CalendarDays, Globe2,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════════════
   Feature catalogue — drives the 8 cards. Every colour token below appears as
   a complete literal so Tailwind's JIT keeps the class in the build.
   ════════════════════════════════════════════════════════════════════════ */

type Deco = 'wave' | 'motif';

type Feature = {
  icon: any;
  title: string;
  desc: string;
  href: string;
  grad: string;   // hexagon gradient
  text: string;   // title colour
  arrow: string;  // arrow-button background
  tint: string;   // soft bottom tint (gradient stop)
  glow: string;   // corner glow blob
  deco: Deco;     // top-right decoration: audio waveform or geometric motif
};

const FEATURES: Feature[] = [
  {
    icon: Bell, title: 'Auto Azan',
    desc: 'Accurate prayer times with beautiful Azan reminders worldwide.',
    href: '/dashboard/azan',
    grad: 'from-gold-500 to-gold-700', text: 'text-gold-700',
    arrow: 'bg-gold-600', tint: 'to-gold-50', glow: 'bg-gold-400', deco: 'wave',
  },
  {
    icon: BookOpen, title: 'Full Quran',
    desc: 'All 114 Surahs with Arabic, transliteration, and multiple translations.',
    href: '/dashboard/quran',
    grad: 'from-gold-400 to-gold-600', text: 'text-gold-600',
    arrow: 'bg-gold-500', tint: 'to-gold-50', glow: 'bg-gold-300', deco: 'motif',
  },
  {
    icon: Compass, title: 'Qibla & Times',
    desc: 'Precise Qibla direction and prayer times for your location.',
    href: '/dashboard/qibla',
    grad: 'from-midnight-600 to-midnight-800', text: 'text-midnight-700',
    arrow: 'bg-midnight-700', tint: 'to-parchment', glow: 'bg-midnight-400', deco: 'motif',
  },
  {
    icon: Volume2, title: 'Ayah-by-Ayah Tilawat',
    desc: 'Audio recitation with translation in multiple languages.',
    href: '/dashboard/recitation',
    grad: 'from-gold-600 to-gold-900', text: 'text-gold-700',
    arrow: 'bg-gold-700', tint: 'to-gold-50', glow: 'bg-gold-500', deco: 'wave',
  },
  {
    icon: Smartphone, title: 'Multi-device Sync',
    desc: 'Sync across all your devices. Your data, always with you.',
    href: '/dashboard/devices',
    grad: 'from-midnight-700 to-midnight-900', text: 'text-midnight-700',
    arrow: 'bg-midnight-800', tint: 'to-parchment', glow: 'bg-midnight-600', deco: 'motif',
  },
  {
    icon: CalendarDays, title: 'Smart Scheduler',
    desc: 'Personalized plans, reminders, and Islamic events tracking.',
    href: '/dashboard/recitation',
    grad: 'from-gold-400 to-gold-600', text: 'text-gold-600',
    arrow: 'bg-gold-500', tint: 'to-gold-50', glow: 'bg-gold-300', deco: 'motif',
  },
  {
    icon: Globe2, title: '10+ Languages',
    desc: 'Understand the Quran in 10+ global languages seamlessly.',
    href: '/dashboard/settings',
    grad: 'from-gold-500 to-midnight-700', text: 'text-gold-700',
    arrow: 'bg-gold-600', tint: 'to-gold-50', glow: 'bg-gold-400', deco: 'motif',
  },
  {
    icon: ShieldCheck, title: 'Privacy First',
    desc: 'Your worship is private. Your data is secure and protected.',
    href: '/dashboard/settings',
    grad: 'from-midnight-700 to-midnight-900', text: 'text-midnight-700',
    arrow: 'bg-midnight-800', tint: 'to-parchment', glow: 'bg-midnight-600', deco: 'motif',
  },
];

/* ════════════════════════════════════════════════════════════════════════
   Small decorative primitives
   ════════════════════════════════════════════════════════════════════════ */

/** A pointy-top hexagon icon chip with a gradient fill and soft drop-shadow.
 *  Gently floats (staggered per card via `delay`) for a touch of life. */
function HexIcon({ grad, delay = 0, children }: { grad: string; delay?: number; children: React.ReactNode }) {
  return (
    <span
      className="relative inline-flex items-center justify-center animate-float"
      style={{ width: 56, height: 62, animationDelay: `${delay}s`, animationDuration: '2s' }}
    >
      <span
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-br ${grad}`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          filter: 'drop-shadow(0 8px 12px rgba(11,20,16,0.22))',
        }}
      />
      <span className="relative text-white">{children}</span>
    </span>
  );
}


/** A faint eight-point geometric corner motif (top-right of a card). */
function CornerMotif({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeWidth="2" fill="none">
        <rect x="26" y="26" width="48" height="48" rx="3" transform="rotate(0 50 50)" />
        <rect x="26" y="26" width="48" height="48" rx="3" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="33" strokeOpacity="0.7" />
        <circle cx="50" cy="50" r="12" />
      </g>
    </svg>
  );
}

/** A small live audio waveform / equalizer strip (top-right of Azan & Tilawat).
 *  Each bar pulses continuously so the card feels alive. */
function Waveform({ className = '' }: { className?: string }) {
  const bars = [6, 12, 20, 9, 16, 24, 11, 18, 7, 14, 22, 8];
  return (
    <span className={`inline-flex items-center gap-[3px] h-7 ${className}`} aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3.5px] rounded-full bg-current"
          animate={{ height: [h, Math.min(28, h + 9), Math.max(4, h - 6), h] }}
          transition={{ duration: 1.3 + (i % 5) * 0.18, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
          style={{ height: h }}
        />
      ))}
    </span>
  );
}

/** Mosque skyline silhouette — dome flanked by two minarets. */
function MosqueSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 200" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="fsMosque" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <path d="M70 200V70a8 8 0 0 1 16 0v130z" fill="url(#fsMosque)" />
      <path d="M78 70c0-10-7-14-7-22s7-10 7-18 7 10 7 18-7 12-7 22z" fill="url(#fsMosque)" />
      <circle cx="78" cy="26" r="4" fill="currentColor" fillOpacity="0.6" />
      <path d="M434 200V70a8 8 0 0 1 16 0v130z" fill="url(#fsMosque)" />
      <path d="M442 70c0-10-7-14-7-22s7-10 7-18 7 10 7 18-7 12-7 22z" fill="url(#fsMosque)" />
      <circle cx="442" cy="26" r="4" fill="currentColor" fillOpacity="0.6" />
      <path d="M150 200v-70h220v70z" fill="url(#fsMosque)" />
      <path d="M160 130c0-55 45-80 100-80s100 25 100 80z" fill="url(#fsMosque)" />
      <path d="M260 50c0-14-9-18-9-28s9-14 9-22 9 12 9 22-9 14-9 28z" fill="url(#fsMosque)" />
      <circle cx="260" cy="2" r="5" fill="currentColor" fillOpacity="0.65" />
      <path d="M240 200v-34a20 20 0 0 1 40 0v34z" fill="currentColor" fillOpacity="0.22" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CTA banner artwork
   ════════════════════════════════════════════════════════════════════════ */

/** Glowing ornate lantern + crescent + stars + Quran on a stand (banner left). */
function LanternArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 340" fill="none" aria-hidden className={className}>
      <defs>
        <radialGradient id="fsGlow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#FCE7A6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F2C94C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F2C94C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fsBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6D67A" />
          <stop offset="55%" stopColor="#D9A93B" />
          <stop offset="100%" stopColor="#A6791E" />
        </linearGradient>
      </defs>

      {/* warm halo */}
      <circle cx="118" cy="150" r="130" fill="url(#fsGlow)" />

      {/* crescent moon + stars */}
      <path d="M196 56a30 30 0 1 0 18 54 24 24 0 1 1-18-54z" fill="#F6D67A" opacity="0.95" />
      <g fill="#FCEBA8">
        <path d="M232 92l2.4 5 5.6.5-4.3 3.7 1.4 5.5-4.9-3-4.9 3 1.4-5.5-4.3-3.7 5.6-.5z" />
        <circle cx="170" cy="34" r="2.4" />
        <circle cx="214" cy="140" r="2" />
        <circle cx="150" cy="70" r="1.6" />
      </g>

      {/* suspension chain */}
      <path d="M118 6V40" stroke="url(#fsBrass)" strokeWidth="3" />
      <circle cx="118" cy="6" r="4" fill="url(#fsBrass)" />

      {/* lantern cap */}
      <path d="M96 56c0-14 10-22 22-22s22 8 22 22z" fill="url(#fsBrass)" />
      <path d="M118 28c2 0 4 3 4 7h-8c0-4 2-7 4-7z" fill="url(#fsBrass)" />

      {/* lantern body */}
      <path d="M92 64h52l8 96c0 14-18 22-34 22s-34-8-34-22z" fill="url(#fsBrass)" fillOpacity="0.92" />
      <path d="M100 70h36l5 84c0 9-12 14-23 14s-23-5-23-14z" fill="#FFF4CE" fillOpacity="0.85" />
      {/* lattice + flame */}
      <g stroke="#A6791E" strokeWidth="2" opacity="0.7">
        <path d="M118 70v98M104 96h28M102 124h32" />
      </g>
      <path d="M118 104c7 6 9 13 4 20-2 3-1 7 2 9-9 1-15-6-13-15 1-5 4-9 7-14z" fill="#F2994A" />
      <path d="M118 116c3 3 4 7 1 11-3-1-4-5-1-11z" fill="#FCEBA8" />

      {/* lantern base */}
      <path d="M96 182h44l-6 18H102z" fill="url(#fsBrass)" />
      <rect x="106" y="200" width="28" height="8" rx="2" fill="url(#fsBrass)" />

      {/* Quran on a rehal (X-stand) */}
      <g transform="translate(8 232)">
        <path d="M20 70L96 44M96 70L20 44" stroke="#8A5A2B" strokeWidth="7" strokeLinecap="round" />
        <path d="M10 40c20-12 44-12 48 0 4-12 28-12 48 0-20 6-44 6-48 0-4 6-28 6-48 0z" fill="#3F7A52" />
        <path d="M58 40v22" stroke="#23472F" strokeWidth="2.5" />
        <path d="M14 41c18-8 38-8 44 1 6-9 26-9 44-1" stroke="#F6D67A" strokeWidth="2" fill="none" />
      </g>

      {/* small potted plant */}
      <g transform="translate(150 268)">
        <path d="M12 36h28l-4 30H16z" fill="#C77F3A" />
        <path d="M26 36c-6-12-2-26 0-30 2 4 6 18 0 30z" fill="#3F7A52" />
        <path d="M26 36c-10-6-14-16-15-22 8 2 18 10 15 22z" fill="#4E9266" />
        <path d="M26 36c10-6 14-16 15-22-8 2-18 10-15 22z" fill="#4E9266" />
      </g>
    </svg>
  );
}

/** Dotted world map with golden pins joined by arcs (banner right). */
function WorldArcArt({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className}`}>
      {/* dotted map texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(246,214,122,0.55) 1.3px, transparent 1.4px)',
          backgroundSize: '14px 14px',
          maskImage: 'radial-gradient(120% 90% at 65% 45%, #000 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 65% 45%, #000 35%, transparent 80%)',
          opacity: 0.5,
        }}
      />
      {/* arcs + pins */}
      <svg viewBox="0 0 420 240" fill="none" className="absolute inset-0 w-full h-full">
        <g stroke="#F6D67A" strokeWidth="1.6" fill="none" opacity="0.85" strokeLinecap="round">
          <path d="M150 150 C200 70 280 70 330 110" strokeDasharray="2 6" />
          <path d="M330 110 C360 130 380 120 392 96" strokeDasharray="2 6" />
        </g>
        {[
          [150, 150], [330, 110], [392, 96],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="9" fill="#F6D67A" opacity="0.25" />
            <path d="M0 -9c-5 0-9 4-9 9 0 6 9 14 9 14s9-8 9-14c0-5-4-9-9-9z" fill="#F6D67A" />
            <circle cy="0" r="3" fill="#1F3147" />
          </g>
        ))}
      </svg>
      <MosqueSilhouette className="absolute bottom-0 right-0 w-3/4 text-gold-200/70" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main section
   ════════════════════════════════════════════════════════════════════════ */

export default function FaithShowcase() {
  return (
    <section className="relative overflow-hidden">
      {/* ── photographic mosque-at-dawn backdrop ── (shown full-width & clear,
          its true landscape aspect preserved so neither mosque is cropped, then
          softly melted into the page along its lower edge) */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-x-0 top-0 w-full min-h-[26rem] bg-cover bg-top"
          style={{
            aspectRatio: '1536 / 1024',
            backgroundImage: "url('/features-bg.jpg')",
            WebkitMaskImage: 'linear-gradient(to bottom, #000 80%, transparent 99%)',
            maskImage: 'linear-gradient(to bottom, #000 80%, transparent 99%)',
          }}
        />
        {/* gentle clarity wash — only at the very top, just enough to keep the
            heading crisp without washing the photo out */}
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
        {/* ambient drifting glow for subtle background motion */}
        <div className="absolute -top-8 left-[12%] w-[30rem] h-[30rem] rounded-full bg-gold-300/10 blur-3xl animate-aurora" />
        <div className="absolute top-28 right-[8%] w-[24rem] h-[24rem] rounded-full bg-gold-300/15 blur-3xl animate-aurora" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
        {/* ── header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-gold-300/50 px-4 py-1.5 text-sm font-semibold text-gold-700 shadow-sm">
            <Moon size={15} className="fill-gold-400 text-gold-500" /> Blessed by Faith, Guided by Allah
          </span>
          <h2 className="section-heading mt-6">
            <span className="text-ink">A Complete Islamic Lifestyle,</span>
            <br />
            <span className="text-gold-700">Beautifully Orchestrated</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-ink/80 leading-relaxed">
            All the essential Islamic tools in one place to strengthen your faith,
            simplify your worship, and connect you with what matters most.
          </p>
        </motion.div>

        {/* ── feature grid ── */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="animate-float h-full"
              style={{ animationDelay: `${i * 0.25}s`, animationDuration: '2.8s' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/20 backdrop-blur-md p-6 pb-16 h-full min-h-[260px] transition-shadow duration-300 shadow-[0_4px_10px_rgba(11,20,16,0.07),0_26px_50px_-18px_rgba(11,20,16,0.30)] hover:shadow-[0_12px_24px_rgba(11,20,16,0.12),0_44px_72px_-22px_rgba(11,20,16,0.42)]"
              >
                {/* soft corner glow */}
                <div className={`absolute -top-14 -right-14 w-36 h-36 rounded-full ${f.glow} opacity-[0.18] group-hover:opacity-35 blur-xl transition`} />

                {/* top row: hexagon icon + decoration */}
                <div className="relative flex items-start justify-between">
                  <HexIcon grad={f.grad} delay={i * 0.35}>
                    <f.icon size={24} />
                  </HexIcon>
                  {f.deco === 'wave'
                    ? <Waveform className={`mt-2 ${f.text} opacity-60`} />
                    : <CornerMotif className={`-mt-2 -mr-2 w-20 h-20 ${f.text} opacity-[0.18]`} />}
                </div>

                <h3 className={`relative mt-5 text-lg font-extrabold ${f.text}`}>{f.title}</h3>
                <p className="relative mt-2 text-sm text-ink/80 leading-relaxed">{f.desc}</p>

                {/* watermark for waveform cards too — keep all cards balanced */}
                <f.icon
                  size={92}
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-4 right-3 ${f.text} opacity-[0.08]`}
                />

                {/* arrow button */}
                <Link
                  href={f.href}
                  aria-label={`Open ${f.title}`}
                  className={`absolute bottom-5 right-5 inline-flex items-center justify-center w-9 h-9 rounded-xl text-white ${f.arrow} shadow-md transition group-hover:translate-x-0.5`}
                >
                  <ArrowRight size={17} />
                </Link>
              </motion.div>
            </div>
          ))}
        </div>

        {/* ── closing CTA banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative mt-14 overflow-hidden rounded-3xl bg-mosque-gradient text-parchment shadow-glow-gold"
        >
          <div className="absolute inset-0 pattern-bg opacity-[0.12] pointer-events-none" />
          {/* left + right artwork */}
          <LanternArt className="absolute left-2 bottom-0 h-[112%] w-auto opacity-95 hidden sm:block" />
          <WorldArcArt className="absolute right-0 top-0 h-full w-1/2 hidden md:block" />

          {/* center content */}
          <div className="relative px-6 py-12 md:px-10 md:py-16 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1 text-xs font-bold text-gold-700 shadow-sm">
              <Heart size={13} className="fill-rose-500 text-rose-500" /> You&apos;re never alone
            </span>
            <h3 className="h-display font-bold mt-4 leading-tight text-3xl md:text-5xl">
              <span className="text-parchment">Let every prayer find you,</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gold-gradient">wherever you are.</span>
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-sm md:text-base text-parchment/70 leading-relaxed">
              So your location, time, no matter where you are in the world,
              and keep every divine appointment right on time.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-gold-gradient hover:brightness-105 text-midnight-900 px-6 py-3 font-bold shadow-glow-gold transition"
              >
                <LayoutGrid size={18} /> Launch Dashboard <ArrowRight size={18} />
              </Link>
              <Link
                href="/dashboard/prayer-times"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 text-parchment px-6 py-3 font-semibold hover:bg-white/10 transition"
              >
                <MapPin size={18} /> Set My Location
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
