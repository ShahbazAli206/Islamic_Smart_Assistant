// Thin client for the public AlQuran.cloud / islamic.network APIs.
// Free, no API key, widely used. Docs: https://alquran.cloud/api
const API = 'https://api.alquran.cloud/v1';
const CDN = 'https://cdn.islamic.network/quran/audio';
const SURAH_CDN = 'https://cdn.islamic.network/quran/audio-surah';

export const RECITERS = [
  { id: 'ar.abdulbasitmurattal',  name: 'Abdul Basit (Murattal)',  arabic: 'عبد الباسط عبد الصمد' },
  { id: 'ar.abdurrahmaansudais',  name: 'Abdurrahman As-Sudais',   arabic: 'عبد الرحمن السديس' },
  { id: 'ar.alafasy',             name: 'Mishary Alafasy',         arabic: 'مشاري العفاسي' },
  { id: 'ar.husary',              name: 'Mahmoud Khalil Al-Husary', arabic: 'محمود خليل الحصري' },
  { id: 'ar.minshawi',            name: 'Mohamed Siddiq Al-Minshawi', arabic: 'محمد صديق المنشاوي' },
  { id: 'ar.muhammadayyoub',      name: 'Muhammad Ayyoub',         arabic: 'محمد أيوب' },
  { id: 'ar.hanirifai',           name: 'Hani Ar-Rifai',           arabic: 'هاني الرفاعي' },
] as const;

export type ReciterId = (typeof RECITERS)[number]['id'];

// `audio: true` means spoken ayah-by-ayah translation audio is available (see
// AUDIO_TRANSLATION below). Languages without a free per-ayah recording are
// marked `audio: false` and display the translation text only.
export const TRANSLATIONS = [
  { id: 'none',           name: 'No translation',                short: 'Arabic only', audio: false },
  // English — spoken audio by Ibrahim Walk (Saheeh International)
  { id: 'en.sahih',       name: 'English — Saheeh Intl.',        short: 'English',  audio: true },
  { id: 'en.asad',        name: 'English — Muhammad Asad',       short: 'English',  audio: true },
  // Urdu — spoken audio by Shamshad Ali Khan
  { id: 'ur.jalandhry',   name: 'Urdu — Fateh M. Jalandhry',     short: 'اردو',     audio: true },
  { id: 'ur.junagarhi',   name: 'Urdu — M. Junagarhi',           short: 'اردو',     audio: true },
  // Turkish — spoken audio by Diyanet Vakfı (matches the tr.vakfi text exactly)
  { id: 'tr.vakfi',       name: 'Turkish — Diyanet Vakfı',       short: 'Türkçe',   audio: true },
  { id: 'tr.diyanet',     name: 'Turkish — Diyanet İşleri',      short: 'Türkçe',   audio: true },
  { id: 'tr.yazir',       name: 'Turkish — Elmalılı H. Yazır',   short: 'Türkçe',   audio: true },
  // Chinese — spoken audio (Ma Jian)
  { id: 'zh.majian',      name: 'Chinese — Ma Jian',             short: '中文',     audio: true },
  // French — spoken audio by Youssouf Leclerc
  { id: 'fr.hamidullah',  name: 'French — Muhammad Hamidullah',  short: 'Français', audio: true },
  // Bengali — text only (no free per-ayah spoken-audio recording exists)
  { id: 'bn.bengali',     name: 'Bengali — Muhiuddin Khan (text only)', short: 'বাংলা', audio: false },
  { id: 'bn.hoque',       name: 'Bengali — Zohurul Hoque (text only)',  short: 'বাংলা', audio: false },
  // Hindi — text only (no free per-ayah spoken-audio recording exists)
  { id: 'hi.hindi',       name: 'Hindi — Suhel Farooq Khan (text only)', short: 'हिन्दी', audio: false },
  { id: 'hi.farooq',      name: 'Hindi — M. Farooq Khan (text only)',    short: 'हिन्दी', audio: false },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]['id'];

// 128 kbps tier returns 403 on the public CDN — use 192 (or 64) which are open.
export function surahAudioUrl(surahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${SURAH_CDN}/${bitrate}/${reciter}/${surahNumber}.mp3`;
}

export function ayahAudioUrl(globalAyahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${CDN}/${bitrate}/${reciter}/${globalAyahNumber}.mp3`;
}

// Spoken ayah-by-ayah translation audio editions on the islamic.network CDN
// (the same CDN used for Arabic recitation). Each edition is hosted at exactly
// ONE bitrate; the others return 403. Keyed by the chosen TEXT translation id —
// where a language has only one spoken recording, every text edition of that
// language maps to it. All five recordings below were verified to cover the
// full Quran (global ayah numbers 1..6236).
const AUDIO_TRANSLATION: Record<string, { edition: string; bitrate: 64 | 128 | 192 }> = {
  'en.sahih':      { edition: 'en.walk',        bitrate: 192 }, // Ibrahim Walk (Saheeh Intl.)
  'en.asad':       { edition: 'en.walk',        bitrate: 192 }, // only English recording available
  'ur.jalandhry':  { edition: 'ur.khan',        bitrate: 64  }, // Shamshad Ali Khan
  'ur.junagarhi':  { edition: 'ur.khan',        bitrate: 64  },
  'tr.vakfi':      { edition: 'tr.vakfi-audio', bitrate: 128 }, // Diyanet Vakfı (exact text match)
  'tr.diyanet':    { edition: 'tr.vakfi-audio', bitrate: 128 },
  'tr.yazir':      { edition: 'tr.vakfi-audio', bitrate: 128 },
  'zh.majian':     { edition: 'zh.chinese',     bitrate: 128 }, // Ma Jian
  'fr.hamidullah': { edition: 'fr.leclerc',     bitrate: 128 }, // Youssouf Leclerc
  // bn.* and hi.* have no free per-ayah spoken-audio recording — text only.
};

/** Whether the given translation has spoken ayah-by-ayah audio. */
export function hasTranslationAudio(translation: TranslationId): boolean {
  return translation in AUDIO_TRANSLATION;
}

/**
 * Spoken translation audio for one ayah, served from the islamic.network CDN by
 * GLOBAL ayah number (1..6236 across the whole Quran — i.e. AyahResponse.number,
 * NOT numberInSurah). Returns null when the chosen translation has no recorded
 * audio (e.g. Bengali, Hindi) — the player then shows the text without audio.
 */
export function translationAudioUrl(
  translation: TranslationId,
  globalAyahNumber: number,
): string | null {
  const a = AUDIO_TRANSLATION[translation];
  if (!a) return null;
  return `${CDN}/${a.bitrate}/${a.edition}/${globalAyahNumber}.mp3`;
}

export type AyahResponse = {
  number: number;                // global ayah number across the whole Quran
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  audio?: string;
};

export type SurahResponse = {
  number: number;
  name: string;            // Arabic name
  englishName: string;
  englishNameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
  ayahs: AyahResponse[];
};

export async function fetchSurah(
  surahNumber: number,
  edition: string = 'quran-uthmani',
): Promise<SurahResponse> {
  const res = await fetch(`${API}/surah/${surahNumber}/${edition}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to load surah ${surahNumber}`);
  const json = await res.json();
  return json.data as SurahResponse;
}

export async function fetchSurahMulti(
  surahNumber: number,
  editions: string[],
): Promise<SurahResponse[]> {
  const res = await fetch(`${API}/surah/${surahNumber}/editions/${editions.join(',')}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to load surah ${surahNumber}`);
  const json = await res.json();
  return json.data as SurahResponse[];
}
