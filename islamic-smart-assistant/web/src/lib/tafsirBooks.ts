// ── Tafsir-ul-Quran library ──────────────────────────────────────────────────
// Catalogue of downloadable tafsir books shown in the Islamic Library page.
//
// Both books are official Dawat-e-Islami (Maktaba-tul-Madina) publications,
// downloaded from dawateislami.net and re-hosted as GitHub release assets
// (same public repo + pattern as the translation audio archives) so the
// in-app reader can stream them with HTTP range requests.
//
// Search uses the STRUCTURED Kanzul Iman text (alquran.cloud edition
// `ur.kanzuliman` — Ahmed Raza Khan), because the PDFs are page scans with no
// text layer; see TafsirLibrary.tsx for how results map back to the books.

export type TafsirVolume = {
  n: number;          // volume number (1-based)
  paras: [number, number]; // inclusive Parah (juz) range this volume covers
  file: string;       // release asset filename
  sizeMb: number;     // download size, MB (rounded)
};

export type TafsirBook = {
  id: string;
  title: string;
  urduTitle: string;
  author: string;         // translation / main author
  tafsirBy?: string;      // tafsir author when different from `author`
  language: string;
  pages?: number;         // total pages (single-volume books)
  cover: string;          // tailwind gradient classes for the book spine
  accent: string;         // accent text colour class
  volumes: TafsirVolume[];
  source: string;
  sourceUrl: string;
  blurb: string;
};

// Public host for the book PDFs (GitHub release assets, ~2 GB/file limit).
// Overridable at build time, mirroring NEXT_PUBLIC_TRANSLATION_AUDIO_BASE.
const DEFAULT_BOOKS_BASE =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases/download/books-v1';

export function booksBase(): string {
  const env = (process.env.NEXT_PUBLIC_TAFSIR_BOOKS_BASE ?? '').trim();
  return (env || DEFAULT_BOOKS_BASE).replace(/\/+$/, '');
}

/** Direct release-asset URL — used for the "download the PDF" link. */
export function bookPdfUrl(file: string): string {
  return `${booksBase()}/${file}`;
}

/**
 * Same-origin streaming URL for the in-app reader. GitHub release assets send
 * no CORS headers, so pdf.js must fetch through /api/tafsir-book (a proxy that
 * forwards Range requests) instead of hitting GitHub directly.
 */
export function bookStreamUrl(file: string): string {
  return `/api/tafsir-book/${encodeURIComponent(file)}`;
}

