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
  ArrowRight, Moon, CalendarDays, Globe2,
  Heart, BookMarked, Scale, Calculator,
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
  {
    icon: Heart, title: 'Duas & Supplications',
    desc: 'Masnoon & Ramadan duas with Arabic, transliteration and translation.',
    href: '/dashboard/advanced',
    grad: 'from-rose-500 to-rose-700', text: 'text-rose-700',
    arrow: 'bg-rose-600', tint: 'to-rose-50', glow: 'bg-rose-400', deco: 'motif',
  },
  {
    icon: BookMarked, title: 'Hadees Library',
    desc: 'Full Sehah-e-Sittah collections with Arabic text and translation.',
    href: '/dashboard/advanced',
    grad: 'from-midnight-600 to-midnight-800', text: 'text-midnight-700',
    arrow: 'bg-midnight-700', tint: 'to-parchment', glow: 'bg-midnight-400', deco: 'motif',
  },
  {
    icon: Scale, title: 'Islamic Masail',
    desc: 'Authentic rulings on everyday questions from verified scholars.',
    href: '/dashboard/advanced',
    grad: 'from-amber-500 to-amber-700', text: 'text-amber-700',
    arrow: 'bg-amber-600', tint: 'to-amber-50', glow: 'bg-amber-400', deco: 'motif',
  },
  {
    icon: Calculator, title: 'Islamic Calculators',
    desc: 'Zakat, Qurbani, Inheritance, Fidyah & more — precise Islamic tools.',
    href: '/dashboard/advanced',
    grad: 'from-violet-600 to-violet-800', text: 'text-violet-700',
    arrow: 'bg-violet-700', tint: 'to-violet-50', glow: 'bg-violet-400', deco: 'motif',
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
                className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/20 backdrop-blur-md p-5 pb-12 h-full min-h-[196px] transition-shadow duration-300 shadow-[0_4px_10px_rgba(11,20,16,0.07),0_26px_50px_-18px_rgba(11,20,16,0.30)] hover:shadow-[0_12px_24px_rgba(11,20,16,0.12),0_44px_72px_-22px_rgba(11,20,16,0.42)]"
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

                <h3 className={`relative mt-4 text-lg font-extrabold ${f.text}`}>{f.title}</h3>
                <p className="relative mt-1.5 text-sm text-ink/80 leading-relaxed">{f.desc}</p>

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
                  className={`absolute bottom-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-xl text-white ${f.arrow} shadow-md transition group-hover:translate-x-0.5`}
                >
                  <ArrowRight size={17} />
                </Link>
              </motion.div>
            </div>
          ))}
        </div>

        {/* closing CTA banner removed */}
      </div>
    </section>
  );
}
