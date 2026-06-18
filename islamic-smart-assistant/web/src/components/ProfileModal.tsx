'use client';

// Profile popup launched from the sidebar. On the desktop app it shows the
// editable profile form; on the web it shows the "download the desktop app"
// notice (profile management is desktop-only).

import { motion, AnimatePresence } from 'framer-motion';
import { User, X } from 'lucide-react';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { ProfileForm, DesktopRequiredNotice } from './ProfileForm';

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isDesktop = useIsDesktop();
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
                    {isDesktop
                      ? 'Your details are saved to your account and synced to every device.'
                      : 'Profile management is available in the Noor Desktop app.'}
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="p-6">
              {isDesktop ? <ProfileForm /> : <DesktopRequiredNotice />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
