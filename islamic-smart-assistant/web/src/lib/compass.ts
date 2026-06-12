'use client';
// Browser compass hook — wraps DeviceOrientationEvent into a React interface for
// the Qibla finder. Handles the iOS vs Android API divergence identified in research:
//
//   iOS (webkitCompassHeading): already TRUE-NORTH, CLOCKWISE — use verbatim.
//   Android (deviceorientationabsolute): alpha is COUNTER-CLOCKWISE, MAGNETIC —
//     clockwise heading = (360 − alpha + screenAngle) % 360.
//   Desktop/Electron: events register but never fire → 2.5 s timeout → 'unsupported'.
//   iOS 13+: requestPermission() MUST be called from a user-gesture handler.

import { useCallback, useEffect, useRef, useState } from 'react';

export type CompassStatus =
  | 'idle'          // not started (iOS 13+: waiting for user's tap to request permission)
  | 'requesting'    // iOS: requestPermission() in-flight
  | 'denied'        // iOS: user denied (or not-from-gesture error)
  | 'starting'      // listeners attached, awaiting first reading
  | 'live'          // receiving readings
  | 'unsupported';  // no magnetometer detected within timeout, or SSR

export interface CompassReading {
  /** True-north clockwise bearing [0, 360). */
  heading: number;
  /** iOS: CLHeading.headingAccuracy in degrees (0–large; negative = invalid/uncalibrated).
   *  Android: always null (library hardcodes a dummy value). */
  accuracy: number | null;
  source: 'ios' | 'absolute';
}

export interface UseCompassResult {
  status: CompassStatus;
  reading: CompassReading | null;
  /** Must be wired to a user-tap handler for iOS 13+ permission; safe to call on Android too. */
  enable: () => void;
  stop: () => void;
}

const NO_SENSOR_TIMEOUT_MS = 2500;

const norm360 = (d: number) => ((d % 360) + 360) % 360;

function getScreenAngle(): number {
  // Only applied to the Android 'absolute' alpha path; iOS webkitCompassHeading
  // is already corrected for screen orientation internally by Apple's SDK.
  const so = (screen as any).orientation;
  if (so && typeof so.angle === 'number') return so.angle;
  // Legacy window.orientation (0/90/-90/180).
  if (typeof (window as any).orientation === 'number') return (window as any).orientation;
  return 0;
}

export function useCompassHeading(): UseCompassResult {
  const [status, setStatus]   = useState<CompassStatus>('idle');
  const [reading, setReading] = useState<CompassReading | null>(null);

  const stopFnRef  = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopFnRef.current?.();
    };
  }, []);

  // Android (and old iOS) auto-start — no permission gate needed.
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setStatus('unsupported');
      return;
    }
    const DOE: any = (window as any).DeviceOrientationEvent;
    // iOS 13+ has requestPermission — stay 'idle' until the user taps "Enable".
    if (typeof DOE?.requestPermission === 'function') return;
    // Android / older iOS / Chromium: attach immediately.
    attachListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachListeners = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus('starting');

    let gotReading     = false;
    let usingAbsolute  = false;

    const timer = setTimeout(() => {
      if (!gotReading && mountedRef.current) setStatus('unsupported');
    }, NO_SENSOR_TIMEOUT_MS);

    // ── iOS: webkitCompassHeading ──────────────────────────────────────────
    // TRUE north, CLOCKWISE, SCREEN-CORRECTED — use as-is; no math needed.
    const iosHandler = (e: DeviceOrientationEvent) => {
      if (usingAbsolute) return; // absolute event already won
      const h = (e as any).webkitCompassHeading;
      if (typeof h !== 'number' || isNaN(h)) return;
      gotReading = true;
      clearTimeout(timer);
      if (!mountedRef.current) return;
      setStatus('live');
      setReading({ heading: norm360(h), accuracy: (e as any).webkitCompassAccuracy ?? null, source: 'ios' });
    };

    // ── Android / Chromium: deviceorientationabsolute ─────────────────────
    // alpha increases COUNTER-CLOCKWISE; clockwise heading = (360 − alpha).
    // Add screen orientation angle to compensate for landscape rotation.
    // Returns MAGNETIC north; for Qibla use this is acceptable (~1-3° off for
    // most populated areas); consumers may optionally apply declination.
    const absHandler = (e: DeviceOrientationEvent) => {
      if (e.absolute !== true || e.alpha == null) return;
      if (typeof (e as any).webkitCompassHeading === 'number') return; // iOS wins
      usingAbsolute = true;
      gotReading    = true;
      clearTimeout(timer);
      if (!mountedRef.current) return;
      setStatus('live');
      const heading = norm360(360 - e.alpha + getScreenAngle());
      setReading({ heading, accuracy: null, source: 'absolute' });
    };

    // 'deviceorientationabsolute' is the canonical event on Android/Chromium.
    // We also watch the plain 'deviceorientation' event (some builds emit
    // absolute data there too, gated by e.absolute === true inside absHandler).
    window.addEventListener('deviceorientationabsolute', absHandler as any, true);
    window.addEventListener('deviceorientation', absHandler as any, true);
    window.addEventListener('deviceorientation', iosHandler, true);

    stopFnRef.current = () => {
      clearTimeout(timer);
      window.removeEventListener('deviceorientationabsolute', absHandler as any, true);
      window.removeEventListener('deviceorientation', absHandler as any, true);
      window.removeEventListener('deviceorientation', iosHandler, true);
    };
  }, []);

  // Called from a user-tap handler in the page. Required on iOS 13+ for the
  // permission dialog; safe and harmless to call on Android.
  const enable = useCallback(() => {
    if (typeof window === 'undefined') { setStatus('unsupported'); return; }
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) { setStatus('unsupported'); return; }

    if (typeof DOE.requestPermission === 'function') {
      setStatus('requesting');
      DOE.requestPermission()
        .then((state: string) => {
          if (!mountedRef.current) return;
          state === 'granted' ? attachListeners() : setStatus('denied');
        })
        .catch(() => { if (mountedRef.current) setStatus('denied'); });
    } else {
      attachListeners();
    }
  }, [attachListeners]);

  const stop = useCallback(() => {
    stopFnRef.current?.();
    if (mountedRef.current) { setStatus('idle'); setReading(null); }
  }, []);

  return { status, reading, enable, stop };
}