export const TAFSIR_BOOKS: TafsirBook[] = [
  {
    id: 'kanzul-iman',
    title: 'Al-Quran-ul-Kareem — Kanzul Iman with Tafseer Khazain-ul-Irfan',
    urduTitle: 'القرآن الکریم مع ترجمہ کنز الایمان و تفسیر خزائن العرفان',
    author: 'Alahazrat Imam Ahmed Raza Khan Fazil-e-Barelvi (translation)',
    tafsirBy: 'Sadr-ul-Afazil Mufti Naeemuddin Muradabadi (tafsir)',
    language: 'Urdu',
    pages: 1220,
    cover: 'from-emerald-700 via-emerald-800 to-emerald-950',
    accent: 'text-emerald-500',
    volumes: [
      { n: 1, paras: [1, 30], file: 'kanzul-iman-khazain-ul-irfan.pdf', sizeMb: 268 },
    ],
    source: 'Dawat-e-Islami (Maktaba-tul-Madina)',
    sourceUrl:
      'https://www.dawateislami.net/bookslibrary/ur/al-quran-ul-kareem-kanzul-iman-ma-khazain-ul-irfan',
    blurb:
      'The complete Holy Quran with the renowned Urdu translation Kanzul Iman and the Khazain-ul-Irfan tafsir footnotes, in the original book layout.',
  },
  {
    id: 'sirat-ul-jinan',
    title: 'Sirat-ul-Jinan fi Tafseer-il-Quran (10 volumes)',
    urduTitle: 'صراط الجنان فی تفسیر القرآن',
    author: 'Shaykh-ul-Hadees Mufti Muhammad Qasim Attari',
    language: 'Urdu',
    cover: 'from-amber-600 via-amber-700 to-amber-950',
    accent: 'text-amber-500',
    volumes: [
      { n: 1,  paras: [1, 3],   file: 'sirat-ul-jinan-vol-1.pdf',  sizeMb: 276 },
      { n: 2,  paras: [4, 6],   file: 'sirat-ul-jinan-vol-2.pdf',  sizeMb: 114 },
      { n: 3,  paras: [7, 9],   file: 'sirat-ul-jinan-vol-3.pdf',  sizeMb: 130 },
      { n: 4,  paras: [10, 12], file: 'sirat-ul-jinan-vol-4.pdf',  sizeMb: 62  },
      { n: 5,  paras: [13, 15], file: 'sirat-ul-jinan-vol-5.pdf',  sizeMb: 134 },
      { n: 6,  paras: [16, 18], file: 'sirat-ul-jinan-vol-6.pdf',  sizeMb: 153 },
      { n: 7,  paras: [19, 21], file: 'sirat-ul-jinan-vol-7.pdf',  sizeMb: 128 },
      { n: 8,  paras: [22, 24], file: 'sirat-ul-jinan-vol-8.pdf',  sizeMb: 141 },
      { n: 9,  paras: [25, 27], file: 'sirat-ul-jinan-vol-9.pdf',  sizeMb: 159 },
      { n: 10, paras: [28, 30], file: 'sirat-ul-jinan-vol-10.pdf', sizeMb: 344 },
    ],
    source: 'Dawat-e-Islami (Maktaba-tul-Madina)',
    sourceUrl: 'https://www.dawateislami.net/bookslibrary/ur/sirat-ul-jinan-jild-1',
    blurb:
      'A complete modern Urdu tafsir of the Holy Quran in ten volumes, each covering three Parahs, from the scholars of Dawat-e-Islami.',
  },
];

/** Total size (MB) across all volumes of a book. */
export function bookSizeMb(book: TafsirBook): number {
  return book.volumes.reduce((a, v) => a + v.sizeMb, 0);
}

export function sizeLabel(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb} MB`;
}

/** The volume of a book that contains the given Parah (juz). */
export function volumeForPara(book: TafsirBook, para: number): TafsirVolume {
  return (
    book.volumes.find((v) => para >= v.paras[0] && para <= v.paras[1]) ?? book.volumes[0]
  );
}

// ── Structured Kanzul Iman text (for search) ────────────────────────────────

export type KanzAyah = {
  text: string;           // Kanzul Iman Urdu translation of the ayah
  surah: number;
  surahName: string;      // English surah name
  ayah: number;           // number in surah
  juz: number;
};

/**
 * Download the full structured Kanzul Iman translation (edition
 * `ur.kanzuliman`, Ahmed Raza Khan) — 6,236 ayahs in one request (~2 MB JSON).
 * Cache the promise at module level so the download happens once per session.
 */
let kanzPromise: Promise<KanzAyah[]> | null = null;
export function fetchKanzulImanText(): Promise<KanzAyah[]> {
  if (!kanzPromise) {
    kanzPromise = (async () => {
      const res = await fetch('https://api.alquran.cloud/v1/quran/ur.kanzuliman');
      if (!res.ok) throw new Error(`Quran API ${res.status}`);
      const json = await res.json();
      const out: KanzAyah[] = [];
      for (const s of json.data.surahs as any[]) {
        for (const a of s.ayahs as any[]) {
          out.push({
            text: a.text,
            surah: s.number,
            surahName: s.englishName,
            ayah: a.numberInSurah,
            juz: a.juz,
          });
        }
      }
      return out;
    })().catch((e) => { kanzPromise = null; throw e; });
  }
  return kanzPromise;
}

/** Case/whitespace-insensitive substring search over the Kanzul Iman text. */
export function searchKanz(ayahs: KanzAyah[], query: string, surah?: number): KanzAyah[] {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < 2) return [];
  const results: KanzAyah[] = [];
  for (const a of ayahs) {
    if (surah && a.surah !== surah) continue;
    if (a.text.includes(q)) {
      results.push(a);
      if (results.length >= 60) break;
    }
  }
  return results;
}
