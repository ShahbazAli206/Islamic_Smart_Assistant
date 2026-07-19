// One-time data-pipeline script — NOT part of the deployed app.
//
// Fetches the 16-line Indo-Pak mushaf layout (548 pages, mushaf id 7) from the
// Quran Foundation Content API and bakes it into static JSON files consumed at
// runtime by web/src/lib/mushaf.ts. The running app never calls this OAuth-gated
// API directly — it only reads the files this script writes.
//
// Usage (from web/):
//   QF_CLIENT_ID=... QF_CLIENT_SECRET=... npm run ingest:mushaf
// or place QF_CLIENT_ID / QF_CLIENT_SECRET in web/.env.local (already gitignored)
// and this script will pick them up.
//
// Safe to re-run: pages whose output file already exists are skipped, so a
// partial/failed run can simply be re-run to pick up where it left off.
// Pass --force to re-fetch and overwrite every page regardless.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOTAL_PAGES = 548;
const MUSHAF_ID = 7; // IndoPak 16-line layout
const LINES_PER_PAGE = 16;
const OUT_DIR = join(__dirname, '..', 'public', 'data', 'mushaf-indopak16');
const REQUEST_DELAY_MS = 200;
const FORCE = process.argv.includes('--force');

// Prefer production OAuth host; set QF_OAUTH_HOST=prelive for testing credentials.
const OAUTH_HOST =
  process.env.QF_OAUTH_HOST === 'prelive'
    ? 'https://prelive-oauth2.quran.foundation'
    : 'https://oauth2.quran.foundation';
const API_HOST =
  process.env.QF_API_HOST === 'prelive'
    ? 'https://apis-prelive.quran.foundation'
    : 'https://apis.quran.foundation';

