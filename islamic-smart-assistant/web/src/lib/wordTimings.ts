// Word-level recitation timings from the quran.com v4 API.
//
// The per-ayah MP3s on cdn.islamic.network are the same recordings quran.com's
// word alignment was produced against (verified byte-identical for Alafasy,
// Sudais; near-identical for Husary), so the segment timestamps can be applied
// directly to the audio we already stream — no source switch needed.
//
// Segment wire format: [segmentIndex, wordPosition(1-based), fromMs, toMs].
// Older recitations may use the 3-element [wordPosition, fromMs, toMs] form;
// both are handled.

import type { ReciterId } from './quran';

const QURANCOM_API = 'https://api.quran.com/api/v4';

// quran.com recitation ids for our reciters. null = no word alignment exists
// for that reciter; playback falls back to spreading words evenly over the
// ayah duration.
const RECITATION_IDS: Record<ReciterId, number | null> = {
  'ar.abdulbasitmurattal': 2,
  'ar.abdurrahmaansudais': 3,
  'ar.alafasy':            7,
  'ar.husary':             6,
  'ar.minshawi':           9,
  'ar.muhammadayyoub':     null,
  'ar.hanirifai':          5,
};

export type WordSegment = { word: number; from: number; to: number }; // ms

// numberInSurah → word segments, ordered by start time
export type SurahWordTimings = Map<number, WordSegment[]>;

// The Uthmani text splits waqf (pause) marks like ۛ ۚ ۖ into their own
// space-delimited tokens, but they are not spoken words and have no timing
// segment. A token counts as a spoken word only if it contains an Arabic
// letter (includes alef wasla ٱ U+0671).
const ARABIC_LETTER = /[ء-يٱ]/;

export function isSpokenWord(token: string): boolean {
  return ARABIC_LETTER.test(token);
}

export function countSpokenWords(text: string): number {
  return text.split(/\s+/).filter(isSpokenWord).length;
}

export async function fetchWordTimings(
  surahNumber: number,
  reciter: ReciterId,
): Promise<SurahWordTimings | null> {
  const recitationId = RECITATION_IDS[reciter];
  if (!recitationId) return null;
  try {
    // per_page=300 covers the longest surah (Al-Baqarah, 286 ayahs) in one page
    const res = await fetch(
      `${QURANCOM_API}/recitations/${recitationId}/by_chapter/${surahNumber}?per_page=300&fields=segments`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const map: SurahWordTimings = new Map();
    for (const file of json.audio_files ?? []) {
      const numberInSurah = Number(String(file.verse_key ?? '').split(':')[1]);
      if (!numberInSurah || !Array.isArray(file.segments)) continue;
      const segs: WordSegment[] = [];
      for (const s of file.segments) {
        if (!Array.isArray(s) || s.length < 3) continue;
        const [word, from, to] = s.length >= 4 ? [s[1], s[2], s[3]] : [s[0], s[1], s[2]];
        if (typeof word !== 'number' || typeof from !== 'number' || typeof to !== 'number') continue;
        if (to <= from || word < 1) continue;
        segs.push({ word, from, to });
      }
      if (segs.length) {
        segs.sort((a, b) => a.from - b.from);
        map.set(numberInSurah, segs);
      }
    }
    return map.size ? map : null;
  } catch {
    return null; // offline / API down → even-spread fallback
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// The displayed text of every surah's first ayah (except Al-Fatiha, where the
// basmala IS ayah 1, and At-Tawbah, which has none) has the 4-word basmala
// prepended, while the alignment data covers only the ayah's own words.
export function basmalaPrefixWords(surahNumber: number, numberInSurah: number): number {
  return numberInSurah === 1 && surahNumber !== 1 && surahNumber !== 9 ? 4 : 0;
}

/**
 * Map a playback position to the 0-based index of the spoken word being
 * recited (indices count only spoken words — waqf-mark tokens excluded).
 *
 * `prefixWords` = displayed words before the first aligned word (the basmala,
 * see basmalaPrefixWords). If the recording includes the basmala, the pointer
 * sweeps across it evenly until the first timed word begins; if not, the sweep
 * window is a few ms and is effectively invisible. Derived explicitly rather
 * than from the segment data because some ayahs (e.g. 13:1) carry a spurious
 * extra segment for the end-of-ayah marker; the final clamp absorbs those.
 */
export function wordIndexAtTime(
  tMs: number,
  durationMs: number,
  wordCount: number,
  segments: WordSegment[] | null,
  prefixWords = 0,
): number | null {
  if (wordCount <= 0) return null;

  if (!segments || segments.length === 0) {
    if (!durationMs || !Number.isFinite(durationMs)) return null;
    return clamp(Math.floor((tMs / durationMs) * wordCount), 0, wordCount - 1);
  }

  const prefix = clamp(prefixWords, 0, wordCount - 1);
  const first = segments[0];
  if (tMs < first.from) {
    if (prefix > 0) return clamp(Math.floor((tMs / first.from) * prefix), 0, prefix - 1);
    return 0;
  }

  let current = first;
  for (const s of segments) {
    if (s.from <= tMs) current = s;
    else break;
  }
  return clamp(prefix + current.word - 1, 0, wordCount - 1);
}
