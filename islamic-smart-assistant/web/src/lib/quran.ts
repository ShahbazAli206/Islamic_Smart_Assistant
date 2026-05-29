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

export const TRANSLATIONS = [
  { id: 'none',          name: 'No translation', short: 'Arabic only' },
  { id: 'en.asad',       name: 'English — Muhammad Asad',  short: 'English' },
  { id: 'en.sahih',      name: 'English — Saheeh Intl.',   short: 'English (Saheeh)' },
  { id: 'ur.jalandhry',  name: 'Urdu — Fateh M. Jalandhry', short: 'اردو ترجمہ' },
  { id: 'ur.junagarhi',  name: 'Urdu — M. Junagarhi',      short: 'اردو ترجمہ' },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]['id'];

// 128 kbps tier returns 403 on the public CDN — use 192 (or 64) which are open.
export function surahAudioUrl(surahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${SURAH_CDN}/${bitrate}/${reciter}/${surahNumber}.mp3`;
}

export function ayahAudioUrl(globalAyahNumber: number, reciter: ReciterId, bitrate: 64 | 192 = 192): string {
  return `${CDN}/${bitrate}/${reciter}/${globalAyahNumber}.mp3`;
}

/**
 * Spoken translation audio (PTV-style). Returns null when the chosen translation
 * has no recorded audio — caller should then either skip or use TTS.
 *
 * everyayah.com numbering is 3-digit-surah + 3-digit-ayahInSurah, e.g. 001001.mp3
 */
export function translationAudioUrl(
  translation: TranslationId,
  surahNumber: number,
  ayahInSurah: number,
): string | null {
  const id = `${String(surahNumber).padStart(3, '0')}${String(ayahInSurah).padStart(3, '0')}`;
  switch (translation) {
    case 'ur.jalandhry':
    case 'ur.junagarhi':
      // Shamshad Ali Khan recites the Fateh Jalandhry Urdu translation.
      return `https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/${id}.mp3`;
    case 'en.asad':
    case 'en.sahih':
      // Ibrahim Walk recites the Sahih International English translation.
      return `https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/${id}.mp3`;
    default:
      return null;
  }
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
