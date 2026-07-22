'use client';

// "Azan at Your Home" teaser — the middle column of the home hero, between the
// headline/CTA copy and the live HeroPrayerCard. Explains the auto-Azan feature
// and opens AzanSetupGuideModal with the real step-by-step setup instructions.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Sunrise, Sun, Sunset, Moon, ListChecks, MonitorDown } from 'lucide-react';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { AzanSetupGuideModal } from '@/components/AzanSetupGuideModal';

const PRAYERS = [
  { icon: Sunrise, label: 'Fajr' },
  { icon: Sun,     label: 'Dhuhr' },
  { icon: Sun,     label: 'Asr' },
  { icon: Sunset,  label: 'Maghrib' },
  { icon: Moon,    label: 'Isha' },
];

export function AzanAtHomeCard() {
  const isDesktop = useIsDesktop();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative overflow-hidden glass-dark rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-950/40 w-full"
      >
        <div aria-hidden className="absolute inset-0 pattern-bg opacity-[0.07] pointer-events-none" />
        <motion.div
          aria-hidden
          className="absolute -top-14 -left-14 w-48 h-48 rounded-full bg-glow-emerald pointer-events-none"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative">
          {/* icon + heading */}
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-gold-300/50"
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: 0, scale: 1.55 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gold-gradient text-midnight-900 shadow-glow-gold">
                <BellRing size={20} />
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-parchment leading-tight">Azan at Your Home</h2>
          </div>

          {/* 2-3 line description */}
          <p className="text-parchment/70 text-sm leading-relaxed mt-3">
            Syedi-ISMAA rings the Azan automatically for Fajr, Dhuhr, Asr, Maghrib &amp; Isha — precisely
            timed to your location, right on your device.
          </p>

          {/* floating prayer icon row */}
          <div className="grid grid-cols-5 gap-1.5 mt-4">
            {PRAYERS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: [0, -(2 + i % 3), 0] }}
                transition={{
                  opacity: { delay: 0.2 + i * 0.05, duration: 0.4 },
                  y: { delay: i * 0.4, duration: 3 + i * 0.35, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="flex flex-col items-center gap-1"
              >
                <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-gold-300 flex items-center justify-center">
                  <Icon size={14} />
                </span>
                <span className="text-[10px] text-parchment/55 font-semibold">{label}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            type="button"
            onClick={() => setGuideOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 text-parchment px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition"
          >
            <ListChecks size={16} /> How It Works
          </motion.button>

          {/* web-only note: desktop keeps Auto-Azan running in the background */}
          {!isDesktop && (
            <p className="flex items-center gap-1.5 text-[11px] text-parchment/50 mt-2.5">
              <MonitorDown size={11} className="shrink-0" />
              Desktop app keeps Auto-Azan running in the background
            </p>
          )}
        </div>
      </motion.div>

      <AzanSetupGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
