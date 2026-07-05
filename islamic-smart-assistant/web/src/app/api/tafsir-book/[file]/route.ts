import { NextRequest, NextResponse } from 'next/server';
import { TAFSIR_BOOKS, booksBase } from '@/lib/tafsirBooks';

// Same-origin streaming proxy for the tafsir book PDFs.
//
// GitHub release assets (release-assets.githubusercontent.com) send NO CORS
// headers, so pdf.js in the browser cannot fetch them cross-origin. This route
// forwards the request — including Range headers, which pdf.js uses to stream
// single pages out of 100+ MB scans — and pipes the response back same-origin.
// Only filenames in the book catalogue are allowed (no open proxy).

export const dynamic = 'force-dynamic';

const KNOWN_FILES = new Set(
  TAFSIR_BOOKS.flatMap((b) => b.volumes.map((v) => v.file)),
);

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } },
) {
  const file = params.file;
  if (!KNOWN_FILES.has(file)) {
    return NextResponse.json({ error: 'unknown book file' }, { status: 404 });
  }

  const upstreamHeaders: Record<string, string> = {};
  const range = req.headers.get('range');
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(`${booksBase()}/${file}`, {
    headers: upstreamHeaders,
    redirect: 'follow',
    // Release assets are immutable; let the platform cache slices it has seen.
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/pdf');
  headers.set('Accept-Ranges', 'bytes');
  for (const h of ['content-length', 'content-range', 'etag', 'last-modified'] as const) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // Slices of an immutable release asset — cache aggressively client-side.
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
