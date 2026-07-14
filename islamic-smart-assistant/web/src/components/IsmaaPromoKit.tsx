'use client';

// Shared building blocks for the compact "get the ISMAA app" popups shown on
// the web build (upload promo, translation-audio promo, profile notice).
// One look everywhere: ISMAA logo header (theme-aware), a pulsing download
// button, and a small animated glass panel that only scrolls when the
// viewport is too short to fit it.

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MonitorDown, Smartphone } from 'lucide-react';
import { useDesktopDownloadUrl } from '@/lib/desktopApp';

/** Theme-aware ISMAA brand logo (same asset pair the sidebar uses). */
export function IsmaaLogo({ isDark, className = 'h-6 w-auto' }: { isDark: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={isDark ? '/ismaa_logo_dark.png' : '/ismaa_logo_light.png'}
      alt="ISMAA — Islamic Smart Assistant"
      className={`${className} object-contain`}
      style={{ filter: isDark ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.5)) brightness(1.15)' : 'drop-shadow(0 1px 2px rgba(16,40,30,0.15))' }}
      draggable={false}
    />
  );
}

/** Pulsing "Download Desktop App" CTA with a sweeping shine — always resolves the newest installer. */
export function DownloadDesktopButton({ label = 'Download Desktop App' }: { label?: string }) {
  const url = useDesktopDownloadUrl();
  return (
    <motion.a
      href={url}
      download
      className="relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-2.5 text-sm font-bold"
      animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.55)', '0 0 0 11px rgba(16,185,129,0)'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
    >
      {/* sweeping shine */}
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12"
        initial={{ x: '-150%' }}
        animate={{ x: '400%' }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.7 }}
      />
      <MonitorDown size={16} className="relative shrink-0" />
      <span className="relative">{label}</span>
    </motion.a>
  );
}

/** Small "Mobile app — coming soon" pill shown under the download CTA. */
export function MobileSoonPill({ isDark }: { isDark: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-amber-400/12 text-amber-300' : 'bg-amber-500/12 text-amber-700'}`}>
      <Smartphone size={12} />
      Mobile app — <span className="font-bold">coming soon</span>
    </div>
  );
}

/**
 * Compact glass popup: theme-aware panel with the ISMAA logo top-left and a
 * close button. Content stays compact; the wrapper scrolls only when the
 * window is shorter than the panel.
 */
export function PromoPopup({
  open, onClose, isDark, children, maxWidth = 'max-w-sm',
}: {
  open: boolean; onClose: () => void; isDark: boolean; children: ReactNode; maxWidth?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: isDark ? 'rgba(3,10,6,0.6)' : 'rgba(8,20,14,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className={`relative w-full ${maxWidth} my-auto rounded-3xl border shadow-2xl overflow-hidden
              ${isDark ? 'border-white/15 text-parchment' : 'border-white/50 text-ink'}`}
            style={{
              background: isDark
                ? 'linear-gradient(165deg, rgba(16,42,28,0.96) 0%, rgba(9,24,16,0.98) 100%)'
                : 'linear-gradient(165deg, rgba(255,255,255,0.97) 0%, rgba(240,250,244,0.97) 100%)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* floating decorative orbs */}
            {[{ l: '8%', d: 0 }, { l: '85%', d: 1.2 }, { l: '60%', d: 2.1 }].map(({ l, d }) => (
              <motion.span
                key={l}
                aria-hidden
                className="pointer-events-none absolute bottom-2 h-2 w-2 rounded-full bg-emerald-400/40"
                style={{ left: l }}
                animate={{ y: [0, -46, 0], opacity: [0, 0.7, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: d, ease: 'easeInOut' }}
              />
            ))}

            {/* header: brand logo left, close right */}
            <div className={`relative flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-black/6'}`}>
              <IsmaaLogo isDark={isDark} className="h-6 w-auto" />
              <button onClick={onClose} aria-label="Close" className={`grid h-7 w-7 place-items-center rounded-lg transition ${isDark ? 'hover:bg-white/10 text-parchment/70' : 'hover:bg-black/8 text-ink/60'}`}>
                <X size={16} />
              </button>
            </div>

            <div className="relative px-5 pb-5 pt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
