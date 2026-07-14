'use client';
// Runtime client for the bundled 16-line Indo-Pak mushaf layout dataset.
//
// This is STATIC DATA (public/data/mushaf-indopak16/*.json), produced offline by
// scripts/ingest-mushaf-indopak16.ts from the Quran Foundation API. The running
// app never calls that (OAuth-gated) API directly — only plain fetch() against
// our own static JSON, so Read Only Mode works without any API key at runtime.
//
// IMPORTANT: this dataset's page numbers (1..548, Indo-Pak 16-line layout) are a
// DIFFERENT pagination scheme from AyahResponse.page in quran.ts (604-page
// Uthmani layout from alquran.cloud, used only as a display label in
// QuranPlayer). Never mix the two — always call this page a "mushaf page".

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCachedMushafPage, getCachedMushafIndex, putCachedMushafPage, putCachedMushafIndex } from './mushafCache';

export const MUSHAF_TOTAL_PAGES = 548;

export type MushafWord = {
  line: number;
  position: number;
  textIndopak: string;
  textUthmani: string;
  verseKey: string;
  /** 'end' = the small ayah-number marker glyph, rendered as a circular roundel. */
  charType: 'word' | 'end';
  /** Uthmani text with tajweed-rule colors, pre-sanitized at ingest time to
   *  `<span class="tajweed-RULE">…</span>` + plain text only — safe to render
   *  via dangerouslySetInnerHTML as-is. Falls back to plain escaped Uthmani
   *  text when the source verse had no tajweed markup. */
  tajweedHtml: string;
};

export type MushafPage = {
  pageNumber: number;
  juz: number[];
  surahs: number[];
  lines: MushafWord[][];
};

export type MushafIndex = {
  verseToPage: Record<string, number>;
  surahFirstPage: Record<number, number>;
  juzFirstPage: Record<number, number>;
  totalPages: number;
};

function pageUrl(pageNumber: number): string {
  return `/data/mushaf-indopak16/page-${String(pageNumber).padStart(3, '0')}.json`;
}

/** Fetch a single mushaf page's JSON, checking the offline IndexedDB cache first. */
export async function fetchMushafPage(pageNumber: number): Promise<MushafPage> {
  const cached = await getCachedMushafPage(pageNumber);
  if (cached) return cached;

  const res = await fetch(pageUrl(pageNumber));
  if (!res.ok) throw new Error(`Failed to load mushaf page ${pageNumber}`);
  const page = (await res.json()) as MushafPage;
  putCachedMushafPage(pageNumber, page); // fire-and-forget, populates offline cache
  return page;
}

/** Fetch the verse/surah/juz → page lookup index, checking the offline cache first. */
export async function fetchMushafIndex(): Promise<MushafIndex> {
  const cached = await getCachedMushafIndex();
  if (cached) return cached;

  const res = await fetch('/data/mushaf-indopak16/index.json');
  if (!res.ok) throw new Error('Failed to load mushaf index');
  const index = (await res.json()) as MushafIndex;
  putCachedMushafIndex(index);
  return index;
}

/** The mushaf page a surah begins on, or 1 if the index hasn't loaded/isn't available yet. */
export function surahStartPage(index: MushafIndex | undefined, surahNumber: number): number {
  return index?.surahFirstPage[surahNumber] ?? 1;
}

/** The mushaf page a juz (para) begins on, or 1 if the index hasn't loaded/isn't available yet. */
export function juzStartPage(index: MushafIndex | undefined, juzNumber: number): number {
  return index?.juzFirstPage[juzNumber] ?? 1;
}

// staleTime: Infinity is correct here (unlike quran.ts's 1-hour staleTime for
// live translation data) — this is immutable static data, once fetched it
// never needs revalidation within a session.

export function useMushafPage(pageNumber: number) {
  return useQuery({
    queryKey: ['mushaf-page', pageNumber],
    queryFn: () => fetchMushafPage(pageNumber),
    staleTime: Infinity,
    enabled: pageNumber >= 1 && pageNumber <= MUSHAF_TOTAL_PAGES,
    // A missing page (offline + not yet cached, or a 404) won't succeed on retry —
    // React Query's default 3-retry backoff would otherwise leave the UI stuck on
    // a loading skeleton for several seconds before showing the offline message.
    retry: false,
  });
}

export function useMushafIndex() {
  return useQuery({
    queryKey: ['mushaf-index'],
    queryFn: fetchMushafIndex,
    staleTime: Infinity,
    retry: false,
  });
}

/** Prefetch neighboring pages so Next/Previous feels instant, mirroring the
 *  audio prefetch pattern already used in QuranPlayer. */
export function usePrefetchMushafNeighbors(pageNumber: number) {
  const queryClient = useQueryClient();
  return () => {
    for (const n of [pageNumber - 1, pageNumber + 1]) {
      if (n < 1 || n > MUSHAF_TOTAL_PAGES) continue;
      queryClient.prefetchQuery({
        queryKey: ['mushaf-page', n],
        queryFn: () => fetchMushafPage(n),
        staleTime: Infinity,
      });
    }
  };
}
