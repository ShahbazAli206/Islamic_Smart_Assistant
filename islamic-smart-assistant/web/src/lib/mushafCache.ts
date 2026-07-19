// Offline read-through cache for the 16-line Indo-Pak mushaf dataset.
//
// Read Only Mode must keep working once a page has been viewed, even fully
// offline — relying on the browser's HTTP cache alone isn't guaranteed (varies
// by browser/storage pressure). This mirrors the IndexedDB pattern already used
// for custom Azan clips in customAzan.ts: 'isa-azan' / 'clips' there, 'isa-mushaf'
// / 'pages' here. Unlike audio Blobs, these JSON pages are stored directly
// (IndexedDB natively supports structured-cloneable objects — no Blob needed).

import type { MushafPage, MushafIndex } from './mushaf';

const DB_NAME = 'isa-mushaf';
const STORE = 'pages';
const INDEX_KEY = 'index';

// Bump whenever MushafPage/MushafWord's shape changes (e.g. a new field like
// charType or tajweedHtml is added) so previously-cached entries — which won't
// have that field — are treated as misses instead of being served stale and
// silently rendering incomplete/blank content. A version mismatch just means
// one extra network fetch to repopulate the cache with the current shape.
const SCHEMA_VERSION = 3; // v3: dataset re-ingested with cross-page word pollution fixed

type CacheEntry<T> = { v: number; data: T };

function wrap<T>(data: T): CacheEntry<T> {
  return { v: SCHEMA_VERSION, data };
}

function unwrap<T>(entry: CacheEntry<T> | undefined): T | null {
  if (!entry || entry.v !== SCHEMA_VERSION) return null;
  return entry.data;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const request = run(t.objectStore(STORE));
        t.oncomplete = () => { resolve(request.result); db.close(); };
        t.onerror = () => { reject(t.error); db.close(); };
        t.onabort = () => { reject(t.error); db.close(); };
      }),
  );
}

export async function getCachedMushafPage(pageNumber: number): Promise<MushafPage | null> {
  try {
    const entry = await tx<CacheEntry<MushafPage> | undefined>('readonly', (store) => store.get(pageNumber));
    return unwrap(entry);
  } catch {
    return null;
  }
}

export function putCachedMushafPage(pageNumber: number, page: MushafPage): Promise<void> {
  return tx('readwrite', (store) => store.put(wrap(page), pageNumber)).then(() => undefined).catch(() => undefined);
}

export async function getCachedMushafIndex(): Promise<MushafIndex | null> {
  try {
    const entry = await tx<CacheEntry<MushafIndex> | undefined>('readonly', (store) => store.get(INDEX_KEY));
    return unwrap(entry);
  } catch {
    return null;
  }
}

export function putCachedMushafIndex(index: MushafIndex): Promise<void> {
  return tx('readwrite', (store) => store.put(wrap(index), INDEX_KEY)).then(() => undefined).catch(() => undefined);
}
