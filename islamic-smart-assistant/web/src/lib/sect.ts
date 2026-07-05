// Sect / madhab → prayer-time calculation parameters.
//
// Mirrors the backend engine (backend/src/modules/prayer-times/prayer-time.engine.ts)
// but expressed as AlAdhan API params so the web app can calculate times for any
// coordinate without requiring a logged-in backend session.
//
// AlAdhan params:
//   method — controls Fajr/Isha twilight angles (the regional convention)
//   school — controls the Asr shadow ratio: 0 = Standard (Shafi/Maliki/Hanbali), 1 = Hanafi
// Docs: https://aladhan.com/prayer-times-api

export type Sect = 'sunni' | 'shia';
export type Fiqh = 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari';

// AlAdhan calculation-method IDs.
export const METHODS: Record<string, number> = {
  ShiaIthnaAshari: 0,
  Karachi: 1,
  ISNA: 2,
  MWL: 3,
  Makkah: 4,
  Egyptian: 5,
  Tehran: 7,
  Gulf: 8,
  Kuwait: 9,
  Qatar: 10,
  Singapore: 11,
  Turkey: 13,
};

// Human-readable list for an optional "advanced method" override dropdown.
export const METHOD_LABELS: { id: number; label: string }[] = [
  { id: 3, label: 'Muslim World League' },
  { id: 1, label: 'Univ. of Islamic Sciences, Karachi' },
  { id: 2, label: 'ISNA (North America)' },
  { id: 4, label: 'Umm al-Qura (Makkah)' },
  { id: 5, label: 'Egyptian General Authority' },
  { id: 8, label: 'Gulf Region' },
  { id: 9, label: 'Kuwait' },
  { id: 10, label: 'Qatar' },
  { id: 11, label: 'Singapore' },
  { id: 13, label: 'Diyanet (Turkey)' },
  { id: 0, label: 'Fiqah Jafri' },
  { id: 7, label: 'Institute of Geophysics, Tehran' },
];

export const FIQH_BY_SECT: Record<Sect, Fiqh[]> = {
  sunni: ['hanafi', 'shafi', 'maliki', 'hanbali'],
  shia: ['jafari'],
};

export const FIQH_LABEL: Record<Fiqh, string> = {
  hanafi: 'Hanafi',
  shafi: "Shafi'i",
  maliki: 'Maliki',
  hanbali: 'Hanbali',
  jafari: "Ja'fari",
};

export interface CalcParams {
  method: number; // AlAdhan method id
  school: 0 | 1; // 0 = Standard asr, 1 = Hanafi asr
}

/**
 * The onboarding wizard stores isa:sect as the madhab name (hanafi, shafii, etc.)
 * but the prayer-times page expects 'sunni' | 'shia'. This normalizes any value.
 */
export function normalizeSect(raw: string): Sect {
  if (raw === 'sunni' || raw === 'shia') return raw;
  if (raw === 'shia' || raw === 'jafari') return 'shia';
  return 'sunni'; // hanafi, shafii, maliki, hanbali, or any unknown → sunni
}

/**
 * Map a legacy onboarding school name to the new Fiqh type.
 * The onboarding stores 'shafii' but sect.ts uses 'shafi'.
 */
export function normalizeFiqh(raw: string): Fiqh {
  if (raw === 'shafii') return 'shafi';
  if (['hanafi', 'shafi', 'maliki', 'hanbali', 'jafari'].includes(raw)) return raw as Fiqh;
  return 'hanafi'; // default
}

// IP-geolocation services (e.g. the desktop app's "detect via IP" step) often
// return a 2-letter ISO 3166-1 country code — "PK", not "Pakistan" — while GPS/
// address reverse-geocoding (Nominatim) and manually typed countries return the
// full name. Normalize recognized codes to their full name before matching below,
// otherwise every IP-detected desktop user silently misses their country's
// convention and falls back to a generic sect default instead.
const ISO2_TO_NAME: Record<string, string> = {
  pk: 'Pakistan', bd: 'Bangladesh', in: 'India',
  sa: 'Saudi Arabia', kw: 'Kuwait', qa: 'Qatar', ae: 'United Arab Emirates',
  bh: 'Bahrain', om: 'Oman', iq: 'Iraq', ye: 'Yemen',
  eg: 'Egypt', jo: 'Jordan', ps: 'Palestine', sy: 'Syria', lb: 'Lebanon',
  ly: 'Libya', tn: 'Tunisia', dz: 'Algeria', ma: 'Morocco', sd: 'Sudan',
  ir: 'Iran', tr: 'Turkey',
  sg: 'Singapore', my: 'Malaysia', id: 'Indonesia', bn: 'Brunei',
  us: 'United States', ca: 'Canada', mx: 'Mexico',
};

/**
 * Returns the most widely-used AlAdhan calculation method id for a given country,
 * or null when the country is unrecognised (callers should fall back to a sect default).
 * Centralised here so onboarding, prayer-times page, and Azan scheduler all agree.
 */
export function methodByCountry(country: string): number | null {
  let c = (country ?? '').toLowerCase();
  if (!c) return null;
  if (/^[a-z]{2}$/.test(c) && ISO2_TO_NAME[c]) c = ISO2_TO_NAME[c].toLowerCase();
  // South Asia
  if (c.includes('pakistan')) return METHODS.Karachi;
  if (c.includes('bangladesh') || c.includes('india')) return METHODS.Karachi;
  // Arabian Peninsula
  if (c.includes('saudi') || c.includes('mecca') || c.includes('makkah')) return METHODS.Makkah;
  if (c.includes('kuwait')) return METHODS.Kuwait;
  if (c.includes('qatar')) return METHODS.Qatar;
  if (c.includes('united arab') || c.includes('uae') || c.includes('emirates')
    || c.includes('bahrain') || c.includes('oman') || c.includes('iraq') || c.includes('yemen')) return METHODS.Gulf;
  // North Africa / Levant
  if (c.includes('egypt') || c.includes('jordan') || c.includes('palestine')
    || c.includes('syria') || c.includes('lebanon') || c.includes('libya')
    || c.includes('tunisia') || c.includes('algeria') || c.includes('morocco') || c.includes('sudan')) return METHODS.Egyptian;
  // Iran
  if (c.includes('iran')) return METHODS.Tehran;
  // Turkey / Turkiye
  if (c.includes('turkey') || c.includes('türkiye')) return METHODS.Turkey;
  // Southeast Asia
  if (c.includes('singapore') || c.includes('malaysia') || c.includes('indonesia') || c.includes('brunei')) return METHODS.Singapore;
  // North America
  if (c.includes('united states') || c.includes('usa') || c.includes('canada') || c.includes('mexico')) return METHODS.ISNA;
  // Europe and rest of world → Muslim World League
  return METHODS.MWL;
}

/**
 * Default calculation parameters for a sect/madhab. The `method` here is a sensible
 * default; users can override it with METHOD_LABELS for their local convention.
 */
export function defaultParams(fiqh: Fiqh): CalcParams {
  switch (fiqh) {
    case 'hanafi':
      return { method: METHODS.Karachi, school: 1 };
    case 'jafari':
      return { method: METHODS.ShiaIthnaAshari, school: 0 };
    case 'shafi':
    case 'maliki':
    case 'hanbali':
    default:
      return { method: METHODS.MWL, school: 0 };
  }
}
