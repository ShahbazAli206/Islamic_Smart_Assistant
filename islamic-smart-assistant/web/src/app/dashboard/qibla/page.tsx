'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import {
  Compass, MapPin, Navigation, AlertTriangle, RotateCcw, Loader2, CheckCircle2,
  Gauge, Clock, Activity, Hexagon, Box, Share2, Camera, Scan, Map as MapIcon,
  ArrowRight, Sparkles, ExternalLink, Smartphone, X,
} from 'lucide-react';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { useCompassHeading } from '@/lib/compass';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned } from '@/lib/qibla';
import { useTheme } from '@/lib/ThemeContext';
import { ContentBackdrop } from '@/components/ContentBackdrop';

const QiblaMap = dynamic(() => import('@/components/QiblaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-2xl bg-emerald-950/40 animate-pulse" />
  ),
});

// ── Needle styles (Classic / Modern / 3D View) ─────────────────────────────────

type NeedleStyle = 'classic' | 'royal' | 'minimal';

const NEEDLE_STYLES: { id: NeedleStyle; label: string; Icon: typeof Compass }[] = [
  { id: 'classic', label: 'Classic', Icon: Compass },
  { id: 'royal',   label: 'Modern',  Icon: Hexagon },
  { id: 'minimal', label: '3D View', Icon: Box },
];

// ── Count-up number (animates from 0 → value on mount) ──────────────────────────

function CountUp({
  value, decimals = 0, grouped = false,
}: { value: number; decimals?: number; grouped?: boolean }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const n = Number(v.toFixed(decimals));
        setDisplay(grouped ? n.toLocaleString('en-US') : n.toFixed(decimals));
      },
    });
    return controls.stop;
  }, [value, decimals, grouped, mv]);

  return <>{display}</>;
}

// ── Compass SVG ───────────────────────────────────────────────────────────────

const CX = 140, CY = 140;

