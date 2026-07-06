'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UploadCloud, MonitorDown, Smartphone, Check, Sparkles, Scissors, BellRing, Users,
} from 'lucide-react';
import { useDesktopDownloadUrl } from '@/lib/desktopApp';
import type { AudioType } from '@/lib/customAzan';

const TYPE_LABEL: Record<AudioType, string> = {
  azan: 'Azan',
  durood: 'Durood Sharif',
  dua: 'Dua',
};

const PERKS = [
  { icon: UploadCloud, text: 'Upload your own MP3 / WAV recordings' },
  { icon: Scissors,    text: 'Trim, fine-tune and add intro / outro sounds' },
  { icon: BellRing,    text: 'Auto-play before or after every Azan' },
  { icon: Users,       text: 'Share your voice with the community library' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Which upload the user attempted — null means the generic upload button. */
  audioType?: AudioType | null;
  isDark: boolean;
}

/**
 * Web-only modal shown when a user tries to upload a custom Azan / Durood /
 * Dua in the browser. Uploads are an app feature, so this explains that and
 * offers the desktop installer (auto-download) + a "mobile coming soon" note.
 */
export function UploadDesktopPromoModal({ open, onClose, audioType, isDark }: Props) {
  const [mounted, setMounted] = useState(false);
  const desktopDownloadUrl = useDesktopDownloadUrl();
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const label = audioType ? TYPE_LABEL[audioType] : 'Azan, Durood & Dua';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: isDark ? 'rgba(3,10,6,0.6)' : 'rgba(8,20,14,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          {/* panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden
              ${isDark ? 'border-white/15 text-parchment' : 'border-white/50 text-ink'}`}
            style={{
              background: isDark
                ? 'linear-gradient(165deg, rgba(16,42,28,0.95) 0%, rgba(9,24,16,0.97) 100%)'
                : 'linear-gradient(165deg, rgba(255,255,255,0.97) 0%, rgba(240,250,244,0.97) 100%)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* decorative glow behind the header icon */}
            <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full"
              style={{ background: isDark ? 'radial-gradient(closest-side, rgba(16,185,129,0.28), transparent)' : 'radial-gradient(closest-side, rgba(16,185,129,0.18), transparent)' }} />

            <button onClick={onClose} className={`absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-lg transition z-10 ${isDark ? 'hover:bg-white/10 text-parchment/70' : 'hover:bg-black/8 text-ink/60'}`}>
              <X size={18} />
            </button>

            <div className="p-6 sm:p-8">
              {/* animated upload icon with pulse rings */}
              <div className="relative mx-auto mb-5 h-16 w-16">
                {[0, 1].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50"
                    initial={{ opacity: 0.7, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.65 }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1, ease: 'easeOut' }}
                  />
                ))}
                <motion.span
                  className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/30"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <UploadCloud size={30} />
                </motion.span>
              </div>

              <h2 className="text-center font-display font-bold text-xl sm:text-2xl leading-tight mb-2">
                Custom {label} uploads live in the app
              </h2>
              <p className={`text-center text-sm leading-relaxed max-w-md mx-auto ${isDark ? 'text-parchment/70' : 'text-ink/65'}`}>
                Uploading your own {label} audio is available in the{' '}
                <span className="font-semibold text-emerald-500">Desktop app</span> and the{' '}
                <span className="font-semibold">Mobile app</span> — not in the browser.
              </p>

              {/* perks */}
              <motion.ul
                className="mt-5 space-y-2"
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
              >
                {PERKS.map(({ icon: Icon, text }) => (
                  <motion.li
                    key={text}
                    variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                    className={`flex items-center gap-2.5 text-[13px] ${isDark ? 'text-parchment/75' : 'text-ink/70'}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${isDark ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      <Icon size={13} />
                    </span>
                    {text}
                  </motion.li>
                ))}
              </motion.ul>

              {/* platform cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {/* Desktop — available now */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className={`relative rounded-2xl border p-4 ${isDark ? 'border-emerald-400/25 bg-emerald-400/8' : 'border-emerald-200 bg-emerald-50/70'}`}
                >
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-500/15 text-emerald-700'}`}>
                    <Check size={10} /> Available now
                  </span>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-500/15 text-emerald-600'}`}>
                    <MonitorDown size={20} />
                  </span>
                  <p className="mt-2.5 font-semibold text-sm">Desktop App</p>
                  <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}>
                    Windows — free, with offline audio &amp; auto-azan.
                  </p>
                  <motion.a
                    href={desktopDownloadUrl}
                    download
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-bold shadow-lg shadow-emerald-900/25 transition"
                  >
                    <MonitorDown size={16} /> Download Desktop App
                  </motion.a>
                </motion.div>

                {/* Mobile — coming soon */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className={`relative rounded-2xl border p-4 ${isDark ? 'border-white/12 bg-white/5' : 'border-black/8 bg-white/60'}`}
                >
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-500/15 text-amber-700'}`}>
                    <Sparkles size={10} /> Coming soon
                  </span>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-white/8 text-parchment/70' : 'bg-black/5 text-ink/60'}`}>
                    <Smartphone size={20} />
                  </span>
                  <p className="mt-2.5 font-semibold text-sm">Mobile App</p>
                  <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? 'text-parchment/60' : 'text-ink/55'}`}>
                    Android &amp; iOS — the same features, in your pocket.
                  </p>
                  <div className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold cursor-default select-none ${isDark ? 'bg-white/8 text-parchment/45' : 'bg-black/5 text-ink/40'}`}>
                    <Smartphone size={16} /> Coming Soon
                  </div>
                </motion.div>
              </div>

              <button
                onClick={onClose}
                className={`mt-5 mx-auto block text-sm font-medium transition ${isDark ? 'text-parchment/55 hover:text-parchment' : 'text-ink/50 hover:text-ink'}`}
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
