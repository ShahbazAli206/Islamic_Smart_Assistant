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
};

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

    for (const word of verse.words) {
      if (word.char_type_name && word.char_type_name !== 'word' && word.char_type_name !== 'end') continue;
      const line = wordsByLine.get(word.line_number) ?? [];
      line.push({
        line: word.line_number,
        position: word.position,
        textIndopak: word.text_indopak ?? '',
        textUthmani: word.text_uthmani ?? '',
        verseKey: word.verse_key ?? verse.verse_key,
      });
      wordsByLine.set(word.line_number, line);
    }
  }

  const lineNumbers = [...wordsByLine.keys()].sort((a, b) => a - b);
  const lines = lineNumbers.map(n => wordsByLine.get(n)!.sort((a, b) => a.position - b.position));

  return {
    pageNumber,
    juz: [...juzSet].sort((a, b) => a - b),
    surahs: [...surahSet].sort((a, b) => a - b),
    lines,
  };
}

async function fetchPage(pageNumber: number, token: string, clientId: string): Promise<ApiPageResponse> {
  const url = `${API_HOST}/content/api/v4/verses/by_page/${pageNumber}?mushaf=${MUSHAF_ID}&words=true&word_fields=text_indopak,text_uthmani,line_number,position,page_number,verse_key,char_type_name&per_page=300`;
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