function loadDotEnvLocal(): void {
  const envPath = join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${OAUTH_HOST}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'content' }),
  });
  if (!res.ok) throw new Error(`OAuth token request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

type ApiWord = {
  position: number;
  line_number: number;
  page_number: number;
  verse_key?: string;
  text_indopak?: string;
  text_uthmani?: string;
  char_type_name?: string; // 'word' | 'end' (verse-end marker) etc.
};

type ApiVerse = {
  verse_key: string;
  juz_number: number;
  words: ApiWord[];
  text_uthmani_tajweed?: string; // whole-ayah HTML with <tajweed class=X>…</tajweed> spans
};

type ApiPageResponse = {
  verses: ApiVerse[];
};

export type MushafWord = {
  line: number;
  position: number;
  textIndopak: string;
  textUthmani: string;
  verseKey: string;
  /** 'end' = the small ayah-number marker glyph (e.g. ١، ٢), rendered as a
   *  circular roundel rather than an inline word. */
  charType: 'word' | 'end';
  /** Uthmani text for this word with tajweed-rule colors, pre-sanitized to
   *  `<span class="tajweed-RULE">…</span>` + plain text only (see
   *  sanitizeTajweedFragment). Falls back to plain textUthmani (HTML-escaped)
   *  when the source verse had no tajweed markup or didn't parse cleanly. */
  tajweedHtml: string;
};

// ── Tajweed markup handling ──────────────────────────────────────────────────
// text_uthmani_tajweed is a whole-ayah HTML string, e.g.:
//   "بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ … <span class=end>١</span>"
// We need it split into PER-WORD fragments aligned with the verse's `words`
// array (same order/count, confirmed against real API responses) so each
// fragment can be attached to the matching MushafWord.

/** Split on whitespace that is NOT inside an HTML tag (tags like <tajweed
 *  class=ham_wasl> contain spaces of their own, so a naive .split(/\s+/)
 *  breaks tags apart instead of separating words). */
function splitWordsOutsideTags(html: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let depth = 0;
  for (const ch of html) {
    if (ch === '<') depth++;
    if (ch === '>') depth = Math.max(0, depth - 1);
    if (depth === 0 && /\s/.test(ch)) {
      if (cur) tokens.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Converts one word's raw tajweed-tagged fragment into a strictly-limited safe
 * subset: `<span class="tajweed-RULE">…</span>` and plain text only — nothing
 * else survives. Returns null if the fragment doesn't reduce to that safe
 * subset (upstream format changed unexpectedly), so the caller can fall back
 * to plain escaped text instead of trusting arbitrary markup.
 */
function sanitizeTajweedFragment(raw: string): string | null {
  let out = raw.replace(/<tajweed\s+class=([a-zA-Z_]+)[^>]*>/g, '<span class="tajweed-$1">');
  out = out.replace(/<\/tajweed>/g, '</span>');
  // Ayah-end markers are rendered separately via charType === 'end' — never
  // through tajweedHtml — so strip that wrapper down to plain text here.
  out = out.replace(/<span class=end>([^<]*)<\/span>/g, '$1');

  const stripped = out.replace(/<span class="tajweed-[a-z_]+">|<\/span>/g, '');
  if (/[<>]/.test(stripped)) return null; // unexpected leftover markup — bail
  return out;
}

export type MushafPage = {
  pageNumber: number;
  juz: number[];
  surahs: number[];
  lines: MushafWord[][];
};

function transformPage(pageNumber: number, data: ApiPageResponse): MushafPage {
  const wordsByLine = new Map<number, MushafWord[]>();
  const juzSet = new Set<number>();
  const surahSet = new Set<number>();

  for (const verse of data.verses) {
    juzSet.add(verse.juz_number);
    const surahNum = Number(verse.verse_key.split(':')[0]);
    surahSet.add(surahNum);

    // Tajweed HTML is one string for the WHOLE verse — split it into per-word
    // fragments aligned with verse.words (same order/count as the raw,
    // unfiltered words array). If the split count doesn't match, the upstream
    // format changed unexpectedly; skip tajweed for this verse rather than
    // risk misaligned colors (falls back to plain text below).
    const tajweedTokens = verse.text_uthmani_tajweed ? splitWordsOutsideTags(verse.text_uthmani_tajweed) : [];
    const tajweedAligned = tajweedTokens.length === verse.words.length;
    if (verse.text_uthmani_tajweed && !tajweedAligned) {
      console.warn(`Tajweed token count mismatch on ${verse.verse_key}: ${tajweedTokens.length} tokens vs ${verse.words.length} words — falling back to plain text for this verse.`);
    }

    verse.words.forEach((word, wordIdx) => {
      if (word.char_type_name && word.char_type_name !== 'word' && word.char_type_name !== 'end') return;
      // A verse that spans a page boundary is returned by by_page with ALL its
      // words, including the ones that physically sit on the neighboring page
      // (they carry that page's page_number and line_number). Without this
      // filter those words get merged into this page's lines — corrupting line
      // content and inflating some lines to 19-23 words.
      if (word.page_number !== pageNumber) return;
      const line = wordsByLine.get(word.line_number) ?? [];
      const plain = escapeHtml(word.text_uthmani ?? '');
      const sanitized = tajweedAligned ? sanitizeTajweedFragment(tajweedTokens[wordIdx]) : null;
      line.push({
        line: word.line_number,
        position: word.position,
        textIndopak: word.text_indopak ?? '',
        textUthmani: word.text_uthmani ?? '',
        verseKey: word.verse_key ?? verse.verse_key,
        charType: word.char_type_name === 'end' ? 'end' : 'word',
        tajweedHtml: sanitized ?? plain,
      });
      wordsByLine.set(word.line_number, line);
    });
  }

  // Always emit exactly 16 slots (index 0 = line 1, ... index 15 = line 16), even
  // when a page has no content on some lines — e.g. page 1's decorative
  // Al-Fatihah header occupies lines 1-10, so its content only starts at line 11.
  // Rendering blank rows for those lines preserves the real page's vertical
  // rhythm instead of compressing content to the top.
  //
  // IMPORTANT: do NOT sort each line's words by `position` — that field is only
  // the word's index WITHIN ITS OWN VERSE, not a line-relative reading order.
  // When one line contains the tail of a verse followed by the start of the
  // next (very common), sorting by position alone interleaves them (e.g. verse
  // A's word #1 and verse B's word #1 would tie). Words are pushed in the order
  // they're encountered while iterating data.verses (already correct Quran
  // order) and each verse's own words array (already position-ascending), so
  // insertion order alone is already correct reading order — just keep it.
  const lines: MushafWord[][] = Array.from({ length: LINES_PER_PAGE }, (_, i) => wordsByLine.get(i + 1) ?? []);

  return {
    pageNumber,
    juz: [...juzSet].sort((a, b) => a - b),
    surahs: [...surahSet].sort((a, b) => a - b),
    lines,
  };
}

async function fetchPage(pageNumber: number, token: string, clientId: string): Promise<ApiPageResponse> {
  const url = `${API_HOST}/content/api/v4/verses/by_page/${pageNumber}?mushaf=${MUSHAF_ID}&fields=text_uthmani_tajweed&words=true&word_fields=text_indopak,text_uthmani,line_number,position,page_number,verse_key,char_type_name&per_page=300`;
  const res = await fetch(url, {
    headers: { 'x-auth-token': token, 'x-client-id': clientId },
  });
  if (!res.ok) throw new Error(`Page ${pageNumber} request failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as ApiPageResponse;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  loadDotEnvLocal();
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Missing QF_CLIENT_ID / QF_CLIENT_SECRET (set in web/.env.local or the environment).');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Requesting access token…');
  let token = await getAccessToken(clientId, clientSecret);
  let tokenFetchedAt = Date.now();

  const verseToPage: Record<string, number> = {};
  const surahFirstPage: Record<number, number> = {};
  const juzFirstPage: Record<number, number> = {};

  let written = 0;
  let skipped = 0;
  let failed: number[] = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const outFile = join(OUT_DIR, `page-${String(page).padStart(3, '0')}.json`);

    if (!FORCE && existsSync(outFile)) {
      const cached = JSON.parse(readFileSync(outFile, 'utf8')) as MushafPage;
      indexPage(cached);
      skipped++;
      continue;
    }

    // Refresh token if we're close to the 1-hour expiry.
    if (Date.now() - tokenFetchedAt > 50 * 60 * 1000) {
      console.log('Refreshing access token…');
      token = await getAccessToken(clientId, clientSecret);
      tokenFetchedAt = Date.now();
    }

    try {
      const raw = await withRetry(() => fetchPage(page, token, clientId));
      const slim = transformPage(page, raw);
      writeFileSync(outFile, JSON.stringify(slim));
      indexPage(slim);
      written++;
      if (page % 25 === 0 || page === TOTAL_PAGES) console.log(`… page ${page}/${TOTAL_PAGES}`);
    } catch (err) {
      console.error(`Failed page ${page}:`, err);
      failed.push(page);
    }

    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  function indexPage(p: MushafPage) {
    for (const line of p.lines) {
      for (const word of line) {
        if (verseToPage[word.verseKey] === undefined) verseToPage[word.verseKey] = p.pageNumber;
      }
    }
    for (const surah of p.surahs) {
      if (surahFirstPage[surah] === undefined) surahFirstPage[surah] = p.pageNumber;
    }
    for (const juz of p.juz) {
      if (juzFirstPage[juz] === undefined) juzFirstPage[juz] = p.pageNumber;
    }
  }

  writeFileSync(
    join(OUT_DIR, 'index.json'),
    JSON.stringify({ verseToPage, surahFirstPage, juzFirstPage, totalPages: TOTAL_PAGES }),
  );

  console.log(`\nDone. Written: ${written}, already-cached (skipped): ${skipped}, failed: ${failed.length}.`);
  if (failed.length) {
    console.log('Failed pages (re-run this script to retry just these):', failed.join(', '));
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
