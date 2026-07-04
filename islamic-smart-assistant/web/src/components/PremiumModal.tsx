'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Sparkles, Globe, Bell, BookOpen, Mic2, Smartphone, Moon, Radio, Shield } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { useState } from 'react';

const FEATURES = [
  { icon: Bell,       text: 'All 17+ Premium Azan Voices in HD quality'      },
  { icon: Radio,      text: 'Multi-device casting — Chromecast, Google Home, Alexa' },
  { icon: BookOpen,   text: 'Full Quran with Translation & Tafsir'             },
  { icon: Moon,       text: 'Ramadan Mode — Suhoor & Iftar smart alerts'       },
  { icon: Mic2,       text: 'Community uploads — Azan, Durood & Dua'           },
  { icon: Zap,        text: 'GPS-precise prayer times, any city worldwide'      },
  { icon: Bell,       text: 'Custom Azan voice per prayer time'                 },
  { icon: Globe,      text: 'Qibla finder with live compass'                    },
  { icon: Smartphone, text: 'One subscription — Web, Desktop & Mobile App'     },
  { icon: Shield,     text: 'Ad-free experience, forever'                       },
];

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    per: '/ month',
    badge: null,
    savings: null,
    highlight: false,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$39.99',
    per: '/ year',
    badge: 'Most Popular',
    savings: 'Save 33%',
    highlight: true,
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    price: '$99.99',
    per: 'one-time',
    badge: 'Best Value',
    savings: 'Pay once, own forever',
    highlight: false,
  },
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
            className="relative w-full max-w-2xl my-4 max-h-[75vh] flex flex-col rounded-[32px] overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)]"
            style={{
              background: isDark
                ? 'linear-gradient(160deg, rgba(7,20,14,0.96) 0%, rgba(11,26,18,0.98) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(240,253,244,0.98) 100%)',
              backdropFilter: 'blur(28px)',
              border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(5,150,105,0.15)',
            }}
          >
            {/* ── Hero header with mosque backdrop ── */}
            <div className="relative h-52 shrink-0 overflow-hidden">
              {/* Background image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/masjid-e-nabwi.png"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ filter: 'brightness(0.38) saturate(1.2)' }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(5,46,22,0.55) 0%, rgba(7,20,14,0.85) 100%)',
                }}
              />
              {/* Shimmer rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[80, 130, 180].map((r, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-gold-400/20"
                    style={{ width: r * 2, height: r * 2, animationDelay: `${i * 0.4}s` }}
                  />
                ))}
              </div>

              {/* Crown + label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)]"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Crown size={30} className="text-white" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="text-center"
                >
                  <p className="text-white font-display font-black text-2xl tracking-tight leading-none">
                    Noor Premium
                  </p>
                  <p className="text-gold-300 text-sm font-medium mt-1 flex items-center gap-1.5 justify-center">
                    <Sparkles size={13} /> Unlock the full Islamic experience
                  </p>
                </motion.div>
              </div>

              {/* Platform badges */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                {['Web App', 'Desktop', 'Mobile'].map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/80 bg-white/10 backdrop-blur ring-1 ring-white/20">
                    {p}
                  </span>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition backdrop-blur"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">

              {/* Features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${isDark ? 'bg-emerald-500/[0.07]' : 'bg-emerald-50/80'}`}>
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <p className={`text-[13px] leading-snug ${isDark ? 'text-parchment/80' : 'text-emerald-900/80'}`}>{text}</p>
                  </div>
                ))}
              </div>

              {/* Pricing plans */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-parchment/40' : 'text-emerald-900/40'}`}>Choose your plan</p>
                <div className="grid grid-cols-3 gap-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition cursor-pointer ${
                        selected === plan.id
                          ? plan.highlight
                            ? 'border-gold-400 bg-gold-gradient shadow-[0_0_28px_-6px_rgba(245,158,11,0.5)]'
                            : `border-emerald-500 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`
                          : isDark
                            ? 'border-white/10 bg-white/[0.03] hover:border-white/20'
                            : 'border-emerald-900/10 bg-white hover:border-emerald-300'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                          plan.highlight ? 'bg-amber-500 text-white' : (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white')
                        }`}>
                          {plan.badge}
                        </span>
                      )}
                      <p className={`text-xs font-semibold mb-1 ${
                        selected === plan.id && plan.highlight ? 'text-midnight-900' : (isDark ? 'text-parchment/55' : 'text-emerald-900/55')
                      }`}>{plan.label}</p>
                      <p className={`font-black text-xl leading-none ${
                        selected === plan.id && plan.highlight ? 'text-midnight-900' : (isDark ? 'text-parchment' : 'text-emerald-950')
                      }`}>{plan.price}</p>
                      <p className={`text-[11px] mt-0.5 ${
                        selected === plan.id && plan.highlight ? 'text-midnight-800/70' : (isDark ? 'text-parchment/40' : 'text-emerald-900/45')
                      }`}>{plan.per}</p>
                      {plan.savings && (
                        <p className={`text-[11px] font-bold mt-1.5 ${
                          selected === plan.id && plan.highlight ? 'text-midnight-800' : 'text-emerald-600'
                        }`}>{plan.savings}</p>
                      )}
                      {selected === plan.id && (
                        <span className={`mt-2 w-5 h-5 grid place-items-center rounded-full ${plan.highlight ? 'bg-midnight-900/20' : 'bg-emerald-600'}`}>
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-3">
                <button className="w-full rounded-2xl py-4 font-black text-base flex items-center justify-center gap-2.5 transition hover:brightness-105 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)', color: '#1c1003', boxShadow: '0 8px 24px -6px rgba(245,158,11,0.55)' }}>
                  <Crown size={18} />
                  Get Noor Premium — {PLANS.find(p => p.id === selected)?.price}
                  <span className="text-sm font-semibold opacity-70">(Coming Soon)</span>
                </button>
                <p className={`text-center text-sm font-medium ${isDark ? 'text-parchment/75' : 'text-emerald-900/75'}`}>
                  Cancel anytime · Secure checkout · One subscription for all platforms
                </p>
              </div>

              {/* Decorative SVG divider */}
              <div className="flex items-center gap-3 opacity-30">
                <div className={`flex-1 h-px ${isDark ? 'bg-white/20' : 'bg-emerald-900/15'}`} />
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L11.8 7.2H17.6L12.9 10.5L14.7 15.7L10 12.4L5.3 15.7L7.1 10.5L2.4 7.2H8.2L10 2Z" fill={isDark ? 'rgba(245,158,11,0.6)' : 'rgba(5,150,105,0.4)'} />
                </svg>
                <div className={`flex-1 h-px ${isDark ? 'bg-white/20' : 'bg-emerald-900/15'}`} />
              </div>

              <p className={`text-center text-sm font-medium leading-relaxed ${isDark ? 'text-parchment/75' : 'text-emerald-900/80'}`}>
                Noor Premium supports the continued development of this app and helps us serve the global Muslim community. JazakAllah Khair 🤲
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
