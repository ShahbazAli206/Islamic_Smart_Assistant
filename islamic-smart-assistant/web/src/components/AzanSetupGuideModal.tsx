'use client';

// Glass "how to set up Auto-Azan" guide, opened from the home hero's
// "Azan at Your Home" card. A vertical timeline of the 3 real steps (Prayer
// Times settings → Azan Voices selection → enabling Auto-Azan), each linking
// to the actual dashboard route. Mirrors PromoPopup's glass/blur visual
// language (see IsmaaPromoKit.tsx) but sized taller with its own scroll
// region, closer to OnboardingSetup.tsx's shell — the marketing hero is
// always dark-themed, so unlike dashboard popups this has no light variant.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass, BellRing, Power, ArrowRight, MonitorDown } from 'lucide-react';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { DownloadDesktopButton } from '@/components/IsmaaPromoKit';

const STEPS = [
  {
    icon: Compass,
    title: 'Set Your Prayer Preferences',
    body: 'Head to Prayer Times and set your Sect, Madhab/Fiqh, Calculation method, and Location — Auto-Azan uses these to time every prayer precisely for you.',
    href: '/dashboard/prayer-times',
    linkLabel: 'Open Prayer Times',
  },
  {
    icon: BellRing,
    title: 'Choose Your Azan Voice',
    body: 'Go to Azan Voices to pick your favorite Muezzin, and optionally add a Durood Sharif or Dua after Azan clip to play alongside it.',
    href: '/dashboard/azan-voices',
    linkLabel: 'Open Azan Voices',
  },
  {
    icon: Power,
    title: 'Turn On Auto-Azan',
    body: 'Flip the Auto-Azan switch — on the Azan Voices page header, in Settings (gear icon, under Account), or from Quick Settings in the sidebar.',
    href: '/dashboard/settings',
    linkLabel: 'Open Settings',
  },
];

export function AzanSetupGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(3,10,6,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl border border-white/15 text-parchment shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(165deg, rgba(16,42,28,0.96) 0%, rgba(9,24,16,0.98) 100%)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* decorative pattern + glow, always behind content */}
            <div aria-hidden className="absolute inset-0 pattern-bg opacity-[0.08] pointer-events-none" />
            <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-glow-emerald pointer-events-none" />

            {/* floating decorative orbs */}
            {[{ l: '10%', d: 0 }, { l: '80%', d: 1.3 }, { l: '55%', d: 2.4 }].map(({ l, d }) => (
              <motion.span
                key={l}
                aria-hidden
                className="pointer-events-none absolute bottom-4 h-1.5 w-1.5 rounded-full bg-emerald-400/50"
                style={{ left: l }}
                animate={{ y: [0, -60, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, delay: d, ease: 'easeInOut' }}
              />
            ))}

            {/* header */}
            <div className="relative shrink-0 flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-11 w-11 shrink-0">
                  <motion.span
                    className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50"
                    initial={{ opacity: 0.7, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.55 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/30">
                    <BellRing size={20} />
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold leading-tight">Set Up Auto-Azan</h2>
                  <p className="text-parchment/65 text-sm mt-0.5">3 quick steps to hear the Azan at home, automatically</p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="shrink-0 grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-parchment/70 transition">
                <X size={17} />
              </button>
            </div>

            {/* body — vertical timeline of the 3 real steps */}
            <div className="relative flex-1 min-h-0 overflow-y-auto px-6 py-5">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/30">
                      <s.icon size={18} />
                    </span>
                    {i < STEPS.length - 1 && <span className="w-px flex-1 my-1 bg-white/15" />}
                  </div>
                  <div className={`min-w-0 ${i < STEPS.length - 1 ? 'pb-5' : ''}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300/70">Step {i + 1}</p>
                    <h3 className="font-bold text-parchment mt-0.5">{s.title}</h3>
                    <p className="text-parchment/70 text-sm mt-1 leading-relaxed">{s.body}</p>
                    <Link
                      href={s.href}
                      onClick={onClose}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition"
                    >
                      {s.linkLabel} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* footer — web only: Auto-Azan needs the app running; desktop keeps it alive in the tray */}
            {!isDesktop && (
              <div className="relative shrink-0 border-t border-white/10 px-6 py-4 space-y-3">
                <p className="text-xs text-parchment/70 leading-relaxed flex items-start gap-2">
                  <MonitorDown size={14} className="shrink-0 mt-0.5 text-gold-300" />
                  Auto-Azan only rings while this tab stays open on the web. The{' '}
                  <span className="font-semibold text-gold-300">Desktop app</span> keeps running quietly in your
                  system tray, so Azan keeps ringing even when the window is closed.
                </p>
                <DownloadDesktopButton label="Download Desktop App" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
