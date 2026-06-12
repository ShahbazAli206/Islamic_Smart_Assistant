// useCompassHeading — wraps react-native-compass-heading@2.0.2 into a React hook.
//
// Critical finding from research: this library returns MAGNETIC heading on BOTH
// iOS (reads CLHeading.magneticHeading, not trueHeading) and Android (no
// GeomagneticField declination applied). Callers MUST apply magnetic declination
// to convert to TRUE north, or keep everything in the magnetic frame by computing:
//
//   needle rotation = (qiblaBearingTrue - declination) - magneticHeading
//
// where qiblaBearingTrue = qiblaBearing(lat, lng) from services/qibla.ts
// and declination can be fetched from the 'geomagnetism' npm package.
//
// Native setup (required before building):
//   iOS    — ios/App/Info.plist: add NSLocationWhenInUseUsageDescription key.
//            react-native-permissions Podfile: setup_permissions(['LocationWhenInUse'])
//            Then: cd ios && pod install
//   Android— android/app/src/main/AndroidManifest.xml:
//            <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
//            <uses-feature android:name="android.hardware.sensor.compass" android:required="false"/>
//   RN 0.73: autolinks — no react-native link needed. Rebuild: yarn ios / yarn android.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import CompassHeading from 'react-native-compass-heading';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface CompassState {
  /** MAGNETIC heading [0, 360) clockwise from device north. Null before first reading. */
  heading: number | null;
  /**
   * iOS: CLHeading.headingAccuracy in degrees — low = good, <0 = invalid/uncalibrated.
   * Android: always null (library hardcodes a dummy; not a real accuracy value).
   */
  accuracy: number | null;
  /** False on emulators, devices without a magnetometer, or when permission is unavailable. */
  supported: boolean;
}

const LOCATION_PERM =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

/**
 * @param degreeFilter Minimum heading change (degrees) before firing a callback.
 *                     1–3 is a good balance between responsiveness and JS-thread load.
 */
export function useCompassHeading(degreeFilter = 2): CompassState {
  const [heading, setHeading]   = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);

  const mountedRef   = useRef(true);
  const startedRef   = useRef(false);

  const ensureLocationPerm = useCallback(async (): Promise<boolean> => {
    try {
      const status = await check(LOCATION_PERM);
      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return true;
      if (status === RESULTS.DENIED) {
        const res = await request(LOCATION_PERM);
        return res === RESULTS.GRANTED || res === RESULTS.LIMITED;
      }
      return false; // BLOCKED or UNAVAILABLE
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // No-sensor fallback: if no reading arrives within 3 s, the device either
    // has no magnetometer (most emulators) or the permission was silently denied.
    const noSensorTimer = setTimeout(() => {
      if (mountedRef.current && heading === null) setSupported(false);
    }, 3000);

    (async () => {
      // iOS CLLocationManager won't deliver heading without location auth.
      // On Android it's also needed if we later want a declination fix.
      const ok = await ensureLocationPerm();
      if (!mountedRef.current) return;
      if (!ok && Platform.OS === 'ios') {
        setSupported(false);
        clearTimeout(noSensorTimer);
        return;
      }

      try {
        await CompassHeading.start(degreeFilter, ({ heading: h, accuracy: a }) => {
          if (!mountedRef.current) return;
          clearTimeout(noSensorTimer);
          const norm = ((h % 360) + 360) % 360;
          setHeading(norm);
          setAccuracy(typeof a === 'number' ? a : null);
          setSupported(true);
        });
        startedRef.current = true;
      } catch {
        if (mountedRef.current) setSupported(false);
        clearTimeout(noSensorTimer);
      }
    })();

    return () => {
      mountedRef.current = false;
      clearTimeout(noSensorTimer);
      // stop() is idempotent and safe even if start() never resolved.
      CompassHeading.stop();
      startedRef.current = false;
    };
  // degreeFilter is the only dep; changing it restarts the subscription.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degreeFilter]);

  return { heading, accuracy, supported };
}
