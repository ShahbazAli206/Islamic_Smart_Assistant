'use client';

// Profile popup launched from the sidebar. On the desktop app it shows the
// editable profile form; on the web it shows a compact "get the ISMAA desktop
// app" notice (profile management is app-only).

import { motion, AnimatePresence } from 'framer-motion';
import { User, X, ShieldCheck } from 'lucide-react';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { useTheme } from '@/lib/ThemeContext';
import { ProfileForm } from './ProfileForm';
import { PromoPopup, DownloadDesktopButton, MobileSoonPill } from '@/components/IsmaaPromoKit';

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const { isDark } = useTheme();

  // Web: compact app-promo popup instead of the (desktop-only) profile form.
  if (!isDesktop) {
    return (
      <PromoPopup open={open} onClose={onClose} isDark={isDark}>
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-xl border-2 border-emerald-400/50"
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 1.55 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-900/30"
              animate={{ y: [0, -2.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <User size={22} />
            </motion.span>
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-base leading-tight">Profile lives in the Desktop app</h2>
            <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-parchment/65' : 'text-ink/60'}`}>
              Manage your name, language, sect &amp; location in the{' '}
              <span className="font-semibold text-emerald-500">ISMAA Desktop app</span>.
            </p>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className={`mt-3 flex items-center gap-1.5 text-[11px] ${isDark ? 'text-parchment/55' : 'text-ink/50'}`}
        >
          <ShieldCheck size={12} className="text-emerald-500 shrink-0" /> Your details stay private on your own device.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3">
          <DownloadDesktopButton />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-3 flex items-center justify-between"
        >
          <MobileSoonPill isDark={isDark} />
          <button onClick={onClose} className={`text-xs font-medium transition ${isDark ? 'text-parchment/55 hover:text-parchment' : 'text-ink/50 hover:text-ink'}`}>
            Maybe later
          </button>
        </motion.div>
      </PromoPopup>
    );
  }

  // Desktop app: full editable profile form.
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 240 }}
            className="relative w-full max-w-2xl my-4 rounded-3xl bg-white shadow-2xl overflow-hidden text-ink"
          >
            {/* header */}
            <div className="bg-mosque-gradient text-parchment px-6 py-5 relative overflow-hidden">
              <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
              <div className="relative flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <User size={20} className="text-gold-300" /> My Profile
                  </h3>
                  <p className="text-emerald-100/75 text-sm mt-1">
                    Your details are saved to your account and synced to every device.
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="p-6">
              <ProfileForm />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
