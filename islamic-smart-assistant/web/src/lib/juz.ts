// Static list of the 30 Juz (Para) divisions — standard Uthmani mushaf boundaries.
// Kept local so the Para tab never blocks on a network call, mirroring surahs.ts.
import { SURAHS } from './surahs';

export type Juz = {
  number: number;
  arabic: string;
  /** Surah number the juz begins in. */
  startSurah: number;
  /** Ayah number (within startSurah) the juz begins at. */
  startAyah: number;
};

export const JUZ: Juz[] = [
  { number: 1,  arabic: 'الجزء الأول',      startSurah: 1,  startAyah: 1 },
  { number: 2,  arabic: 'الجزء الثاني',      startSurah: 2,  startAyah: 142 },
  { number: 3,  arabic: 'الجزء الثالث',      startSurah: 2,  startAyah: 253 },
  { number: 4,  arabic: 'الجزء الرابع',      startSurah: 3,  startAyah: 93 },
  { number: 5,  arabic: 'الجزء الخامس',      startSurah: 4,  startAyah: 24 },
  { number: 6,  arabic: 'الجزء السادس',      startSurah: 4,  startAyah: 148 },
  { number: 7,  arabic: 'الجزء السابع',      startSurah: 5,  startAyah: 82 },
  { number: 8,  arabic: 'الجزء الثامن',      startSurah: 6,  startAyah: 111 },
  { number: 9,  arabic: 'الجزء التاسع',      startSurah: 7,  startAyah: 88 },
  { number: 10, arabic: 'الجزء العاشر',      startSurah: 8,  startAyah: 41 },
  { number: 11, arabic: 'الجزء الحادي عشر',   startSurah: 9,  startAyah: 93 },
  { number: 12, arabic: 'الجزء الثاني عشر',   startSurah: 11, startAyah: 6 },
  { number: 13, arabic: 'الجزء الثالث عشر',   startSurah: 12, startAyah: 53 },
  { number: 14, arabic: 'الجزء الرابع عشر',   startSurah: 15, startAyah: 1 },
  { number: 15, arabic: 'الجزء الخامس عشر',   startSurah: 17, startAyah: 1 },
  { number: 16, arabic: 'الجزء السادس عشر',   startSurah: 18, startAyah: 75 },
  { number: 17, arabic: 'الجزء السابع عشر',   startSurah: 21, startAyah: 1 },
  { number: 18, arabic: 'الجزء الثامن عشر',   startSurah: 23, startAyah: 1 },
  { number: 19, arabic: 'الجزء التاسع عشر',   startSurah: 25, startAyah: 21 },
  { number: 20, arabic: 'الجزء العشرون',     startSurah: 27, startAyah: 56 },
  { number: 21, arabic: 'الجزء الحادي والعشرون', startSurah: 29, startAyah: 46 },
  { number: 22, arabic: 'الجزء الثاني والعشرون', startSurah: 33, startAyah: 31 },
  { number: 23, arabic: 'الجزء الثالث والعشرون', startSurah: 36, startAyah: 28 },
  { number: 24, arabic: 'الجزء الرابع والعشرون', startSurah: 39, startAyah: 32 },
  { number: 25, arabic: 'الجزء الخامس والعشرون', startSurah: 41, startAyah: 47 },
  { number: 26, arabic: 'الجزء السادس والعشرون', startSurah: 46, startAyah: 1 },
  { number: 27, arabic: 'الجزء السابع والعشرون', startSurah: 51, startAyah: 31 },
  { number: 28, arabic: 'الجزء الثامن والعشرون', startSurah: 58, startAyah: 1 },
  { number: 29, arabic: 'الجزء التاسع والعشرون', startSurah: 67, startAyah: 1 },
  { number: 30, arabic: 'الجزء الثلاثون',    startSurah: 78, startAyah: 1 },
];

/** English label for a juz's starting point, e.g. "Al-Baqarah 142" — used as list subtitle. */
export function juzStartLabel(juz: Juz): string {
  const surah = SURAHS.find(s => s.number === juz.startSurah);
  return surah ? `${surah.englishName} ${juz.startAyah}` : `${juz.startSurah}:${juz.startAyah}`;
}
