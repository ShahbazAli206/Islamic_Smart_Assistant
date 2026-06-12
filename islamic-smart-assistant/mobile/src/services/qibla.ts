// Qibla direction maths for the mobile app. Pure + offline — mirrors
// web/src/lib/qibla.ts exactly. Keep the two in sync if the formula changes.
//
// The Qibla is the great-circle direction from the worshipper to the Kaaba,
// reported as an initial bearing clockwise from TRUE north (0°=N, 90°=E). The
// compass screen rotates a needle by (qiblaBearing − deviceHeading) so it points
// at the Kaaba regardless of how the phone is held.

/** Kaaba coordinates (matches the major Qibla services / AlAdhan). */
export const KAABA = { lat: 21.4225, lng: 39.8262 } as const;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Initial great-circle bearing from (lat, lng) to the Kaaba, degrees clockwise
 * from true north, normalized to [0, 360). Verified: London ≈ 119°,
 * New York ≈ 58°, Jakarta ≈ 295°, Istanbul ≈ 152°.
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

/** Great-circle (haversine) distance to the Kaaba in km. */
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
];

/** Nearest 16-point compass label, e.g. 119° → "ESE". */
export function compassPoint(bearing: number): string {
  const i = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[i];
}

/** Human-readable distance, e.g. "4,794 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

/**
 * Smallest signed angular difference from a to b in (−180, 180]. Positive means
 * b is clockwise from a — used to rotate the needle the short way round.
 */
export function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * True when the device heading is within `toleranceDeg` of the Qibla, so the UI
 * can light up / vibrate to confirm the phone is pointing the right way.
 */
export function isAligned(heading: number, bearing: number, toleranceDeg = 5): boolean {
  return Math.abs(angleDelta(heading, bearing)) <= toleranceDeg;
}
