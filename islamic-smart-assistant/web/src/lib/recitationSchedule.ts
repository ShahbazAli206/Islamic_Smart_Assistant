// Data model + pure helpers for the Surah recitation scheduler ("recitation alarm").
// No React, no side effects — safe to unit-test and to call from both the runner
// and the scheduler page. Times are interpreted in the USER'S LOCAL timezone (a
// personal alarm), unlike auto-Azan which uses the prayer location's timezone.

import type { ReciterId, TranslationId } from './quran';

export type RepeatMode = 'once' | 'daily' | 'weekly' | 'monthly';

export type RecitationSchedule = {
  id: string;                 // crypto.randomUUID()
  surahs: number[];           // ordered surah numbers (1..114); added order = play order
  time: string;               // "HH:MM" 24h, local
  date: string;               // "YYYY-MM-DD" anchor: the only day for 'once', and the
                              //   source of the weekday ('weekly') / day-of-month ('monthly')
  repeat: RepeatMode;
  reciter: ReciterId;
  withTranslation: boolean;
  translation: TranslationId; // used when withTranslation; ignored otherwise
  volume: number;             // 0..1, applied to HTMLAudioElement.volume
  enabled: boolean;
  createdAt: number;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "HH:MM" → {h, m}. Returns {h:0,m:0} on a malformed string. */
export function parseHM(time: string): { h: number; m: number } {
  const [h, m] = (time ?? '').split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/** "YYYY-MM-DD" → a LOCAL Date at midnight (avoids the UTC shift of `new Date(str)`). */
function parseLocalDate(date: string): Date {
  const [y, mo, d] = (date ?? '').split('-').map(Number);
  return new Date(y || 1970, (mo || 1) - 1, d || 1);
}

/** A Date → its LOCAL "YYYY-MM-DD". */
function localYMD(d: Date): string {
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${day}`;
}

/** Days in the calendar month that `d` falls in. */
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Whether the schedule should fire on the calendar day `d` (local time).
 * Time-of-day is NOT considered here — the runner checks the HH:MM window
 * separately. For 'once', past dates never match again.
 */
export function isDueOn(s: RecitationSchedule, d: Date): boolean {
  switch (s.repeat) {
    case 'once':
      return localYMD(d) === s.date;
    case 'daily':
      return true;
    case 'weekly':
      return parseLocalDate(s.date).getDay() === d.getDay();
    case 'monthly': {
      // Clamp the anchor day to the last day of short months (e.g. a "31st"
      // schedule fires on Feb 28 / Apr 30).
      const anchorDay = parseLocalDate(s.date).getDate();
      const target = Math.min(anchorDay, daysInMonth(d));
      return d.getDate() === target;
    }
    default:
      return false;
  }
}

/** "06:30" → "6:30 AM". */
export function formatTime(time: string): string {
  const { h, m } = parseHM(time);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Human-readable recurrence + time, e.g. "Every Friday · 6:30 AM". */
export function summarize(s: RecitationSchedule): string {
  const t = formatTime(s.time);
  switch (s.repeat) {
    case 'once': {
      const d = parseLocalDate(s.date);
      return `Once · ${WEEKDAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${t}`;
    }
    case 'daily':
      return `Every day · ${t}`;
    case 'weekly':
      return `Every ${WEEKDAYS[parseLocalDate(s.date).getDay()]} · ${t}`;
    case 'monthly':
      return `Day ${parseLocalDate(s.date).getDate()} monthly · ${t}`;
    default:
      return t;
  }
}

/** Short label for the repeat mode alone (for the segmented control / chips). */
export function repeatLabel(repeat: RepeatMode): string {
  return { once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[repeat];
}
