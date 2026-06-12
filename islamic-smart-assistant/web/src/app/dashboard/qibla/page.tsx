'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Compass, MapPin, Navigation, AlertTriangle, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { useCompassHeading } from '@/lib/compass';
import { qiblaBearing, distanceToKaaba, compassPoint, formatDistance, isAligned } from '@/lib/qibla';

const QiblaMap = dynamic(() => import('@/components/QiblaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[340px] rounded-2xl bg-emerald-50 animate-pulse" />
  ),
});

// ── Compass SVG ──────────────────────────────────────────────────────────────
// A 280×280 compass rose that the parent rotates by (qiblaBearing − heading).
// The needle tip (gold/emerald) points UP in SVG space = points toward the Qibla
// when the parent rotation brings it to 0°.

const CX = 140, CY = 140;  // SVG center

function CompassRoseSVG({ aligned }: { aligned: boolean }) {
  // Generate 36 tick marks (every 10°), with major marks at cardinal points.
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const deg  = i * 10;
    const rad  = ((deg - 90) * Math.PI) / 180; // -90 → 0° at top (N)
    const isMajor  = deg % 90  === 0;
    const isMedium = deg % 45  === 0 && !isMajor;
    const r0 = isMajor ? 114 : isMedium ? 118 : 123;
    const r1 = 130;
    return {
      x1: CX + r0 * Math.cos(rad), y1: CY + r0 * Math.sin(rad),
      x2: CX + r1 * Math.cos(rad), y2: CY + r1 * Math.sin(rad),
      isMajor, isMedium,
    };
  });

  const accentColor = aligned ? '#16a34a' : '#059669';
  const ringColor   = aligned ? '#bbf7d0' : '#d1fae5';

  return (
    <svg viewBox="0 0 280 280" width="280" height="280" className="select-none">
      <defs>
        {/* Needle gradient: gold tip → emerald body */}
        <linearGradient id="needleTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D4AF37" />
          <stop offset="30%"  stopColor={accentColor} />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        {/* Subtle radial background */}
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </radialGradient>
        {/* Alignment glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <circle cx={CX} cy={CY} r="138" fill="url(#bgGrad)" />

      {/* Alignment glow ring */}
      {aligned && (
        <circle
          cx={CX} cy={CY} r="136"
          fill="none" stroke="#22c55e" strokeWidth="4"
          opacity="0.7" filter="url(#glow)"
        />
      )}

      {/* Outer ring */}
      <circle cx={CX} cy={CY} r="132" fill="none"
        stroke={ringColor} strokeWidth="2" />

      {/* Subtle 8-point star lines */}
      {[0, 45, 90, 135].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={deg}
            x1={CX - 108 * Math.cos(rad)} y1={CY - 108 * Math.sin(rad)}
            x2={CX + 108 * Math.cos(rad)} y2={CY + 108 * Math.sin(rad)}
            stroke="#059669" strokeWidth="0.5" opacity="0.15"
          />
        );
      })}

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isMajor ? accentColor : '#6ee7b7'}
          strokeWidth={t.isMajor ? 2 : t.isMedium ? 1.5 : 1}
          strokeLinecap="round"
        />
      ))}

      {/* Cardinal labels */}
      {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
        const rad   = ((i * 90 - 90) * Math.PI) / 180;
        const r     = 103;
        const isNorth = label === 'N';
        return (
          <text key={label}
            x={CX + r * Math.cos(rad)}
            y={CY + r * Math.sin(rad) + 5}
            textAnchor="middle"
            fontSize={isNorth ? 15 : 12}
            fontWeight={isNorth ? '700' : '600'}
            fill={isNorth ? accentColor : '#34d399'}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Compass inner decorative ring */}
      <circle cx={CX} cy={CY} r="82" fill="none"
        stroke="#d1fae5" strokeWidth="1" opacity="0.6" />

      {/* ── Needle ────────────────────────────────────────────────────── */}
      {/* Top (toward Qibla) — gold-to-emerald arrow */}
      <polygon
        points={`${CX},28 ${CX + 10},138 ${CX},152 ${CX - 10},138`}
        fill="url(#needleTop)"
      />
      {/* Bottom tail — dark, pointing away from Qibla */}
      <polygon
        points={`${CX - 8},152 ${CX + 8},152 ${CX + 5},215 ${CX},225 ${CX - 5},215`}
        fill="#374151"
        opacity="0.85"
      />

      {/* Center pivot */}
      <circle cx={CX} cy={CY} r="11" fill="white" stroke={accentColor} strokeWidth="2.5" />
      <circle cx={CX} cy={CY} r="4.5" fill={accentColor} />

      {/* Kaaba icon at needle tip */}
      <text x={CX} y={22} textAnchor="middle" fontSize="13">🕋</text>
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QiblaPage() {
  const loc     = useStoredLocation();
  const compass = useCompassHeading();

  // Whether the device is likely iOS (needs explicit permission button).
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setIsIOS(
      typeof window !== 'undefined' &&
      /iP(hone|ad|od)/.test(navigator.userAgent),
    );
  }, []);

  // Qibla bearing + distance (null when no location stored yet).
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

  // ── Smooth CSS rotation (Framer Motion, shortest-path tween) ──────────────
  const rotation    = useMotionValue(bearing ?? 0);
  const lastRotRef  = useRef(bearing ?? 0);

  useEffect(() => {
    // Static mode (no live compass) — snap to bearing once.
    if (compass.status !== 'live' && bearing != null) {
      rotation.set(bearing);
      lastRotRef.current = bearing;
    }
  }, [bearing, compass.status, rotation]);

  useEffect(() => {
    if (compass.reading == null || bearing == null) return;
    const target = bearing - compass.reading.heading;
    const cur    = lastRotRef.current;
    // Shortest angular path so the needle never spins 350° to move 10°.
    const delta  = ((target - cur + 540) % 360) - 180;
    const next   = cur + delta;
    lastRotRef.current = next;
    animate(rotation, next, { type: 'tween', duration: 0.3, ease: 'easeOut' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compass.reading?.heading]);

  // Show the "Enable Compass" button when: iOS (needs gesture) or
  // status is 'idle' on Android (shouldn't normally happen but be safe).
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <span className="inline-flex w-11 h-11 rounded-2xl items-center justify-center
          bg-emerald-600 text-white shadow-lg">
          <Compass size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-display font-bold text-emerald-900">
            Qibla Finder
          </h1>
          <p className="text-sm text-emerald-700/70">
            Direction of Prayer toward the Holy Kaaba
          </p>
        </div>
      </div>

      {/* ── No location set ─────────────────────────────────────────── */}
      {!loc.hasCoords && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex gap-3">
          <MapPin size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Location not set</p>
            <p className="text-amber-700/80 text-xs mt-0.5">
              Visit the Prayer Times page to set your location — your coordinates are
              needed to calculate the exact Qibla direction.
            </p>
          </div>
        </div>
      )}

      {/* ── Location label ──────────────────────────────────────────── */}
      {loc.hasCoords && (
        <div className="flex items-center gap-1.5 mb-6 text-sm text-emerald-700">
          <MapPin size={14} className="shrink-0" />
          <span className="font-medium">{loc.label}</span>
          {bearing != null && (
            <span className="ml-auto text-xs text-emerald-600/70 font-mono">
              {bearing.toFixed(1)}° {compassPoint(bearing)}
            </span>
          )}
        </div>
      )}

      {/* ── Main compass card ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-8 mb-6 flex flex-col items-center gap-6">

        {/* ── Status badges ── */}
        {compass.status === 'live' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700
            bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live compass active
          </span>
        )}
        {compass.status === 'starting' && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 size={13} className="animate-spin" /> Detecting compass sensor…
          </span>
        )}
        {compass.status === 'unsupported' && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50
            border border-slate-200 px-3 py-1 rounded-full">
            <Navigation size={13} /> No compass sensor — showing static bearing
          </span>
        )}

        {/* ── Compass rose (or placeholder) ── */}
        {bearing != null ? (
          <div className="relative">
            {/* Alignment glow ring (outer) — appears when needle is on-target */}
            {aligned && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(34,197,94,0.12)' }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
            <motion.div style={{ rotate: rotation }}>
              <CompassRoseSVG aligned={aligned} />
            </motion.div>
          </div>
        ) : (
          /* No location — show an empty greyed-out compass */
          <div className="w-[280px] h-[280px] rounded-full border-2 border-dashed
            border-emerald-200 flex items-center justify-center text-emerald-300">
            <Compass size={48} strokeWidth={1} />
          </div>
        )}

        {/* ── Aligned banner ── */}
        {aligned && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-emerald-500 text-white
              px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-md"
          >
            <CheckCircle2 size={17} />
            You&apos;re facing the Qibla!
          </motion.div>
        )}

        {/* ── Enable compass button (iOS 13+ / idle) ── */}
        {showEnableBtn && bearing != null && (
          <div className="flex flex-col items-center gap-3">
            {compass.status === 'denied' ? (
              <div className="text-center text-sm text-rose-600 bg-rose-50 border border-rose-200
                rounded-xl px-4 py-3">
                <p className="font-semibold">Compass access denied</p>
                <p className="text-xs mt-0.5 text-rose-500">
                  Enable Motion &amp; Orientation access in your browser or device settings.
                </p>
              </div>
            ) : (
              <button
                onClick={compass.enable}
                disabled={compass.status === 'requesting'}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
                  disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl
                  shadow-md transition text-sm"
              >
                {compass.status === 'requesting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Requesting access…</>
                ) : (
                  <><Compass size={16} /> Enable Live Compass</>
                )}
              </button>
            )}
            {isIOS && compass.status !== 'denied' && (
              <p className="text-xs text-slate-400 text-center max-w-[240px]">
                iOS requires your permission to access the compass sensor.
              </p>
            )}
          </div>
        )}

        {/* ── Calibration warning ── */}
        {needsCalibration && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50
            border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              Move your device in a figure-8 to calibrate the compass
            </span>
          </div>
        )}

        {/* ── Bearing info row ── */}
        {bearing != null && distKm != null && (
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold font-mono text-emerald-800">
                {bearing.toFixed(0)}°
              </p>
              <p className="text-xs text-emerald-600/70 mt-0.5 font-medium">
                {compassPoint(bearing)}
              </p>
            </div>
            <div className="w-px bg-emerald-100" />
            <div>
              <p className="text-2xl font-bold font-mono text-emerald-800">
                {formatDistance(distKm)}
              </p>
              <p className="text-xs text-emerald-600/70 mt-0.5 font-medium">
                from Kaaba
              </p>
            </div>
          </div>
        )}

        {/* ── Live heading debug (only in live mode) ── */}
        {compass.status === 'live' && compass.reading && (
          <p className="text-[11px] text-slate-400 font-mono">
            heading {compass.reading.heading.toFixed(1)}°
            {compass.reading.accuracy != null && ` · accuracy ±${compass.reading.accuracy.toFixed(0)}°`}
            {' '}· {compass.reading.source}
          </p>
        )}

        {/* ── Re-enable / stop button ── */}
        {compass.status === 'live' && (
          <button
            onClick={compass.stop}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600
              transition px-3 py-1 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw size={12} /> Stop compass
          </button>
        )}
      </div>

      {/* ── Map fallback (desktop / no sensor / denied) ─────────────── */}
      {showMap && (
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-emerald-800">
              Great-circle path to the Kaaba
            </h2>
          </div>
          <QiblaMap userLat={loc.lat!} userLng={loc.lng!} />
          <p className="text-xs text-slate-400 mt-3 text-center">
            The dashed line shows the shortest path from your location to Makkah.
            Face {bearing?.toFixed(0)}° ({compassPoint(bearing!)}) to align with the Qibla.
          </p>
        </div>
      )}

      {/* ── How to use ──────────────────────────────────────────────── */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 text-xs
        text-emerald-700/80 space-y-1.5">
        <p className="font-semibold text-emerald-800 text-sm mb-2">How to use</p>
        <p>• On a mobile device with a compass, tap <strong>Enable Live Compass</strong> and
          slowly rotate until the needle points straight up.</p>
        <p>• The needle tip (gold/green) always points toward the Holy Kaaba in Makkah.</p>
        <p>• On desktop or when no sensor is available, use the bearing angle and map to
          orient yourself manually.</p>
        <p>• If the needle feels sluggish or wrong, wave your device in a figure-8 pattern to
          calibrate the magnetometer.</p>
      </div>
    </div>
  );
}