function CompassRoseSVG({
  aligned, needleStyle,
}: { aligned: boolean; needleStyle: NeedleStyle }) {
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg     = i * 5;
    const rad     = ((deg - 90) * Math.PI) / 180;
    const isMajor = deg % 90 === 0;
    const isOrd   = deg % 45 === 0 && !isMajor;
    const isMed   = deg % 15 === 0 && !isOrd && !isMajor;
    const r0 = isMajor ? 112 : isOrd ? 116 : isMed ? 119 : 122;
    const r1 = 128;
    return {
      x1: CX + r0 * Math.cos(rad), y1: CY + r0 * Math.sin(rad),
      x2: CX + r1 * Math.cos(rad), y2: CY + r1 * Math.sin(rad),
      isMajor, isOrd, isMed,
    };
  });

  const starLines = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 22.5;
    const rad = (deg * Math.PI) / 180;
    return { deg, rad };
  });

  const accentColor = aligned ? '#16a34a' : '#059669';
  const goldColor   = '#D4AF37';

  const innerTicks = Array.from({ length: 24 }, (_, i) => {
    const deg = i * 15;
    const rad = ((deg - 90) * Math.PI) / 180;
    const r0 = 66, r1 = 72;
    return {
      x1: CX + r0 * Math.cos(rad), y1: CY + r0 * Math.sin(rad),
      x2: CX + r1 * Math.cos(rad), y2: CY + r1 * Math.sin(rad),
    };
  });

  return (
    <svg viewBox="0 0 280 280" width="280" height="280" className="select-none max-w-full">
      <defs>
        <linearGradient id="needleClassic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={goldColor} />
          <stop offset="25%"  stopColor="#E8C547" />
          <stop offset="55%"  stopColor={accentColor} />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="needleRoyal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFE066" />
          <stop offset="20%"  stopColor={goldColor} />
          <stop offset="60%"  stopColor="#B8860B" />
          <stop offset="100%" stopColor="#7B5A00" />
        </linearGradient>
        <linearGradient id="outerRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={goldColor} stopOpacity="0.6" />
          <stop offset="50%"  stopColor={accentColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={goldColor} stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fbfdfb" />
          <stop offset="70%"  stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#e3f7ec" />
        </radialGradient>
        <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={accentColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="tipGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r="138" fill="url(#bgGrad)" />
      <circle cx={CX} cy={CY} r="100" fill="url(#innerGlow)" />

      {aligned && (
        <circle cx={CX} cy={CY} r="136" fill="none" stroke="#22c55e"
          strokeWidth="5" opacity="0.65" filter="url(#glow)" />
      )}

      <circle cx={CX} cy={CY} r="135" fill="none" stroke="url(#outerRing)" strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="130" fill="none" stroke={aligned ? '#bbf7d0' : '#d1fae5'} strokeWidth="1.5" />

      {starLines.map(({ deg, rad }) => (
        <line key={deg}
          x1={CX - 106 * Math.cos(rad)} y1={CY - 106 * Math.sin(rad)}
          x2={CX + 106 * Math.cos(rad)} y2={CY + 106 * Math.sin(rad)}
          stroke={accentColor} strokeWidth={deg % 45 === 0 ? 0.8 : 0.4}
          opacity={deg % 45 === 0 ? 0.18 : 0.09}
        />
      ))}

      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMajor ? goldColor : t.isOrd ? accentColor : '#6ee7b7'}
          strokeWidth={t.isMajor ? 2.5 : t.isOrd ? 2 : t.isMed ? 1.5 : 0.8}
          strokeLinecap="round"
          opacity={t.isMajor ? 1 : t.isOrd ? 0.9 : 0.7}
        />
      ))}

      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const rad     = ((i * 90 - 90) * Math.PI) / 180;
        const r       = 102;
        const isNorth = label === 'N';
        return (
          <text key={label}
            x={CX + r * Math.cos(rad)} y={CY + r * Math.sin(rad) + 5}
            textAnchor="middle" fontSize={isNorth ? 15 : 12}
            fontWeight={isNorth ? '800' : '700'}
            fill={isNorth ? goldColor : accentColor}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {(['NE', 'SE', 'SW', 'NW'] as const).map((label, i) => {
        const rad = ((i * 90 + 45 - 90) * Math.PI) / 180;
        const r   = 99;
        return (
          <text key={label}
            x={CX + r * Math.cos(rad)} y={CY + r * Math.sin(rad) + 4}
            textAnchor="middle" fontSize={9} fontWeight="600"
            fill={accentColor} opacity="0.6"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      <circle cx={CX} cy={CY} r="80" fill="none" stroke="#d1fae5" strokeWidth="1" opacity="0.5" />

      {innerTicks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={accentColor} strokeWidth="1" opacity="0.3" strokeLinecap="round" />
      ))}

      <circle cx={CX} cy={CY} r="60" fill="none" stroke={goldColor}
        strokeWidth="0.8" opacity="0.25" strokeDasharray="4 3" />

      {/* ── NEEDLE ── */}
      {needleStyle === 'classic' && (
        <>
          <polygon
            points={`${CX},30 ${CX + 11},${CY - 2} ${CX},${CY + 12} ${CX - 11},${CY - 2}`}
            fill="url(#needleClassic)" filter="url(#tipGlow)" />
          <polygon
            points={`${CX - 9},${CY + 12} ${CX + 9},${CY + 12} ${CX + 5},210 ${CX},220 ${CX - 5},210`}
            fill="#4b5563" opacity="0.8" />
        </>
      )}

      {needleStyle === 'royal' && (
        <>
          <rect x={CX - 4} y={50} width="8" height={CY - 54} fill="url(#needleRoyal)" rx="2" />
          <polygon
            points={`${CX},28 ${CX + 18},58 ${CX + 5},52 ${CX + 5},70 ${CX - 5},70 ${CX - 5},52 ${CX - 18},58`}
            fill="url(#needleRoyal)" filter="url(#tipGlow)" />
          <polygon points={`${CX - 4},${CY - 20} ${CX - 18},${CY - 8} ${CX - 4},${CY - 2}`} fill={goldColor} opacity="0.5" />
          <polygon points={`${CX + 4},${CY - 20} ${CX + 18},${CY - 8} ${CX + 4},${CY - 2}`} fill={goldColor} opacity="0.5" />
          <polygon
            points={`${CX - 5},${CY + 12} ${CX + 5},${CY + 12} ${CX + 3},205 ${CX},215 ${CX - 3},205`}
            fill="#374151" opacity="0.7" />
        </>
      )}

      {needleStyle === 'minimal' && (
        <>
          <line x1={CX} y1={36} x2={CX} y2={CY - 2} stroke="#0f766e" strokeWidth="3" strokeLinecap="round" filter="url(#tipGlow)" />
          <polygon points={`${CX},28 ${CX + 7},44 ${CX - 7},44`} fill="#0f766e" />
          <line x1={CX} y1={CY + 12} x2={CX} y2={215} stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={CX} cy={30} r="4" fill={goldColor} />
        </>
      )}

      <circle cx={CX} cy={CY} r="14" fill="white" stroke={goldColor} strokeWidth="2" />
      <circle cx={CX} cy={CY} r="9" fill={aligned ? '#dcfce7' : '#f0fdf4'} stroke={accentColor} strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="4" fill={accentColor} />

      <text x={CX} y={22} textAnchor="middle" fontSize="14"
        filter={aligned ? 'url(#tipGlow)' : undefined}>🕋</text>
    </svg>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────────

function InfoRow({
  Icon, label, value, tone = 'neutral', delay = 0,
}: {
  Icon: typeof Compass; label: string; value: string;
  tone?: 'ok' | 'warn' | 'bad' | 'neutral'; delay?: number;
}) {
  const dot =
    tone === 'ok'   ? 'bg-emerald-500' :
    tone === 'warn' ? 'bg-amber-500'   :
    tone === 'bad'  ? 'bg-rose-500'    : 'bg-slate-300';
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      whileHover={{ x: 2 }}
      className="flex items-center gap-3 rounded-xl border border-emerald-900/8 bg-white/55 backdrop-blur-sm px-3 py-2.5"
    >
      <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50/80 text-emerald-700 border border-emerald-900/5">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-emerald-900/50 leading-none">{label}</p>
        <p className="text-sm font-semibold text-emerald-900 mt-1 flex items-center gap-1.5 leading-none">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <span className="truncate">{value}</span>
        </p>
      </div>
    </motion.div>
  );
}


// ── Mobile / Compass recommendation popup ─────────────────────────────────────

function MobileCompassPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('isa:qibla-popup-dismissed') || 'false');
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem('isa:qibla-popup-dismissed', 'true'); } catch {}
  };

  // The popup is deliberately a dark translucent panel in BOTH themes — dark
  // smoked glass over the page, with light text throughout. (The previous
  // theme-split classes used /96 and /98 opacity steps that don't exist in
  // Tailwind's scale, so no background was generated and the card rendered
  // as clear glass.)
  const cardBg   = 'bg-[rgba(4,16,10,0.80)] border-white/10 text-[#D4EDE5]';
  const subText  = 'text-emerald-400/70';
  const warnBg   = 'bg-amber-500/10 border-amber-400/20';
  const warnHead = 'text-amber-300';
  const warnBody = 'text-amber-300/70';
  const phoneBg  = 'bg-emerald-800/25 border-emerald-700/20';
  const phoneHead = 'text-[#D4EDE5]';
  const phoneBody = 'text-emerald-400/70';
  const divider  = 'text-emerald-400/40';
  const closeBtn = 'text-emerald-400/50 hover:text-[#D4EDE5] hover:bg-white/10';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="qibla-popup"
          initial={{ x: 110, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 110, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 1.6 }}
          className={`fixed right-4 top-[28%] z-[100] w-[272px] rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${cardBg}`}
          style={{ boxShadow: '0 24px 64px -12px rgba(0,0,0,0.7)' }}
        >
          {/* top accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-600" />

          <div className="p-4">
            {/* header row */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                {/* blinking indicator */}
                <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                  <span className="relative w-3.5 h-3.5 rounded-full bg-emerald-500 shadow" />
                </div>
                <div>
                  <p className="font-bold text-[13px] leading-tight">Best Qibla Experience</p>
                  <p className={`text-[10px] ${subText}`}>Live compass required</p>
                </div>
              </div>
              <button onClick={dismiss} className={`rounded-full p-1.5 transition ${closeBtn}`} aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>

            {/* laptop warning */}
            <div className={`rounded-2xl border px-3 py-2.5 mb-3 ${warnBg}`}>
              <div className="flex gap-2 items-start">
                <span className="text-lg leading-none mt-0.5">💻</span>
                <div>
                  <p className={`text-[11px] font-semibold leading-snug ${warnHead}`}>
                    Laptops have no compass sensor
                  </p>
                  <p className={`text-[10px] mt-0.5 leading-snug ${warnBody}`}>
                    The direction shown is mathematically accurate, but can&apos;t track live device orientation.
                  </p>
                </div>
              </div>
            </div>

            {/* phone recommendation */}
            <div className={`rounded-2xl border px-3 py-2.5 mb-3.5 ${phoneBg}`}>
              <div className="flex gap-2 items-start">
                <Smartphone size={18} className="shrink-0 text-emerald-500 mt-0.5" />
                <div>
                  <p className={`text-[11px] font-bold leading-snug ${phoneHead}`}>
                    Open on your phone
                  </p>
                  <p className={`text-[10px] mt-0.5 leading-snug ${phoneBody}`}>
                    Phones have a built-in compass sensor — visit this page on your phone for live Qibla tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* divider */}
            <div className={`flex items-center gap-2 mb-3 text-[9px] font-bold uppercase tracking-widest ${divider}`}>
              <span className="flex-1 h-px bg-current opacity-40" />
              Or get our mobile app
              <span className="flex-1 h-px bg-current opacity-40" />
            </div>

            {/* Google Play badge */}
            <div className="relative mb-2 rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/8 flex items-center gap-3 px-3.5 py-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3.18 23.19 13.8 12 3.18.81C2.7 1.06 2.4 1.56 2.4 2.19v19.62c0 .63.3 1.13.78 1.38z" fill="#EA4335"/>
                <path d="M20.52 10.44 17.4 8.68 14.22 12l3.18 3.32 3.12-1.76a1.8 1.8 0 0 0 0-3.12z" fill="#FBBC04"/>
                <path d="M3.18 23.19 13.8 12 17.4 15.32 5.22 22.15a2.04 2.04 0 0 1-2.04-2.06v2.84c0 .09.01.18.02.26z" fill="#34A853"/>
                <path d="M3.18.81 17.4 8.68 13.8 12 3.18.81z" fill="#4285F4"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/50 leading-none">Get it on</p>
                <p className="text-[13px] font-bold text-white leading-tight">Google Play</p>
              </div>
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                Coming Soon
              </span>
            </div>

            {/* App Store badge */}
            <div className="relative rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/8 flex items-center gap-3 px-3.5 py-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/50 leading-none">Download on the</p>
                <p className="text-[13px] font-bold text-white leading-tight">App Store</p>
              </div>
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                Coming Soon
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const QIBLA_AYAH: Record<string, string> = {
  en: 'So turn your face toward al-Masjid al-Haram. And wherever you are, turn your faces toward it.',
  ar: 'فَوَلِّ وَجْهَكَ شَطْرَ ٱلْمَسْجِدِ ٱلْحَرَامِ ۚ وَحَيْثُ مَا كُنتُمْ فَوَلُّوا۟ وُجُوهَكُمْ شَطْرَهُۥ',
  ur: 'پس اپنا چہرہ مسجد الحرام کی طرف پھیرو، اور تم جہاں کہیں بھی ہو اپنے چہرے اسی کی طرف پھیرو۔',
  tr: 'Yüzünü Mescid-i Haram yönüne çevir. Nerede olursanız olun, yüzlerinizi o tarafa çevirin.',
  hi: 'अपना चेहरा मस्जिद अल-हराम की तरफ फेरो। और तुम जहाँ भी हो, अपने चेहरे उसी की तरफ फेरो।',
  bn: 'তোমার মুখ মসজিদুল হারামের দিকে ফেরাও। তোমরা যেখানেই থাকো, সেদিকে মুখ ফেরাও।',
  fr: 'Tourne donc ton visage vers la Mosquée sacrée. Où que vous soyez, tournez vos visages vers elle.',
  zh: '你当把脸转向禁寺。你们无论在哪里，都当把脸转向那方。',
  id: 'Palingkanlah wajahmu ke arah Masjidil Haram. Di mana saja kamu berada, palingkanlah wajahmu ke arahnya.',
  ps: 'خپل مخ د مسجد الحرام لور ته واوږه. تاسو هرچیرې چې اوسئ، خپل مخونه ورلور ته کاږئ.',
};

