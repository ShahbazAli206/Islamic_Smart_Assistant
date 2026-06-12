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

// Whether a translation has spoken ayah-by-ayah audio is decided at runtime by
// hasTranslationAudio() — human editions on the islamic.network CDN are always
// available; Bengali audio is self-generated (TTS) and only "on" once the
// files have been uploaded (see the audio section below). Don't bake an audio
// flag into this list — it would go stale.
export const TRANSLATIONS = [
  { id: 'none',           name: 'No translation',                short: 'Arabic only' },
  // English — spoken audio by Ibrahim Walk (Saheeh International)
  { id: 'en.sahih',       name: 'English — Saheeh Intl.',        short: 'English' },
  { id: 'en.asad',        name: 'English — Muhammad Asad',       short: 'English' },
  // Urdu — spoken audio by Shamshad Ali Khan
  { id: 'ur.jalandhry',   name: 'Urdu — Fateh M. Jalandhry',     short: 'اردو' },
  { id: 'ur.junagarhi',   name: 'Urdu — M. Junagarhi',           short: 'اردو' },
  // Turkish — spoken audio by Diyanet Vakfı (matches the tr.vakfi text exactly)
  { id: 'tr.vakfi',       name: 'Turkish — Diyanet Vakfı',       short: 'Türkçe' },
  { id: 'tr.diyanet',     name: 'Turkish — Diyanet İşleri',      short: 'Türkçe' },
  { id: 'tr.yazir',       name: 'Turkish — Elmalılı H. Yazır',   short: 'Türkçe' },
  // Chinese — spoken audio (Ma Jian)
  { id: 'zh.majian',      name: 'Chinese — Ma Jian',             short: '中文' },
  // French — spoken audio by Youssouf Leclerc
  { id: 'fr.hamidullah',  name: 'French — Muhammad Hamidullah',  short: 'Français' },
  // Bengali — spoken audio is self-generated (TTS) and hosted on Supabase
  { id: 'bn.bengali',     name: 'Bengali — Muhiuddin Khan',      short: 'বাংলা' },
  { id: 'bn.hoque',       name: 'Bengali — Zohurul Hoque',       short: 'বাংলা' },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]['id'];

/**
 * Maps a profile language code (isa:language — 'en', 'ur', …) to the default
 * translation edition. Shared by the Quran player and the recitation scheduler
 * so both honour the same preference.
 */
export function langToTranslation(lang: string): TranslationId {
  const map: Record<string, TranslationId> = {
    en:   'en.sahih',
    ur:   'ur.jalandhry',
    tr:   'tr.vakfi',      // Diyanet Vakfı — text matches its spoken audio exactly
    bn:   'bn.bengali',
    zh:   'zh.majian',
    fr:   'fr.hamidullah',
    none: 'none',
  };
  return map[lang] ?? 'en.sahih';
}

// 128 kbps tier returns 403 on the public CDN — use 192 (or 64) which are open.
export function surahAudioUrl(surahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${SURAH_CDN}/${bitrate}/${reciter}/${surahNumber}.mp3`;
}

export function ayahAudioUrl(globalAyahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${CDN}/${bitrate}/${reciter}/${globalAyahNumber}.mp3`;
}

// ── Spoken translation audio ───────────────────────────────────────────────
// Two sources, both addressed by GLOBAL ayah number (1..6236, i.e.
// AyahResponse.number — NOT numberInSurah):
//
//  (1) Pre-recorded HUMAN editions on the islamic.network CDN (same CDN as the
//      Arabic recitation). Each edition is hosted at exactly ONE bitrate; the
//      others 403. All five were verified to cover the full Quran.
//  (2) Self-generated TTS audio for Bengali (no free human ayah-by-ayah
//      recording exists) — produced once by scripts/generate_translation_audio.py
//      and uploaded to a public Supabase Storage bucket.

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
};

// Translation editions for which we generate TTS audio. The generator reads the
// text of EXACTLY these editions, so the spoken words match the on-screen text;
// the sibling edition (bn.hoque) stays text-only. Value = the folder the files
// live under in the bucket (translations/<folder>/<globalAyah>.mp3).
const TTS_EDITIONS: Record<string, string> = {
  'bn.bengali': 'bn',
};

// A TTS language only becomes "available" once its files have been uploaded.
// Flip it on by listing the folder(s) in NEXT_PUBLIC_TTS_TRANSLATION_LANGS
// (e.g. "bn"); until then Bengali gracefully falls back to text-only.
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const TTS_BUCKET = process.env.NEXT_PUBLIC_TTS_BUCKET || 'quran-audio';
const TTS_LANGS = new Set(
  (process.env.NEXT_PUBLIC_TTS_TRANSLATION_LANGS ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
);

function ttsAudioUrl(translation: TranslationId, globalAyahNumber: number): string | null {
  const folder = TTS_EDITIONS[translation];
  if (!folder || !SUPABASE_URL || !TTS_LANGS.has(folder)) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${TTS_BUCKET}/translations/${folder}/${globalAyahNumber}.mp3`;
}

/** Whether the given translation currently has spoken ayah-by-ayah audio. */
export function hasTranslationAudio(translation: TranslationId): boolean {
  if (translation in AUDIO_TRANSLATION) return true;
  const folder = TTS_EDITIONS[translation];
  return Boolean(folder && SUPABASE_URL && TTS_LANGS.has(folder));
}

/**
 * Spoken translation audio for one ayah, by GLOBAL ayah number. Human editions
 * stream from the islamic.network CDN; Bengali streams self-generated TTS
 * from Supabase Storage. Returns null when no audio exists — the player then
 * shows the translation text only.
 */
export function translationAudioUrl(
  translation: TranslationId,
  globalAyahNumber: number,
): string | null {
  const human = AUDIO_TRANSLATION[translation];
  if (human) return `${CDN}/${human.bitrate}/${human.edition}/${globalAyahNumber}.mp3`;
  return ttsAudioUrl(translation, globalAyahNumber);
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
