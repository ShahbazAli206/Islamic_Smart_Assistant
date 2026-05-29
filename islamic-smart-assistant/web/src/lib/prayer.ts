// Lightweight prayer time + Hijri date helpers using the public AlAdhan API.
// Docs: https://aladhan.com/prayer-times-api

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

export async function fetchTimingsByCity(
  city: string,
  country: string,
  method: MethodId = METHODS.Karachi,
): Promise<Timings> {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  const json = await res.json();
  const d = json.data;
  return {
    timings: trimTimings(d.timings),
    hijriDate: `${d.date.hijri.day} ${d.date.hijri.month.en} ${d.date.hijri.year}`,
    gregorianDate: `${d.date.gregorian.weekday.en}, ${d.date.gregorian.day} ${d.date.gregorian.month.en} ${d.date.gregorian.year}`,
    city,
    country,
  };
}

function trimTimings(t: any): PrayerTimes {
  const pick = (s: string) => (s ?? '').slice(0, 5); // strip "(PKT)" suffix
  return {
    Fajr: pick(t.Fajr),
    Sunrise: pick(t.Sunrise),
    Dhuhr: pick(t.Dhuhr),
    Asr: pick(t.Asr),
    Maghrib: pick(t.Maghrib),
    Isha: pick(t.Isha),
  };
}

export type NextPrayer = { name: keyof PrayerTimes; at: Date; inMs: number };

export function nextPrayer(times: PrayerTimes, now: Date = new Date()): NextPrayer {
  const order: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (const name of order) {
    const [h, m] = times[name].split(':').map(Number);
    const at = new Date(now);
    at.setHours(h, m, 0, 0);
    if (at.getTime() > now.getTime()) {
      return { name, at, inMs: at.getTime() - now.getTime() };
    }
  }
  // All passed — next is tomorrow's Fajr
  const [h, m] = times.Fajr.split(':').map(Number);
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(h, m, 0, 0);
  return { name: 'Fajr', at, inMs: at.getTime() - now.getTime() };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