export default function QiblaPage() {
  const { isDark } = useTheme();
  const loc     = useStoredLocation();
  const compass = useCompassHeading();
  const [language] = useLocalStorage<string>('isa:language', 'en');
  const [needleStyle, setNeedleStyle] = useState<NeedleStyle>('classic');
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(typeof window !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent));
  }, []);

  // ── Qibla bearing + distance ──────────────────────────────────────────────
  const bearing = useMemo(
    () => (loc.hasCoords && loc.lat && loc.lng ? qiblaBearing(loc.lat, loc.lng) : null),
    [loc.hasCoords, loc.lat, loc.lng],
  );
  const distKm = useMemo(
    () => (loc.hasCoords && loc.lat && loc.lng ? distanceToKaaba(loc.lat, loc.lng) : null),
    [loc.hasCoords, loc.lat, loc.lng],
  );
  const aligned = useMemo(
    () => (compass.reading != null && bearing != null
      ? isAligned(compass.reading.heading, bearing) : false),
    [compass.reading, bearing],
  );

  // ── Smooth rotation ────────────────────────────────────────────────────────
  const rotation   = useMotionValue(bearing ?? 0);
  const lastRotRef = useRef(bearing ?? 0);

  useEffect(() => {
    if (compass.status !== 'live' && bearing != null) {
      rotation.set(bearing);
      lastRotRef.current = bearing;
    }
  }, [bearing, compass.status, rotation]);

  useEffect(() => {
    if (compass.reading == null || bearing == null) return;
    const target = bearing - compass.reading.heading;
    const cur    = lastRotRef.current;
    const delta  = ((target - cur + 540) % 360) - 180;
    const next   = cur + delta;
    lastRotRef.current = next;
    animate(rotation, next, { type: 'tween', duration: 0.3, ease: 'easeOut' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compass.reading?.heading]);

  const showEnableBtn =
    compass.status === 'idle' || compass.status === 'requesting' || compass.status === 'denied';

  const needsCalibration =
    compass.reading?.source === 'ios' &&
    typeof compass.reading.accuracy === 'number' &&
    (compass.reading.accuracy < 0 || compass.reading.accuracy > 20);

  const showMap = loc.hasCoords && loc.lat && loc.lng;

  // ── Info-panel values (honest — real data only) ───────────────────────────
  const statusInfo: { value: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' } =
    compass.status === 'live'
      ? needsCalibration ? { value: 'Needs calibration', tone: 'warn' } : { value: 'Calibrated', tone: 'ok' }
      : compass.status === 'starting'    ? { value: 'Detecting sensor…', tone: 'neutral' }
      : compass.status === 'requesting'  ? { value: 'Requesting access…', tone: 'neutral' }
      : compass.status === 'denied'      ? { value: 'Access denied', tone: 'bad' }
      : compass.status === 'unsupported' ? { value: 'No sensor — static', tone: 'neutral' }
      : { value: 'Tap to enable', tone: 'neutral' };

  const headingVal =
    compass.status === 'live' && compass.reading ? `${compass.reading.heading.toFixed(0)}°` : '—';
  const accuracyVal =
    compass.status === 'live' && compass.reading?.accuracy != null
      ? `±${Math.abs(compass.reading.accuracy).toFixed(0)}° · ${compass.reading.source}`
      : compass.status === 'live' ? 'live · magnetic' : 'static bearing';
  const lastUpdated = compass.status === 'live' ? 'Just now' : '—';

  // ── Additional tools ───────────────────────────────────────────────────────
  const scrollToMap = () => mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const shareDirection = async () => {
    const text = bearing != null
      ? `Qibla from ${loc.label}: ${bearing.toFixed(1)}° (${compassPoint(bearing)}), ${distKm != null ? formatDistance(distKm) : ''} from Makkah.`
      : 'Find the Qibla direction with Syedi-ISMAA.';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Qibla Direction', text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMsg('Copied to clipboard');
        setTimeout(() => setShareMsg(null), 2200);
      }
    } catch {
      /* user dismissed share sheet — ignore */
    }
  };

  const TOOLS = [
    { Icon: Scan,    title: 'Augmented Reality', desc: 'View Qibla in your environment', action: 'Soon',     soon: true,  onClick: () => {} },
    { Icon: Camera,  title: 'AR Camera',         desc: 'Point your camera towards Qibla', action: 'Soon',     soon: true,  onClick: () => {} },
    { Icon: MapIcon, title: 'Qibla on Map',      desc: 'See Qibla direction on map',      action: 'Open Map', soon: false, onClick: scrollToMap },
    { Icon: Share2,  title: 'Share Direction',   desc: 'Share Qibla direction with others', action: 'Share',  soon: false, onClick: shareDirection },
  ];

  const STEPS = [
    { step: '1', title: 'Set your location', sub: 'Save coordinates' },
    { step: '2', title: 'Enable compass',    sub: 'Approve access' },
    { step: '3', title: 'Hold device flat',  sub: 'Lay it level' },
    { step: '4', title: 'Align arrow',        sub: 'Turn to Kaaba' },
    { step: '5', title: "You're facing Qibla", sub: 'Glows green' },
  ];

  // staggered page entrance
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  };
  const rise = {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div
      className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment page-dark' : 'text-ink page-light'}`}
      style={isDark ? { background: 'linear-gradient(180deg,#0B231A 0%,#0A1D15 55%,#08160F 100%)' } : undefined}
    >
      <MobileCompassPopup />
      {/* ── Full-bleed header ── */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/masjid_img.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        <div className="relative px-6 sm:px-10 pt-8 pb-8 flex flex-wrap items-start justify-between gap-6">
          {/* left: badge + title + description */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
              <Sparkles size={12} /> Qibla Finder
            </span>
            <h1 className="mt-4 font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] whitespace-nowrap text-black"
              style={{ textShadow: '0 1px 8px rgba(255,255,255,0.7)' }}>
              Find the direction of the Holy Kaaba
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-base sm:text-lg leading-relaxed text-black/85">
                Point your device toward Makkah — accurate Qibla from GPS, live compass, or static bearing.
              </p>
            </div>
          </div>

          {/* right: Qibla ayah */}
          <div className="hidden md:block" style={{ maxWidth: '360px' }}>
            <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                    ١٤٤
                  </span>
                  <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                    فَوَلِّ وَجْهَكَ شَطْرَ ٱلْمَسْجِدِ ٱلْحَرَامِ ۚ وَحَيْثُ مَا كُنتُمْ فَوَلُّوا۟ وُجُوهَكُمْ شَطْرَهُۥ
                  </p>
                </div>
                <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                  {QIBLA_AYAH[language] ?? QIBLA_AYAH.en}
                </p>
                <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-Baqarah (2:144)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <ContentBackdrop isDark={isDark}>
      <div className={`relative px-6 sm:px-10 pb-10 space-y-5 pt-5 ${isDark ? 'qibla-dark' : ''}`}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >

        {/* ── No-location notice ─────────────────────────────────────────── */}
        <AnimatePresence>
          {!loc.hasCoords && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 backdrop-blur-md px-5 py-4">
                <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>
                  <MapPin size={20} className="shrink-0 text-amber-300 mt-0.5" />
                </motion.div>
                <div>
                  <p className="font-semibold text-amber-200 text-sm">Location not set</p>
                  <p className="text-amber-100/70 text-xs mt-0.5">
                    Visit the Prayer Times page to set your location — your coordinates are needed
                    to calculate the exact Qibla direction.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5 items-start">

          {/* ════ LEFT COLUMN ════ */}
          <div className="flex flex-col gap-5">

            {/* ── Compass card ── */}
            <motion.div
              variants={rise}
              className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-parchment/95 backdrop-blur-xl shadow-2xl shadow-emerald-950/40"
            >
              <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
              <div className="relative grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-6 p-6 sm:p-8 items-center">

                {/* — left: location + readouts — */}
                <div className="flex flex-col gap-5 order-2 lg:order-1">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70">
                      <MapPin size={12} /> Your Location
                    </p>
                    <p className="text-lg font-bold text-emerald-900 mt-1">{loc.hasCoords ? loc.label : 'Not set'}</p>
                    {loc.hasCoords && loc.lat != null && loc.lng != null && (
                      <p className="text-xs text-emerald-700/50 font-mono mt-0.5">
                        {loc.lat.toFixed(4)}°, {loc.lng.toFixed(4)}°
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70">Qibla Direction</p>
                    <p className="font-display font-bold text-4xl sm:text-5xl text-emerald-900 leading-none mt-1">
                      {bearing != null ? <><CountUp value={bearing} decimals={1} />°</> : '—'}
                    </p>
                    {bearing != null && (
                      <p className="text-gold-600 font-bold text-sm mt-1.5">{compassPoint(bearing)}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70">Distance to Kaaba</p>
                    <p className="font-display font-bold text-2xl sm:text-3xl text-emerald-900 leading-none mt-1">
                      {distKm != null ? <><CountUp value={Math.round(distKm)} grouped /> km</> : '—'}
                    </p>
                    <p className="text-xs text-emerald-700/50 mt-1">from Makkah</p>
                  </div>
                </div>

                {/* — center: compass — */}
                <div className="order-1 lg:order-2 flex flex-col items-center gap-4 justify-self-center">
                  {bearing != null ? (
                    <div className="relative flex flex-col items-center">
                      <AnimatePresence mode="wait">
                        {aligned ? (
                          <motion.div key="ka" initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.15, 1], opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 1, repeat: Infinity }} className="mb-2 text-3xl">🕋</motion.div>
                        ) : (
                          <motion.div key="kn" animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                            className="mb-2 text-2xl opacity-60">🕋</motion.div>
                        )}
                      </AnimatePresence>

                      <div className="relative">
                        <motion.div aria-hidden className="absolute rounded-full border border-emerald-600/15 pointer-events-none"
                          style={{ inset: '-26px' }} animate={{ rotate: 360 }}
                          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }} />
                        <motion.div aria-hidden className="absolute rounded-full border border-gold-400/20 pointer-events-none"
                          style={{ inset: '-13px' }} animate={{ rotate: -360 }}
                          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} />
                        {aligned && (
                          <motion.div aria-hidden className="absolute inset-0 rounded-full pointer-events-none"
                            style={{ background: 'rgba(34,197,94,0.1)' }}
                            animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.3, repeat: Infinity }} />
                        )}
                        <motion.div style={{ rotate: rotation }}>
                          <CompassRoseSVG aligned={aligned} needleStyle={needleStyle} />
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <motion.div animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }}
                      className="w-[260px] h-[260px] rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center text-emerald-300">
                      <Compass size={48} strokeWidth={1} />
                    </motion.div>
                  )}

                  {/* aligned banner */}
                  <AnimatePresence>
                    {aligned && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-emerald-900/30"
                      >
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          <CheckCircle2 size={17} />
                        </motion.div>
                        You&apos;re facing the Qibla! 🕋
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* compass style selector */}
                  {bearing != null && (
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/50">Compass Style</p>
                      <div className="flex gap-2">
                        {NEEDLE_STYLES.map(({ id, label, Icon }) => (
                          <motion.button
                            key={id}
                            whileHover={{ scale: 1.06, y: -2 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => setNeedleStyle(id)}
                            className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors duration-200
                              ${needleStyle === id
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-900/20'
                                : 'bg-white/70 border-emerald-900/10 text-emerald-700 hover:border-emerald-400 hover:bg-white'
                              }`}
                          >
                            <Icon size={16} />
                            <span>{label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* — right: info panel — */}
                <div className="flex flex-col gap-2.5 order-3 lg:order-3">
                  <InfoRow Icon={Gauge}      label="Compass Status" value={statusInfo.value} tone={statusInfo.tone} delay={0.1} />
                  <InfoRow Icon={Navigation} label="Live Heading"   value={headingVal}  tone={compass.status === 'live' ? 'ok' : 'neutral'} delay={0.18} />
                  <InfoRow Icon={Activity}   label="Accuracy"       value={accuracyVal} tone="neutral" delay={0.26} />
                  <InfoRow Icon={Clock}      label="Last Updated"   value={lastUpdated} tone={compass.status === 'live' ? 'ok' : 'neutral'} delay={0.34} />

                  {/* enable / stop button */}
                  {compass.status === 'live' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={compass.stop}
                      className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-white/70 border border-emerald-900/10 text-emerald-700 hover:bg-white font-semibold text-sm px-4 py-3 transition"
                    >
                      <RotateCcw size={15} /> Stop Compass
                    </motion.button>
                  ) : showEnableBtn && bearing != null && compass.status !== 'denied' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={compass.enable}
                      disabled={compass.status === 'requesting'}
                      className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm px-4 py-3 shadow-md shadow-emerald-900/20 transition"
                    >
                      {compass.status === 'requesting'
                        ? <><Loader2 size={15} className="animate-spin" /> Requesting…</>
                        : <><Compass size={15} /> Calibrate Compass <ArrowRight size={14} /></>}
                    </motion.button>
                  ) : compass.status === 'denied' ? (
                    <div className="mt-1 rounded-xl bg-rose-500/10 border border-rose-400/30 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-rose-600">Compass access denied</p>
                      <p className="text-xs text-rose-500/70 mt-0.5">Enable Motion &amp; Orientation in settings.</p>
                    </div>
                  ) : null}

                  {needsCalibration && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-2 text-xs text-amber-700 bg-amber-400/15 border border-amber-400/30 rounded-xl px-3 py-2.5">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Move your device in a figure-8 to calibrate</span>
                    </motion.div>
                  )}
                  {isIOS && showEnableBtn && compass.status !== 'denied' && (
                    <p className="text-[11px] text-emerald-700/50 text-center">iOS requires permission to access the compass sensor.</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── Additional Tools ── */}
            <motion.div
              variants={rise}
              className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-parchment/95 backdrop-blur-xl shadow-xl shadow-emerald-950/30 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-emerald-900">Additional Tools</h2>
                <AnimatePresence>
                  {shareMsg && (
                    <motion.span
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full"
                    >
                      {shareMsg}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {TOOLS.map(({ Icon, title, desc, action, soon, onClick }, i) => (
                  <motion.button
                    key={title}
                    onClick={onClick}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                    whileHover={{ y: -4 }}
                    className="group relative text-left rounded-2xl border border-emerald-900/8 bg-white/60 backdrop-blur-sm p-4 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/10 transition disabled:cursor-default"
                  >
                    {soon && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide text-gold-700 bg-gold-100 border border-gold-300/50 px-1.5 py-0.5 rounded">Soon</span>
                    )}
                    <motion.span
                      className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-900/5 mb-3"
                      whileHover={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon size={18} />
                    </motion.span>
                    <p className="text-sm font-bold text-emerald-900 leading-tight">{title}</p>
                    <p className="text-[11px] text-emerald-700/55 mt-0.5 leading-snug">{desc}</p>
                    <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${soon ? 'text-emerald-700/40' : 'text-emerald-600 group-hover:gap-2'} transition-all`}>
                      {action} {!soon && <ArrowRight size={12} />}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div className="flex flex-col gap-5">

            {/* ── Map card ── */}
            <motion.div
              ref={mapRef}
              variants={rise}
              className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-parchment/95 backdrop-blur-xl shadow-xl shadow-emerald-950/30 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div animate={{ x: [0, 3, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                    <Navigation size={16} className="text-emerald-600" />
                  </motion.div>
                  <h2 className="font-display font-bold text-base text-emerald-900">Direction to the Kaaba</h2>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700/55 bg-emerald-50 border border-emerald-900/5 px-2.5 py-1 rounded-full">Great-circle path</span>
              </div>
              {showMap ? (
                <div className="rounded-2xl overflow-hidden border border-emerald-900/10">
                  <QiblaMap userLat={loc.lat!} userLng={loc.lng!} />
                </div>
              ) : (
                <div className="h-[260px] rounded-2xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/40 flex flex-col items-center justify-center gap-2 text-emerald-600/60">
                  <MapIcon size={36} strokeWidth={1.2} />
                  <p className="text-xs font-medium">Set your location to see the path</p>
                </div>
              )}
              <p className="text-[11px] text-emerald-700/50 mt-3 text-center">
                {bearing != null
                  ? <>The dashed line shows the shortest path to Makkah — face {bearing.toFixed(0)}° ({compassPoint(bearing)}).</>
                  : 'The dashed line shows the shortest path to Makkah.'}
              </p>
            </motion.div>

            {/* ── How to find ── */}
            <motion.div
              variants={rise}
              className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-parchment/95 backdrop-blur-xl shadow-xl shadow-emerald-950/30 p-6"
            >
              <h2 className="font-display font-bold text-base text-emerald-900">How to find Qibla direction</h2>
              <p className="text-xs text-emerald-700/55 mt-0.5 mb-5">Follow these simple steps</p>

              <div className="relative">
                {/* connecting line */}
                <div aria-hidden className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 hidden sm:block" />
                <div className="relative grid grid-cols-5 gap-1">
                  {STEPS.map(({ step, title, sub }, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 14, scale: 0.85 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                      className="flex flex-col items-center text-center gap-2"
                    >
                      <motion.span
                        className="relative z-10 w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-emerald-900/20 ring-4 ring-parchment"
                        whileHover={{ scale: 1.15 }}
                      >
                        {step}
                      </motion.span>
                      <div>
                        <p className="text-[11px] font-bold text-emerald-900 leading-tight">{title}</p>
                        <p className="text-[10px] text-emerald-700/50 leading-tight mt-0.5">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 border border-gold-200/60 px-3 py-2.5">
                <Sparkles size={13} className="shrink-0 text-gold-600 mt-0.5" />
                <p className="text-[11px] text-emerald-800/70 leading-snug">
                  <span className="font-bold text-gold-700">Tip:</span> Stay away from metal objects and
                  electronics, and wave your phone in a figure-8 to recalibrate the magnetometer.
                </p>
              </div>
            </motion.div>

            {/* ── Holy Kaaba card (dark glass) ── */}
            <motion.div
              variants={rise}
              className="relative overflow-hidden rounded-3xl border border-emerald-700/30 p-6 text-white"
              style={{ background: 'linear-gradient(150deg,rgba(6,95,70,0.92) 0%,rgba(4,40,30,0.95) 100%)' }}
            >
              <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 70%)' }} />
              </div>
              <div className="relative flex items-start gap-4">
                <motion.span className="text-4xl" animate={{ y: [0, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>🕋</motion.span>
                <div>
                  <p className="font-display font-bold text-lg mb-1">The Holy Kaaba — Makkah</p>
                  <p className="text-xs text-emerald-100/70 leading-relaxed">
                    The Kaaba (الكعبة) is the House of Allah at the centre of Masjid al-Haram in Makkah,
                    Saudi Arabia. It is the holiest site in Islam and the direction Muslims face during prayer.
                    Coordinates 21.4225° N, 39.8262° E.
                  </p>
                  {distKm != null && (
                    <motion.p animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}
                      className="text-xs text-gold-300 mt-2 font-semibold">
                      Distance from your location: {formatDistance(distKm)}
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Did you know banner ─────────────────────────────────────────── */}
        <motion.div
          variants={rise}
          className="group relative overflow-hidden rounded-3xl border border-gold-300/20 bg-parchment/95 backdrop-blur-xl shadow-xl shadow-emerald-950/30 mt-5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          {/* sheen sweep on hover */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-y-2 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-sheen" />
          </div>
          <motion.span
            className="inline-flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl bg-gold-gradient text-midnight-900 shadow-glow-gold"
            animate={{ rotate: [0, 12, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles size={20} />
          </motion.span>
          <div className="relative flex-1">
            <p className="font-bold text-emerald-900 text-sm">Did you know?</p>
            <p className="text-xs text-emerald-800/65 mt-0.5">
              The Qibla direction changes slightly depending on your exact location on Earth —
              it always points along the great-circle path to Makkah, not a straight line on a flat map.
            </p>
          </div>
          <a
            href="https://en.wikipedia.org/wiki/Qibla"
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white/70 hover:bg-white text-emerald-700 font-semibold text-xs px-4 py-2.5 transition group-hover:gap-3"
          >
            Learn More <ExternalLink size={13} />
          </a>
        </motion.div>
        </motion.div>
      </div>
      </ContentBackdrop>
    </div>
  );
}
