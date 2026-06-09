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
  { id: 0, label: 'Shia Ithna-Ashari' },
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
