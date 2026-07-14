'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Sparkles, Bell, BookOpen, Mic2, Smartphone, Moon, Radio } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useState } from 'react';
import { IsmaaLogo } from '@/components/IsmaaPromoKit';

// Compact set — the six features that sell the subscription.
const FEATURES = [
  { icon: Bell,       text: '17+ Premium Azan Voices in HD' },
  { icon: BookOpen,   text: 'Full Quran — Translation & Tafsir' },
  { icon: Radio,      text: 'Casting — Chromecast, Home, Alexa' },
  { icon: Moon,       text: 'Ramadan Mode — Suhoor & Iftar alerts' },
  { icon: Mic2,       text: 'Custom Azan, Durood & Dua uploads' },
  { icon: Zap,        text: 'GPS-precise prayer times, worldwide' },
];

const PLANS = [
  { id: 'monthly',  label: 'Monthly',  price: '$4.99',  per: '/ month',  badge: null,           highlight: false },
  { id: 'annual',   label: 'Annual',   price: '$39.99', per: '/ year',   badge: 'Most Popular', highlight: true },
  { id: 'lifetime', label: 'Lifetime', price: '$99.99', per: 'one-time', badge: 'Best Value',   highlight: false },
];

export function PremiumModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState('annual');

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="relative w-full max-w-lg my-auto rounded-3xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)]"
            style={{
              background: isDark
                ? 'linear-gradient(160deg, rgba(7,20,14,0.96) 0%, rgba(11,26,18,0.98) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(240,253,244,0.98) 100%)',
              backdropFilter: 'blur(28px)',
              border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(5,150,105,0.15)',
            }}
          >
            {/* ── Slim hero header: brand logo left, crown + title centered ── */}
            <div className="relative h-24 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/masjid-e-nabwi.png"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ filter: 'brightness(0.38) saturate(1.2)' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,46,22,0.55) 0%, rgba(7,20,14,0.85) 100%)' }} />

              {/* brand logo — the header image is dark, so always the dark-mode logo */}
              <div className="absolute top-3 left-4">
                <IsmaaLogo isDark className="h-6 w-auto" />
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition backdrop-blur"
              >
                <X size={15} />
              </button>

              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2.5">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
                  className="grid w-9 h-9 place-items-center rounded-xl shadow-[0_0_26px_rgba(245,158,11,0.6)]"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Crown size={18} className="text-white" />
                </motion.span>
                <div>
                  <p className="text-white font-display font-black text-lg tracking-tight leading-none">ISMAA Premium</p>
                  <p className="text-gold-300 text-[11px] font-medium mt-0.5 flex items-center gap-1">
                    <Sparkles size={10} /> Unlock the full Islamic experience
                  </p>
                </div>
              </div>
            </div>

            {/* ── Body (compact — no inner scroll; page scrolls only on short windows) ── */}
            <div className="p-5 space-y-4">
              {/* Features */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
              >
                {FEATURES.map(({ text }) => (
                  <motion.div
                    key={text}
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-emerald-500/[0.07]' : 'bg-emerald-50/80'}`}
                  >
                    <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <p className={`text-xs leading-snug ${isDark ? 'text-parchment/80' : 'text-emerald-900/80'}`}>{text}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pricing plans */}
              <div className="grid grid-cols-3 gap-2 pt-1.5">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelected(plan.id)}
                    className={`relative flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition cursor-pointer ${
                      selected === plan.id
                        ? plan.highlight
                          ? 'border-gold-400 bg-gold-gradient shadow-[0_0_22px_-6px_rgba(245,158,11,0.5)]'
                          : `border-emerald-500 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`
                        : isDark
                          ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          : 'border-emerald-900/10 bg-white hover:border-emerald-300'
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        plan.highlight ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                    <p className={`text-[11px] font-semibold ${
                      selected === plan.id && plan.highlight ? 'text-midnight-900' : (isDark ? 'text-parchment/55' : 'text-emerald-900/55')
                    }`}>{plan.label}</p>
                    <p className={`font-black text-base leading-tight ${
                      selected === plan.id && plan.highlight ? 'text-midnight-900' : (isDark ? 'text-parchment' : 'text-emerald-950')
                    }`}>{plan.price}</p>
                    <p className={`text-[10px] ${
                      selected === plan.id && plan.highlight ? 'text-midnight-800/70' : (isDark ? 'text-parchment/40' : 'text-emerald-900/45')
                    }`}>{plan.per}</p>
                  </button>
                ))}
              </div>

              {/* CTA — pulsing gold with shine sweep */}
              <motion.button
                className="relative overflow-hidden w-full rounded-xl py-3 font-black text-sm flex items-center justify-center gap-2 transition hover:brightness-105 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', color: '#1c1003' }}
                animate={{ boxShadow: ['0 0 0 0 rgba(245,158,11,0.5)', '0 0 0 10px rgba(245,158,11,0)'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                  initial={{ x: '-150%' }}
                  animate={{ x: '400%' }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
                />
                <Crown size={16} className="relative" />
                <span className="relative">Get Premium — {PLANS.find(p => p.id === selected)?.price}</span>
                <span className="relative text-xs font-semibold opacity-70">(Coming Soon)</span>
              </motion.button>

              <p className={`text-center text-[11px] ${isDark ? 'text-parchment/55' : 'text-emerald-900/55'}`}>
                One subscription — Web, Desktop &amp; Mobile
                <span className="mx-1.5 inline-flex items-center gap-1"><Smartphone size={10} className="inline" /></span>
                · Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
