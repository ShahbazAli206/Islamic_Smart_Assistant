// Lightweight prayer time + Hijri date helpers using the public AlAdhan API.
// Docs: https://aladhan.com/prayer-times-api

import { DateTime } from 'luxon';

export type PrayerTimes = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

export type Timings = {
  timings: PrayerTimes;
  hijriDate: string;     // e.g. "11 Dhul Hijjah 1446"
  gregorianDate: string; // e.g. "Wed, 28 May 2026"
  city: string;
  country: string;
  timezone?: string;     // IANA tz of the location (from AlAdhan meta), when known
};

export const METHODS = {
  Karachi: 1,            // Univ. Islamic Sciences, Karachi (Hanafi default)
  ISNA: 2,
  MWL: 3,                // Muslim World League
  Makkah: 4,             // Umm al-Qura, Makkah
  Egyptian: 5,           // Egyptian General Authority
  Tehran: 7,             // Institute of Geophysics, Tehran (Jafari)
  Jafari: 0,             // Shia Ithna-Ashari
} as const;

export type MethodId = (typeof METHODS)[keyof typeof METHODS];

/** Error thrown when the location is invalid or the API cannot resolve it. */
export class LocationError extends Error {
  constructor(message: string, public city: string, public country: string) {
    super(message);
    this.name = 'LocationError';
  }
}

export async function fetchTimingsByCity(
  city: string,
  country: string,
  method: MethodId = METHODS.Karachi,
): Promise<Timings> {
  if (!city.trim() || !country.trim()) {
    throw new LocationError('City and country are required.', city, country);
  }

  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new LocationError('Network error — could not reach prayer times service.', city, country);
  }

  if (!res.ok) {
    throw new LocationError(
      `Could not find prayer times for "${city}, ${country}". Please check your location.`,
      city,
      country,
    );
  }

  const json = await res.json();
  const d = json?.data;

  if (!d?.timings || !d?.date) {
    throw new LocationError(
      `Invalid response for "${city}, ${country}". The city/country combination may be incorrect.`,
      city,
      country,
    );
  }

  const timings = trimTimings(d.timings);
  if (!isValidTimings(timings)) {
    throw new LocationError(
      `Could not calculate prayer times for "${city}, ${country}". Please verify your location.`,
      city,
      country,
    );
  }

  return {
    timings,
    hijriDate: `${d.date.hijri?.day ?? '?'} ${d.date.hijri?.month?.en ?? '?'} ${d.date.hijri?.year ?? '?'}`,
    gregorianDate: `${d.date.gregorian?.weekday?.en ?? ''}, ${d.date.gregorian?.day ?? '?'} ${d.date.gregorian?.month?.en ?? '?'} ${d.date.gregorian?.year ?? '?'}`,
    city,
    country,
    timezone: d.meta?.timezone,
  };
}

/**
 * Fetch prayer times for an exact coordinate (e.g. a selected mosque on the map).
 * Works for any location on earth. `method` + `school` come from the chosen sect/madhab.
 */
