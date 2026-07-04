'use client';

/**
 * Public marketing landing page for Noor (the "/" route).
 *
 * Layout, top to bottom: scroll-aware nav → dark hero (background photo + headline,
 * CTAs, social proof on the left; the live prayer card on the right; a feature strip
 * underneath) → Azan/Quran/Devices showcases → feature grid → closing CTA → footer.
 * The hero's right-hand card shows the visitor's real prayer times (falling back to
 * a London mockup until a location is set). Animations are framer-motion.
 *
 * The hero background expects an image at /hero-bg.jpg (web/public/hero-bg.jpg). Until
 * it's added, the emerald-950 base + gradient overlays keep the section on-theme.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Compass, Sparkles, Headphones,
  ShieldCheck, User, Sun, CalendarDays, MonitorDown,
} from 'lucide-react';

import { useDesktopDownloadUrl } from '@/lib/desktopApp';
import { HeroPrayerCard } from '@/components/HeroPrayerCard';
import { AzanShowcase, QuranShowcase, DevicesShowcase } from '@/components/LandingShowcase';
import FaithShowcase from '@/components/FaithShowcase';
import { useStoredLocation } from '@/lib/useStoredLocation';

// Top-nav links (match the reference design).
const NAV_LINKS = [
  { href: '/dashboard/prayer-times', label: 'Prayer Times' },
  { href: '/dashboard/quran',        label: 'Quran' },
  { href: '/dashboard/qibla',        label: 'Qibla' },
  { href: '/dashboard/recitation',   label: 'Learn' },
  { href: '#features',               label: 'Features' },
];

// Four overlapping "user" avatars for the social-proof row (gradient placeholders —
// swap for real photos by dropping them in and mapping over <img> instead).
const AVATARS = ['from-gold-400 to-gold-600', 'from-gold-500 to-gold-700', 'from-midnight-600 to-midnight-800', 'from-gold-600 to-midnight-700'];

// The trust strip beneath the hero.
const STRIP = [
  { icon: Sun,          title: 'Accurate Prayer Times', sub: 'Worldwide Coverage' },
  { icon: BookOpen,     title: 'Quran with Translation', sub: '50+ Languages' },
  { icon: Compass,      title: 'Qibla Direction',        sub: 'Anywhere Anytime' },
  { icon: CalendarDays, title: 'Islamic Calendar',       sub: 'Hijri & Gregorian' },
  { icon: ShieldCheck,  title: '100% Private & Secure',  sub: 'Your data, your trust' },
];

/** Renders the full marketing landing page. */
export default function HomePage() {
  // Visitor's saved location (if any) — passed to the hero card so it can show
  // real prayer times immediately instead of the placeholder.
  const loc = useStoredLocation();
  const desktopDownloadUrl = useDesktopDownloadUrl();

  // Nav is transparent over the hero photo at the top, then gains a dark blurred
  // bar once the user scrolls past the fold.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="relative overflow-x-hidden">
      {/* ── nav (fixed, scroll-aware) ── */}
      {/* Nav keeps a translucent background at all times: more transparent over the
          first section, then more opaque (less transparent) once scrolled. */}
      <header className={`landing-nav fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-midnight-900/85 backdrop-blur-xl border-b border-white/10' : 'bg-midnight-900/30 backdrop-blur-md border-b border-white/5'}`}>
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ismaa_logo_dark.png"
              alt="ISMAA — Islamic Smart Assistant"
              className="h-[62px] w-auto object-contain"
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5)) brightness(1.15)' }}
              draggable={false}
            />
            <span className="ml-2 hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold-300/30 bg-gold-300/10 text-gold-200 text-xs font-semibold px-3 py-1">
              <Sparkles size={12} /> AI-Powered Islamic Assistant
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-semibold text-parchment/85 hover:text-gold-300 transition">
                {l.label}
              </Link>
            ))}
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-gold-300/40 bg-gold-300/5 text-gold-100 px-4 py-2.5 font-semibold text-sm hover:bg-gold-300/15 transition"
          >
            Open Dashboard <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      {/* ── hero ── (dark photographic section: copy + CTAs left, live prayer card right) */}
      <section id="prayer" className="relative isolate overflow-hidden bg-midnight-900 text-parchment">
        {/* background photo + legibility overlays (heavier on the left where the text sits) */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/hero-bg.jpg')" }} />
          <div className="absolute inset-0 bg-midnight-900/30" />
          <div className="absolute inset-0 pattern-bg opacity-[0.06]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-28 lg:pt-32 pb-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            {/* LEFT: badge, headline, copy, CTAs, social proof */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-300/10 text-gold-300 text-xs font-semibold px-3 py-1">
                <Sparkles size={12} /> New &amp; Improved
              </span>
              {/* hero heading — reduced one step smaller (3xl/4xl/5xl) per request */}
              <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl leading-[1.04] text-parchment">
                {/* Faith + Journey share one row when space allows, wrap otherwise; Guidance stays on its own line */}
                Your Faith, Your Journey,<br />
                <span className="bg-clip-text text-transparent bg-gold-gradient">Our Guidance.</span>
              </h1>
              <p className="text-lg text-parchment/75 max-w-xl leading-relaxed">
                Noor unites Prayer, Quran, and daily Islamic tools in one intelligent assistant —
                beautifully designed to elevate your connection with Allah.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient text-midnight-900 px-6 py-3.5 font-bold shadow-glow-gold hover:brightness-105 transition"
                >
                  <Headphones size={18} /> Launch Dashboard <ArrowRight size={18} />
                </Link>
                <Link
                  href="/dashboard/quran"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 text-parchment px-6 py-3.5 font-semibold hover:bg-white/10 transition"
                >
                  <BookOpen size={18} /> Explore Quran
                </Link>
                <a
                  href={desktopDownloadUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 font-bold shadow-lg shadow-emerald-900/40 transition-all hover:shadow-emerald-700/50 hover:scale-[1.02] active:scale-100"
                >
                  <MonitorDown size={18} /> Download Desktop App
                </a>
              </div>
              <div className="flex items-center gap-3 pt-3">
                <div className="flex -space-x-3">
                  {AVATARS.map((g, i) => (
                    <span key={i} className={`w-10 h-10 rounded-full border-2 border-midnight-900 bg-gradient-to-br ${g} flex items-center justify-center`}>
                      <User size={16} className="text-white/90" />
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-tight">
                  <span className="text-gold-300 font-bold">Trusted by 1M+ Muslims</span><br />
                  <span className="text-parchment/70">in 200+ countries worldwide</span>
                </p>
              </div>
            </motion.div>

            {/* RIGHT: live prayer card (design styling, real data, London mockup fallback) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="lg:-mt-8 lg:-ml-6"
            >
              <HeroPrayerCard
                lat={loc.lat ?? undefined}
                lng={loc.lng ?? undefined}
                city={loc.city}
                country={loc.country}
                method={loc.method}
              />
            </motion.div>
          </div>

          {/* feature / trust strip */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-12 glass-dark rounded-2xl px-5 py-5"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-5">
              {STRIP.map((s) => (
                <div key={s.title} className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full border border-gold-300/30 bg-gold-300/10 text-gold-300 flex items-center justify-center shrink-0">
                    <s.icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">{s.title}</p>
                    <p className="text-xs text-parchment/55 leading-tight">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── feature showcases ── (self-contained marketing sections; their #ids back the nav anchors)
          FaithShowcase and AzanShowcase are swapped: Faith sits in 2nd position,
          Azan in 4th. #features still wraps FaithShowcase for the nav anchor. */}
      <div id="features">
        <FaithShowcase />
      </div>
      <QuranShowcase />
      <AzanShowcase />
      <DevicesShowcase />

      {/* ── footer ── */}
      <footer className="relative border-t border-gold-300/15">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink/60">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ismaa_logo_dark.png" alt="ISMAA" className="h-6 w-auto object-contain" draggable={false} />
            • Islamic Smart Assistant Ecosystem
          </div>
          <p>Built with ihsaan • Recitations sourced from islamic.network (verified)</p>
        </div>
      </footer>
    </main>
  );
}

