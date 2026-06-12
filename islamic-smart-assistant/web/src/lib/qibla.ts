// Qibla direction maths — pure, offline, no API. The Qibla is the great-circle
// direction from the worshipper to the Kaaba in Makkah; we report it as an
// initial bearing measured clockwise from TRUE north (0° = N, 90° = E, …), which
// is exactly what a compass needle needs to point at.
//
// These functions are the single source of truth for the web Qibla finder (and,
// via the Electron shell, the desktop app). The React Native app mirrors them in
// mobile/src/services/qibla.ts — keep the two in sync if the formula changes.

/**
 * Kaaba coordinates. 21.4225°N, 39.8262°E is the value used by the major Qibla
 * services (IslamicFinder, AlAdhan); good to ~metre precision, far below the
 * angular resolution any compass can resolve.
 */
export const KAABA = { lat: 21.4225, lng: 39.8262 } as const;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Initial great-circle bearing from (lat, lng) to the Kaaba, in degrees
 * clockwise from true north, normalized to [0, 360).
 *
 * Uses the standard forward-azimuth formula:
 *   θ = atan2( sin Δλ · cos φ2,  cos φ1 · sin φ2 − sin φ1 · cos φ2 · cos Δλ )
 * where φ1,λ1 is the observer and φ2,λ2 is the Kaaba. This is the *initial*
 * bearing of the shortest path on the sphere — the direction Muslims face for
 * the Qibla — not the constant-heading rhumb line.
 *
 * Verified against published values: London ≈ 119°, New York ≈ 58°,
 * Jakarta ≈ 295°, Istanbul ≈ 152°, Cape Town ≈ 23°.
 */
export function qiblaBearing(lat: number, lng: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const dLng = toRad(KAABA.lng - lng);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle (haversine) distance from (lat, lng) to the Kaaba, in km. */
export function distanceToKaaba(lat: number, lng: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const dPhi = toRad(KAABA.lat - lat);
  const dLng = toRad(KAABA.lng - lng);
  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

/** Nearest 16-point compass label for a bearing, e.g. 119° → "ESE". */
export function compassPoint(bearing: number): string {
  const i = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[i];
}

/** Human-readable distance, e.g. "4,794 km" / "820 m" (for the rare nearby case). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

/**
 * Smallest signed angular difference from a to b in degrees, in (−180, 180].
 * Positive means b is clockwise from a. Used to rotate a needle the short way
 * round so it never spins 350° to move 10°.
 */
export function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * True when the device heading is within `toleranceDeg` of the Qibla, so the UI
 * can light up to confirm the device is pointing the right way.
 */
export function isAligned(heading: number, bearing: number, toleranceDeg = 5): boolean {
  return Math.abs(angleDelta(heading, bearing)) <= toleranceDeg;
}