export async function fetchTimingsByCoords(
  lat: number,
  lng: number,
  opts: { method?: number; school?: 0 | 1; label?: string; date?: Date } = {},
): Promise<Timings> {
  const { method = 3, school = 0, label = '', date = new Date() } = opts;
  const dd = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const url =
    `https://api.aladhan.com/v1/timings/${dd}` +
    `?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Network error — could not reach prayer times service.');
  }

  if (!res.ok) throw new Error('Failed to fetch prayer times');

  const json = await res.json();
  const d = json?.data;

  if (!d?.timings || !d?.date) throw new Error('Invalid response for coordinates');

  const timings = trimTimings(d.timings);
  if (!isValidTimings(timings)) throw new Error('Invalid timing data for coordinates');

  const [city, country] = label.includes(',')
    ? [label.split(',')[0].trim(), label.split(',').slice(1).join(',').trim()]
    : [label || 'Selected location', ''];
  return {
    timings,
    hijriDate: `${d.date.hijri?.day ?? '?'} ${d.date.hijri?.month?.en ?? '?'} ${d.date.hijri?.year ?? '?'}`,
    gregorianDate: `${d.date.gregorian?.weekday?.en ?? ''}, ${d.date.gregorian?.day ?? '?'} ${d.date.gregorian?.month?.en ?? '?'} ${d.date.gregorian?.year ?? '?'}`,
    city,
    country,
    timezone: d.meta?.timezone,
  };
}

/** Detect approximate location from IP using a free geolocation API.
 *  Tries three providers in order so a single outage doesn't block detection. */
export async function detectLocationByIP(): Promise<{ city: string; country: string; lat: number; lng: number }> {
  // 1. ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (res.ok) {
      const d = await res.json();
      if (d.city && (d.country_name || d.country)) {
        return { city: d.city, country: d.country_name ?? d.country ?? '', lat: d.latitude ?? 0, lng: d.longitude ?? 0 };
      }
    }
  } catch { /* fall through */ }

  // 2. ipinfo.io
  try {
    const res2 = await fetch('https://ipinfo.io/json', { cache: 'no-store' });
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2.city && d2.country) {
        const [lat, lng] = (d2.loc || '0,0').split(',').map(Number);
        return { city: d2.city, country: d2.country, lat, lng };
      }
    }
  } catch { /* fall through */ }

  // 3. ip-api.com
  const res3 = await fetch('https://ip-api.com/json/?fields=status,city,country,lat,lon', { cache: 'no-store' });
  if (res3.ok) {
    const d3 = await res3.json();
    if (d3.status === 'success') {
      return { city: d3.city, country: d3.country, lat: d3.lat, lng: d3.lon };
    }
  }
  throw new Error('IP geolocation failed. Check your internet connection.');
}

const TIME_RE = /^\d{2}:\d{2}$/;

function isValidTimings(t: PrayerTimes): boolean {
  return TIME_RE.test(t.Fajr) && TIME_RE.test(t.Sunrise) && TIME_RE.test(t.Dhuhr)
      && TIME_RE.test(t.Asr) && TIME_RE.test(t.Maghrib) && TIME_RE.test(t.Isha);
}

function trimTimings(t: any): PrayerTimes {
  const pick = (s: string) => (s ?? '').slice(0, 5); // strip "(PKT)" suffix
  return {
    Fajr: pick(t?.Fajr),
    Sunrise: pick(t?.Sunrise),
    Dhuhr: pick(t?.Dhuhr),
    Asr: pick(t?.Asr),
    Maghrib: pick(t?.Maghrib),
    Isha: pick(t?.Isha),
  };
}

export type NextPrayer = { name: keyof PrayerTimes; at: Date; inMs: number };

export function nextPrayer(times: PrayerTimes, now: Date = new Date()): NextPrayer | null {
  if (!times || !isValidTimings(times)) return null;

  const order: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (const name of order) {
    const parts = times[name]?.split(':');
    if (!parts || parts.length < 2) continue;
    const [h, m] = parts.map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const at = new Date(now);
    at.setHours(h, m, 0, 0);
    if (at.getTime() > now.getTime()) {
      return { name, at, inMs: at.getTime() - now.getTime() };
    }
  }
  // All passed — next is tomorrow's Fajr
  const parts = times.Fajr?.split(':');
  if (!parts || parts.length < 2) return null;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(h, m, 0, 0);
  return { name: 'Fajr', at, inMs: at.getTime() - now.getTime() };
}

/**
 * Timezone-aware variant of nextPrayer. `timezone` is the IANA zone of the location
 * (from AlAdhan). The returned `inMs` is relative to the real "now", so a live ticking
 * countdown stays correct even when the selected mosque is in another timezone.
 */
export function nextPrayerInZone(
  times: PrayerTimes,
  timezone?: string,
  now: Date = new Date(),
): NextPrayer | null {
  if (!times || !isValidTimings(times)) return null;
  if (!timezone) return nextPrayer(times, now);

  const order: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const localNow = DateTime.fromJSDate(now).setZone(timezone);
  const todayStart = localNow.startOf('day');
  for (const name of order) {
    const parts = times[name]?.split(':');
    if (!parts || parts.length < 2) continue;
    const [h, m] = parts.map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const at = todayStart.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    if (at.toMillis() > localNow.toMillis()) {
      const atJs = at.toJSDate();
      return { name, at: atJs, inMs: atJs.getTime() - now.getTime() };
    }
  }
  const parts = times.Fajr?.split(':');
  if (!parts || parts.length < 2) return null;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const at = todayStart.plus({ days: 1 }).set({ hour: h, minute: m, second: 0, millisecond: 0 });
  const atJs = at.toJSDate();
  return { name: 'Fajr', at: atJs, inMs: atJs.getTime() - now.getTime() };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
