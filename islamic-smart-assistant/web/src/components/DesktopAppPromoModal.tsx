'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MonitorDown, Volume2, Check } from 'lucide-react';
import { TRANSLATIONS, LOCAL_AUDIO_EDITIONS, type TranslationId } from '@/lib/quran';
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopApp';

const LANG_NAMES = (Object.keys(LOCAL_AUDIO_EDITIONS) as TranslationId[])
  .map((id) => TRANSLATIONS.find((t) => t.id === id)?.short || TRANSLATIONS.find((t) => t.id === id)?.name || id)
  .sort((a, b) => a.localeCompare(b));

interface Props {
  open: boolean;
  onClose: () => void;
  translation?: TranslationId | null;   // the language the user tried to select
  isDark: boolean;
}

/**
 * Web-only modal shown when a user selects a translation whose audio is only
 * available in the desktop app. Explains the feature and links to the installer.
 */
export function DesktopAppPromoModal({ open, onClose, translation, isDark }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const langName = translation ? TRANSLATIONS.find((t) => t.id === translation)?.name : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: isDark ? 'rgba(3,10,6,0.55)' : 'rgba(8,20,14,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden
              ${isDark ? 'border-white/15 text-parchment' : 'border-white/40 text-ink'}`}
            style={{
              background: isDark
                ? 'linear-gradient(165deg, rgba(16,42,28,0.94) 0%, rgba(9,24,16,0.96) 100%)'
                : 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(240,250,244,0.96) 100%)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <button onClick={onClose} className={`absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-lg transition z-10 ${isDark ? 'hover:bg-white/10 text-parchment/70' : 'hover:bg-black/8 text-ink/60'}`}>
              <X size={18} />
            </button>

            <div className="p-6 sm:p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500 mb-4">
                <Volume2 size={24} />
              </span>

              <h2 className="font-display font-bold text-xl leading-tight mb-1.5">
                {langName ? `${langName} audio` : 'Translation audio'} is a desktop feature
              </h2>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-parchment/70' : 'text-ink/65'}`}>
                Spoken ayah-by-ayah audio for this translation isn&apos;t available in the browser.
                Install the free <span className="font-semibold">Noor Desktop</span> app to download and play
                clear offline audio for <span className="font-semibold">all {LANG_NAMES.length} languages</span>.
              </p>

              {/* Language chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {LANG_NAMES.slice(0, 16).map((n) => (
                  <span key={n} className={`text-[11px] rounded-full px-2 py-0.5 ${isDark ? 'bg-white/8 text-parchment/70' : 'bg-black/5 text-ink/60'}`}>{n}</span>
                ))}
                <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  +{Math.max(0, LANG_NAMES.length - 16)} more
                </span>
              </div>

              {/* Benefits */}
              <ul className="mt-4 space-y-1.5">
                {['Plays offline — no internet needed after download', 'Arabic recitation + translation, ayah by ayah', 'Download only the languages you want'].map((b) => (
                  <li key={b} className={`flex items-start gap-2 text-xs ${isDark ? 'text-parchment/65' : 'text-ink/60'}`}>
                    <Check size={13} className="mt-0.5 text-emerald-500 shrink-0" /> {b}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-3">
                <a
                  href={DESKTOP_DOWNLOAD_URL}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold shadow-lg transition active:scale-95"
                >
                  <MonitorDown size={17} /> Download Desktop App
                </a>
                <button onClick={onClose} className={`text-sm font-medium ${isDark ? 'text-parchment/60 hover:text-parchment' : 'text-ink/55 hover:text-ink'}`}>
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
