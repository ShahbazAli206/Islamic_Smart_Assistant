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

export const BUILTIN_PREFIX = 'builtin:';
export const isBuiltinClip = (id: string) => id.startsWith(BUILTIN_PREFIX);

// Built-in durood recordings hosted on Supabase storage (public bucket) so they
// don't bloat the app bundle and are shared by web + desktop alike.
const SUPABASE_AUDIO =
  'https://jqrflmqacliezkwmxqiv.supabase.co/storage/v1/object/public/azan-audio';

const BUILTIN_PATHS: Record<string, string> = {
  // The original local file was removed from public/audio during the asset
  // reshuffle; it is byte-identical to the classic Salat-o-Salam recording,
  // so it reuses that same Supabase file rather than a separate upload.
  'builtin:asalatu-wasalamu': `${SUPABASE_AUDIO}/durood/salat-o-salam-classic.mp3`,
  'builtin:darood-ibrahimi': '/audio/Darood_e_Ibrahimi%20Drood.mp3',
  'builtin:dua-after-azan': '/audio/Dua_After_Azan.mp3',
  'builtin:asalatu-saleh-ali': `${SUPABASE_AUDIO}/durood/asalatu-wasalamu-saleh-ali.mp3`,
  'builtin:asalatu-abdul-basit': `${SUPABASE_AUDIO}/durood/asalatu-wasalamu-abdul-basit.mp3`,
  'builtin:ya-damin': `${SUPABASE_AUDIO}/durood/ya-damin-ya-qurrat-al-ain.mp3`,
};

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
  /** Backend audio_url — stored so the scheduler can play this clip even when the
   *  local IndexedDB blob is absent (e.g. on a different browser/device). */
  remoteUrl?: string;
};

// Array order = display order in the Durood panel.
export const BUILT_IN_DUROODS: CustomAzan[] = [
  { id: 'builtin:ya-damin',              name: 'Ya Damin Ya Qurrata Al-Ain',             createdAt: 0, durationSec: 58, audioType: 'durood', badge: 'popular', tags: ['Most Listened'] },
  { id: 'builtin:asalatu-abdul-basit',   name: 'Asalatu Wasalamu — Sheikh Abdul Basit',  createdAt: 0, durationSec: 55, audioType: 'durood', badge: 'popular', tags: ['Most Listened'] },
  { id: 'builtin:asalatu-wasalamu',      name: 'Asalatu Wasalamu Alaika Ya Rasool Allah', createdAt: 0, durationSec: 20, audioType: 'durood' },
  { id: 'builtin:darood-ibrahimi',       name: 'Darood-e-Ibrahimi',                       createdAt: 0, durationSec: 65, audioType: 'durood' },
  { id: 'builtin:asalatu-saleh-ali',     name: 'Asalatu Wasalamu — Saleh Ali',            createdAt: 0, durationSec: 15, audioType: 'durood' },
];

export const BUILT_IN_DUAS: CustomAzan[] = [
  { id: 'builtin:dua-after-azan', name: 'Dua After Azan', createdAt: 0, durationSec: 0, audioType: 'dua', badge: 'popular' },
];

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

// ── Remote URL cache ─────────────────────────────────────────────────────────
// When a clip is uploaded to the backend (or fetched from it), we cache the
// audio_url in localStorage so the scheduler and any other consumer can play it
// without the local IndexedDB blob — enabling cross-browser / cross-device use.

const REMOTE_CACHE_KEY = 'isa:customRemoteUrls';

export function saveRemoteUrl(id: string, url: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY) ?? '{}');
    map[id] = url;
    localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(map));
  } catch {}
}

function getStoredRemoteUrl(id: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY) ?? '{}');
    return map[id] ?? null;
  } catch { return null; }
}

/**
 * Returns a playable URL for any clip:
 *  - Built-in: static public path
 *  - Custom (local): IndexedDB object URL (caller must call URL.revokeObjectURL)
 *  - Custom (synced): backend audio_url from the remote-URL cache
 *
 * Falls back to the cached remote URL when the local IndexedDB blob is absent,
 * which makes synced uploads from other browsers/devices play correctly without
 * needing to re-download the blob locally.
 */
export async function customAzanUrl(id: string): Promise<string | null> {
  if (isBuiltinClip(id)) return BUILTIN_PATHS[id] ?? null;
  const blob = await getAzanClip(id);
  if (blob) return URL.createObjectURL(blob);
  return getStoredRemoteUrl(id);
}
