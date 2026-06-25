// Storage for user-uploaded ("custom") Azan clips.
//
// The audio Blob is too large for localStorage, so it lives in IndexedDB keyed
// by the clip id; only the lightweight metadata (id/name/duration) is kept in
// localStorage (see isa:customAzans, read via useLocalStorage on the Azan page).
//
// A custom voice id is prefixed with `custom:` so playback code can tell it apart
// from the built-in voice ids ('makkah', 'madinah', …) that map to bundled files.

export const CUSTOM_AZAN_PREFIX = 'custom:';
export const isCustomAzan = (id: string) => id.startsWith(CUSTOM_AZAN_PREFIX);

export type AudioType = 'azan' | 'durood' | 'dua';

/** Lightweight metadata persisted in localStorage; the audio Blob lives in IndexedDB. */
export type CustomAzan = {
  id: string;        // `custom:<uuid>`
  name: string;
  createdAt: number;
  durationSec: number;
  audioType?: AudioType;
  /** Carried over from the original built-in voice when created by trimming. */
  badge?: 'popular' | 'new';
  tags?: string[];
};

const DB_NAME = 'isa-azan';
const STORE = 'clips';

/** Open (and on first use create) the IndexedDB database. SSR-safe. */
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

/** Run one transaction against the clips store and resolve when it completes. */
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

/** Store (or replace) a clip's audio Blob. */
export function putAzanClip(id: string, blob: Blob): Promise<void> {
  return tx('readwrite', (store) => store.put(blob, id)).then(() => undefined);
}

/** Fetch a clip's audio Blob, or null if it isn't stored. */
export async function getAzanClip(id: string): Promise<Blob | null> {
  try {
    const blob = await tx<Blob | undefined>('readonly', (store) => store.get(id));
    return blob ?? null;
  } catch {
    return null;
  }
}

/** Delete a clip's audio Blob (no-op if absent). */
export function deleteAzanClip(id: string): Promise<void> {
  return tx('readwrite', (store) => store.delete(id)).then(() => undefined).catch(() => undefined);
}

/**
 * Object URL for a custom clip's audio, or null if it's missing. The CALLER is
 * responsible for URL.revokeObjectURL() once playback is done.
 */
export async function customAzanUrl(id: string): Promise<string | null> {
  const blob = await getAzanClip(id);
  return blob ? URL.createObjectURL(blob) : null;
}
