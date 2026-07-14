'use client';

import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { PromoPopup, DownloadDesktopButton, MobileSoonPill } from '@/components/IsmaaPromoKit';
import type { AudioType } from '@/lib/customAzan';

const TYPE_LABEL: Record<AudioType, string> = {
  azan: 'Azan',
  durood: 'Durood',
  dua: 'Dua',
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Which upload the user attempted — null means the generic upload button. */
  audioType?: AudioType | null;
  isDark: boolean;
}

/**
 * Compact web-only popup shown when a user tries to upload a custom Azan /
 * Durood / Dua in the browser — uploads are an app feature.
 */
export function UploadDesktopPromoModal({ open, onClose, audioType, isDark }: Props) {
  const label = audioType ? TYPE_LABEL[audioType] : 'Azan, Durood & Dua';

  return (
    <PromoPopup open={open} onClose={onClose} isDark={isDark}>
      {/* icon + title row */}
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
            <UploadCloud size={22} />
          </motion.span>
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-base leading-tight">Custom {label} uploads</h2>
          <p className={`text-xs mt-0.5 leading-snug ${isDark ? 'text-parchment/65' : 'text-ink/60'}`}>
            Available in the <span className="font-semibold text-emerald-500">Desktop app</span> — not in the browser.
          </p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
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
