'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { Compass, MapPin, Navigation, AlertTriangle, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { useCompassHeading } from '@/lib/compass';
import { qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned } from '@/lib/qibla';

const QiblaMap = dynamic(() => import('@/components/QiblaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[340px] rounded-2xl bg-midnight-800/40 animate-pulse" />
  ),
});

// ── Needle style types ────────────────────────────────────────────────────────

type NeedleStyle = 'classic' | 'royal' | 'minimal';

interface NeedleStyleOption {
  id: NeedleStyle;
  label: string;
  emoji: string;
  desc: string;
}

const NEEDLE_STYLES: NeedleStyleOption[] = [
  { id: 'classic', label: 'Classic', emoji: '⬆️', desc: 'Gold & green diamond' },
  { id: 'royal',   label: 'Royal',   emoji: '✦',   desc: 'Ornate arrow' },
  { id: 'minimal', label: 'Minimal', emoji: '—',   desc: 'Clean white line' },
];

// ── Compass SVG ───────────────────────────────────────────────────────────────

const CX = 140, CY = 140;

function CompassRoseSVG({
  aligned,
  needleStyle,
}: {
  aligned: boolean;
  needleStyle: NeedleStyle;
}) {
  // 72 tick marks every 5°, major at cardinal/ordinal, medium every 15°
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg     = i * 5;
    const rad     = ((deg - 90) * Math.PI) / 180;
    const isMajor = deg % 90  === 0;
    const isOrd   = deg % 45  === 0 && !isMajor;
    const isMed   = deg % 15  === 0 && !isOrd && !isMajor;
    const r0 = isMajor ? 112 : isOrd ? 116 : isMed ? 119 : 122;
    const r1 = 128;
    return {
      x1: CX + r0 * Math.cos(rad), y1: CY + r0 * Math.sin(rad),
      x2: CX + r1 * Math.cos(rad), y2: CY + r1 * Math.sin(rad),
      isMajor, isOrd, isMed,
    };
  });

  // 16-point decorative star lines
  const starLines = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 22.5;
    const rad = (deg * Math.PI) / 180;
    return { deg, rad };
  });

  const accentColor = aligned ? '#16a34a' : '#059669';
  const goldColor   = '#D4AF37';

  // Inner ring tick marks (decorative, 24 marks)
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
    <svg viewBox="0 0 280 280" width="280" height="280" className="select-none">
      <defs>
        {/* Classic needle: gold → emerald */}
        <linearGradient id="needleClassic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={goldColor} />
          <stop offset="25%"  stopColor="#E8C547" />
          <stop offset="55%"  stopColor={accentColor} />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        {/* Royal needle: deep gold */}
        <linearGradient id="needleRoyal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFE066" />
          <stop offset="20%"  stopColor={goldColor} />
          <stop offset="60%"  stopColor="#B8860B" />
          <stop offset="100%" stopColor="#7B5A00" />
        </linearGradient>
        {/* Outer ring gradient */}
        <linearGradient id="outerRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={goldColor} stopOpacity="0.6" />
          <stop offset="50%"  stopColor={accentColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={goldColor} stopOpacity="0.6" />
        </linearGradient>
        {/* Background gradient */}
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f8fff8" />
          <stop offset="70%"  stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </radialGradient>
        {/* Inner glow */}
        <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={accentColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        {/* Alignment glow filter */}
        <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Needle tip glow */}
        <filter id="tipGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx={CX} cy={CY} r="138" fill="url(#bgGrad)" />

      {/* Inner glow */}
      <circle cx={CX} cy={CY} r="100" fill="url(#innerGlow)" />

      {/* Alignment glow ring */}
      {aligned && (
        <circle
          cx={CX} cy={CY} r="136"
          fill="none" stroke="#22c55e" strokeWidth="5"
          opacity="0.65" filter="url(#glow)"
        />
      )}

      {/* Outer decorative ring (gold) */}
      <circle cx={CX} cy={CY} r="135"
        fill="none" stroke="url(#outerRing)" strokeWidth="1.5" />

      {/* Main tick ring */}
      <circle cx={CX} cy={CY} r="130"
        fill="none" stroke={aligned ? '#bbf7d0' : '#d1fae5'} strokeWidth="1.5" />

      {/* 16-point star lines */}
      {starLines.map(({ deg, rad }) => (
        <line key={deg}
          x1={CX - 106 * Math.cos(rad)} y1={CY - 106 * Math.sin(rad)}
          x2={CX + 106 * Math.cos(rad)} y2={CY + 106 * Math.sin(rad)}
          stroke={accentColor} strokeWidth={deg % 45 === 0 ? 0.8 : 0.4}
          opacity={deg % 45 === 0 ? 0.18 : 0.09}
        />
      ))}

      {/* Outer tick marks (72 total) */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMajor ? goldColor : t.isOrd ? accentColor : '#6ee7b7'}
          strokeWidth={t.isMajor ? 2.5 : t.isOrd ? 2 : t.isMed ? 1.5 : 0.8}
          strokeLinecap="round"
          opacity={t.isMajor ? 1 : t.isOrd ? 0.9 : 0.7}
        />
      ))}

      {/* Cardinal labels */}
      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const rad     = ((i * 90 - 90) * Math.PI) / 180;
        const r       = 102;
        const isNorth = label === 'N';
        return (
          <text key={label}
            x={CX + r * Math.cos(rad)}
            y={CY + r * Math.sin(rad) + 5}
            textAnchor="middle"
            fontSize={isNorth ? 15 : 12}
            fontWeight={isNorth ? '800' : '700'}
            fill={isNorth ? goldColor : accentColor}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Ordinal labels (NE, SE, etc.) */}
      {(['NE', 'SE', 'SW', 'NW'] as const).map((label, i) => {
        const rad = ((i * 90 + 45 - 90) * Math.PI) / 180;
        const r   = 99;
        return (
          <text key={label}
            x={CX + r * Math.cos(rad)}
            y={CY + r * Math.sin(rad) + 4}
            textAnchor="middle"
            fontSize={9}
            fontWeight="600"
            fill={accentColor}
            opacity="0.6"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Middle decorative ring */}
      <circle cx={CX} cy={CY} r="80"
        fill="none" stroke="#d1fae5" strokeWidth="1" opacity="0.5" />

      {/* Inner decorative ticks */}
      {innerTicks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={accentColor} strokeWidth="1" opacity="0.3" strokeLinecap="round"
        />
      ))}

      {/* Inner ring */}
      <circle cx={CX} cy={CY} r="60"
        fill="none" stroke={goldColor} strokeWidth="0.8" opacity="0.25"
        strokeDasharray="4 3"
      />

      {/* ── NEEDLE (style-specific) ───────────────────────────────────── */}
      {needleStyle === 'classic' && (
        <>
          {/* Top diamond (toward Qibla) */}
          <polygon
            points={`${CX},30 ${CX + 11},${CY - 2} ${CX},${CY + 12} ${CX - 11},${CY - 2}`}
            fill="url(#needleClassic)"
            filter="url(#tipGlow)"
          />
          {/* Bottom tail */}
          <polygon
            points={`${CX - 9},${CY + 12} ${CX + 9},${CY + 12} ${CX + 5},210 ${CX},220 ${CX - 5},210`}
            fill="#4b5563" opacity="0.8"
          />
        </>
      )}

      {needleStyle === 'royal' && (
        <>
          {/* Royal: ornate arrow with side wings */}
          <rect x={CX - 4} y={50} width="8" height={CY - 54}
            fill="url(#needleRoyal)" rx="2" />
          <polygon
            points={`${CX},28 ${CX + 18},58 ${CX + 5},52 ${CX + 5},70 ${CX - 5},70 ${CX - 5},52 ${CX - 18},58`}
            fill="url(#needleRoyal)"
            filter="url(#tipGlow)"
          />
          <polygon
            points={`${CX - 4},${CY - 20} ${CX - 18},${CY - 8} ${CX - 4},${CY - 2}`}
            fill={goldColor} opacity="0.5"
          />
          <polygon
            points={`${CX + 4},${CY - 20} ${CX + 18},${CY - 8} ${CX + 4},${CY - 2}`}
            fill={goldColor} opacity="0.5"
          />
          <polygon
            points={`${CX - 5},${CY + 12} ${CX + 5},${CY + 12} ${CX + 3},205 ${CX},215 ${CX - 3},205`}
            fill="#374151" opacity="0.7"
          />
        </>
      )}

      {needleStyle === 'minimal' && (
        <>
          <line x1={CX} y1={36} x2={CX} y2={CY - 2}
            stroke="#ffffff" strokeWidth="3" strokeLinecap="round"
            filter="url(#tipGlow)"
          />
          <polygon
            points={`${CX},28 ${CX + 7},44 ${CX - 7},44`}
            fill="#ffffff"
          />
          <line x1={CX} y1={CY + 12} x2={CX} y2={215}
            stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx={CX} cy={30} r="4" fill={goldColor} />
        </>
      )}

      {/* Center pivot rings */}
      <circle cx={CX} cy={CY} r="14" fill="white" stroke={goldColor} strokeWidth="2" />
      <circle cx={CX} cy={CY} r="9" fill={aligned ? '#dcfce7' : '#f0fdf4'}
        stroke={accentColor} strokeWidth="1.5" />
      <circle cx={CX} cy={CY} r="4" fill={accentColor} />

      {/* Kaaba icon at needle tip */}
      <text x={CX} y={22} textAnchor="middle" fontSize="14"
        filter={aligned ? 'url(#tipGlow)' : undefined}>
        🕋
      </text>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QiblaPage() {
  const loc     = useStoredLocation();
  const compass = useCompassHeading();
  const [needleStyle, setNeedleStyle] = useState<NeedleStyle>('classic');

  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(
      typeof window !== 'undefined' &&
      /iP(hone|ad|od)/.test(navigator.userAgent),
    );
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
    () =>
      compass.reading != null && bearing != null
        ? isAligned(compass.reading.heading, bearing)
        : false,
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
    compass.status === 'idle' ||
    compass.status === 'requesting' ||
    compass.status === 'denied';

  const needsCalibration =
    compass.reading?.source === 'ios' &&
    typeof compass.reading.accuracy === 'number' &&
    (compass.reading.accuracy < 0 || compass.reading.accuracy > 20);

  const showMap =
    (compass.status === 'unsupported' || compass.status === 'denied') &&
    loc.hasCoords && loc.lat && loc.lng;

  const STEPS = [
    { step: '1', icon: '📍', title: 'Set your location',    desc: 'Visit Prayer Times to save your city coordinates first.' },
    { step: '2', icon: '🧭', title: 'Enable live compass',  desc: "Tap \"Enable Live Compass\" — on iOS you'll need to approve access." },
    { step: '3', icon: '🔄', title: 'Rotate slowly',        desc: 'Hold your device flat and turn until the Kaaba needle points straight up.' },
    { step: '4', icon: '✅', title: 'Look for alignment',   desc: "The compass glows green and a banner appears when you're facing the Qibla." },
    { step: '5', icon: '♾️', title: 'Calibrate if drifting', desc: 'Wave your device in a figure-8 pattern to recalibrate the magnetometer.' },
  ];

  return (
    <div className="max-w-2xl mx-auto relative">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex items-center gap-3 mb-8"
      >
        <motion.span
          className="inline-flex w-11 h-11 rounded-2xl items-center justify-center bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          <Compass size={22} />
        </motion.span>
        <div>
          <h1 className="text-2xl font-display font-bold text-emerald-900">Qibla Finder</h1>
          <p className="text-sm text-emerald-700/70">Direction of Prayer toward the Holy Kaaba</p>
        </div>
      </motion.div>

      {/* ── No location set ─────────────────────────────────────────── */}
      {!loc.hasCoords && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-6 mb-6 flex gap-3"
        >
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MapPin size={20} className="shrink-0 text-amber-600 mt-0.5" />
          </motion.div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Location not set</p>
            <p className="text-amber-700/80 text-xs mt-0.5">
              Visit the Prayer Times page to set your location — your coordinates are
              needed to calculate the exact Qibla direction.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Location label ──────────────────────────────────────────── */}
      {loc.hasCoords && (
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="flex items-center gap-1.5 mb-6 text-sm text-emerald-700"
        >
          <MapPin size={14} className="shrink-0" />
          <span className="font-medium">{loc.label}</span>
          {bearing != null && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="ml-auto text-xs text-emerald-600/70 font-mono"
            >
              {bearing.toFixed(1)}° {compassPoint(bearing)}
            </motion.span>
          )}
        </motion.div>
      )}

      {/* ── Main compass card — dark glass ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl p-8 mb-6 flex flex-col items-center gap-6"
        style={{
          background: 'linear-gradient(145deg, rgba(9,22,17,0.88) 0%, rgba(5,14,10,0.95) 100%)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Card top highlight line */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent pointer-events-none" />
        {/* Card inner ambient glows */}
        <div aria-hidden className="absolute pointer-events-none inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)' }} />
        </div>

        {/* ── Status badges ── */}
        <AnimatePresence mode="wait">
          {compass.status === 'live' && (
            <motion.span
              key="live"
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.9 }}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300
                bg-emerald-900/50 border border-emerald-500/30 px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              Live compass active
            </motion.span>
          )}
          {compass.status === 'starting' && (
            <motion.span
              key="starting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-parchment/50"
            >
              <Loader2 size={13} className="animate-spin" /> Detecting compass sensor…
            </motion.span>
          )}
          {compass.status === 'unsupported' && (
            <motion.span
              key="unsupported"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-parchment/50 bg-white/5
                border border-white/10 px-3 py-1 rounded-full"
            >
              <Navigation size={13} /> No compass sensor — showing static bearing
            </motion.span>
          )}
        </AnimatePresence>

        {/* ── Compass with decorative orbiting rings ── */}
        {bearing != null && (
          <div className="relative flex flex-col items-center">

            {/* Floating Kaaba above compass */}
            <AnimatePresence>
              {aligned ? (
                <motion.div
                  key="kaaba-aligned"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: 'loop' }}
                  className="mb-2 text-3xl"
                >
                  🕋
                </motion.div>
              ) : (
                <motion.div
                  key="kaaba-normal"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-2 text-2xl opacity-50"
                >
                  🕋
                </motion.div>
              )}
            </AnimatePresence>

            {/* Decorative orbiting rings */}
            <div className="relative">
              {/* Slow clockwise outer ring */}
              <motion.div
                aria-hidden
                className="absolute rounded-full border border-emerald-500/10 pointer-events-none"
                style={{ inset: '-28px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
              />
              {/* Slow counter-clockwise middle ring */}
              <motion.div
                aria-hidden
                className="absolute rounded-full border border-gold-400/10 pointer-events-none"
                style={{ inset: '-14px' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              />
              {/* Pulsing glow ring when aligned */}
              {aligned && (
                <motion.div
                  aria-hidden
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ background: 'rgba(34,197,94,0.08)' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.3, repeat: Infinity }}
                />
              )}

              {/* The actual rotating compass */}
              <motion.div style={{ rotate: rotation }}>
                <CompassRoseSVG aligned={aligned} needleStyle={needleStyle} />
              </motion.div>
            </div>
          </div>
        )}

        {/* No location — greyed compass */}
        {bearing == null && (
          <motion.div
            animate={{ opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[280px] h-[280px] rounded-full border-2 border-dashed
              border-emerald-700/30 flex items-center justify-center text-emerald-700/30"
          >
            <Compass size={48} strokeWidth={1} />
          </motion.div>
        )}

        {/* ── Needle style selector ── */}
        {bearing != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-2"
          >
            {NEEDLE_STYLES.map((style) => (
              <motion.button
                key={style.id}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setNeedleStyle(style.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl
                  border text-xs font-semibold transition-all duration-200
                  ${needleStyle === style.id
                    ? 'bg-gold-gradient border-gold-500/40 text-midnight-900 shadow-glow-gold'
                    : 'bg-white/5 border-white/10 text-parchment/70 hover:border-emerald-500/30 hover:bg-white/10 hover:text-parchment'
                  }`}
              >
                <span className="text-base">{style.emoji}</span>
                <span>{style.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── Aligned banner ── */}
        <AnimatePresence>
          {aligned && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="flex items-center gap-2 bg-emerald-500 text-white
                px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-emerald-900/40"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <CheckCircle2 size={17} />
              </motion.div>
              You&apos;re facing the Qibla! 🕋
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Enable compass button ── */}
        {showEnableBtn && bearing != null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            {compass.status === 'denied' ? (
              <div className="text-center text-sm text-rose-400 bg-rose-900/30 border border-rose-500/30
                rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="font-semibold">Compass access denied</p>
                <p className="text-xs mt-0.5 text-rose-400/70">
                  Enable Motion &amp; Orientation access in your browser or device settings.
                </p>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={compass.enable}
                disabled={compass.status === 'requesting'}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
                  disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl
                  shadow-lg shadow-emerald-900/40 transition text-sm"
              >
                {compass.status === 'requesting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Requesting access…</>
                ) : (
                  <><Compass size={16} /> Enable Live Compass</>
                )}
              </motion.button>
            )}
            {isIOS && compass.status !== 'denied' && (
              <p className="text-xs text-parchment/30 text-center max-w-[240px]">
                iOS requires your permission to access the compass sensor.
              </p>
            )}
          </motion.div>
        )}

        {/* ── Calibration warning ── */}
        {needsCalibration && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/30
              border border-amber-500/30 rounded-xl px-4 py-2.5 backdrop-blur-sm"
          >
            <AlertTriangle size={14} className="shrink-0" />
            <span>Move your device in a figure-8 to calibrate the compass</span>
          </motion.div>
        )}

        {/* ── Bearing info row — glass stat tiles ── */}
        {bearing != null && distKm != null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-3 w-full justify-center"
          >
            {[
              { value: `${bearing.toFixed(0)}°`,    label: compassPoint(bearing) },
              { value: formatDistance(distKm),       label: 'from Kaaba' },
              {
                value: compass.status === 'live' && compass.reading
                  ? `${compass.reading.heading.toFixed(0)}°` : '—',
                label: 'heading',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                whileHover={{ scale: 1.04 }}
                className="flex-1 text-center bg-white/5 border border-white/8 rounded-2xl px-3 py-3 backdrop-blur-sm"
              >
                <p className="text-xl font-bold font-mono text-parchment leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] text-parchment/40 mt-1 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Live accuracy note ── */}
        {compass.status === 'live' && compass.reading?.accuracy != null && (
          <p className="text-[11px] text-parchment/25 font-mono -mt-3">
            accuracy ±{compass.reading.accuracy.toFixed(0)}° · {compass.reading.source}
          </p>
        )}

        {/* ── Stop compass button ── */}
        {compass.status === 'live' && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={compass.stop}
            className="flex items-center gap-1.5 text-xs text-parchment/30 hover:text-parchment/60
              transition px-3 py-1 rounded-lg hover:bg-white/5"
          >
            <RotateCcw size={12} /> Stop compass
          </motion.button>
        )}

        {/* Card bottom highlight */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      </motion.div>

      {/* ── Map fallback ─────────────────────────────────────────────── */}
      {showMap && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 p-5 mb-6 backdrop-blur-md"
          style={{ background: 'rgba(9,22,17,0.70)' }}
        >
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              animate={{ x: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Navigation size={16} className="text-emerald-400" />
            </motion.div>
            <h2 className="text-sm font-semibold text-parchment/80">
              Great-circle path to the Kaaba
            </h2>
          </div>
          <QiblaMap userLat={loc.lat!} userLng={loc.lng!} />
          <p className="text-xs text-parchment/30 mt-3 text-center">
            The dashed line shows the shortest path from your location to Makkah.
            Face {bearing?.toFixed(0)}° ({compassPoint(bearing!)}) to align with the Qibla.
          </p>
        </motion.div>
      )}

      {/* ── How to use ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 p-5 mb-4 backdrop-blur-md"
        style={{ background: 'rgba(9,22,17,0.60)' }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-4">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-lg"
          >
            📋
          </motion.span>
          <p className="font-semibold text-parchment/90">How to find Qibla direction</p>
        </div>
        <div className="space-y-3">
          {STEPS.map(({ step, icon, title, desc }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/80 text-white
                text-xs font-bold flex items-center justify-center border border-emerald-500/30 shadow-sm">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-parchment/85">
                  {icon} {title}
                </p>
                <p className="text-xs text-parchment/45 mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Kaaba info card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden bg-gradient-to-br from-emerald-800/90 to-emerald-950/95 backdrop-blur-xl rounded-2xl p-5 text-white border border-emerald-700/30"
      >
        {/* Decorative ambient glows */}
        <div aria-hidden className="absolute pointer-events-none inset-0 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
        </div>

        <div className="relative flex items-start gap-4">
          <motion.span
            className="text-4xl"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🕋
          </motion.span>
          <div>
            <p className="font-bold text-base mb-1">The Holy Kaaba — Makkah</p>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              The Kaaba (الكعبة) is the House of God at the centre of Masjid al-Haram.
              Muslims worldwide face toward it during the five daily prayers.
              Its coordinates are 21.4225° N, 39.8262° E.
            </p>
            {distKm != null && (
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-xs text-gold-300 mt-2 font-medium"
              >
                Distance from your location: {formatDistance(distKm)}
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
