'use client';

import { geocodePlace } from './geo';

// Centralized writers for the user's location so the stored keys can never
// disagree with each other. The whole app reads location via these keys:
//   isa:lat / isa:lng  — exact coordinates (authoritative; timezone-aware times)
//   isa:city / isa:country — labels (and the fallback when no coords exist)
//   isa:mosque — a pinned mosque on the Prayer Times map
//
// The bug this fixes: setting a new city/country while stale GPS coords remained
// in isa:lat/lng meant every coords-preferring consumer kept showing the old GPS
// location. These helpers keep coords in sync with the chosen place.

/**
 * Normalized "city, country" tag stored in `isa:coordsFor`. It records which
 * place the stored coordinates belong to, so a consumer can tell whether the
 * coords still match the chosen city (and ignore them if they're stale — e.g.
 * old GPS coords left over from before the city was changed).
 */
export function locLabel(city: string, country: string): string {
  return `${(city || '').trim()}, ${(country || '').trim()}`.toLowerCase();
}

export type ResolvedLocation = {
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  method?: number;
  hasCoords: boolean;
  coordsAreStale: boolean;
  label: string;
};

/**
 * Pure coords-vs-city decision shared by the reactive hook and the synchronous
 * reader. Coords are trusted only when tagged for the current city or raw GPS.
 */
export function resolveCoordsState(
  lat: number | null,
  lng: number | null,
  city: string,
  country: string,
  coordsFor: string,
): { hasCoords: boolean; coordsAreStale: boolean } {
  const rawHasCoords = typeof lat === 'number' && typeof lng === 'number';
  const coordsMatchCity = coordsFor === 'gps' || (coordsFor !== '' && coordsFor === locLabel(city, country));
  return { hasCoords: rawHasCoords && coordsMatchCity, coordsAreStale: rawHasCoords && !coordsMatchCity };
}

function readNum(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const v = JSON.parse(raw);
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch { return null; }
}

function readStr(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as string) : fallback;
  } catch { return fallback; }
}

/**
 * Read the user's location straight from localStorage (synchronously). Use this
 * in a one-shot init effect to avoid the hydration race where the reactive
 * useStoredLocation hook still holds its defaults on first render.
 */
export function readStoredLocation(): ResolvedLocation {
  if (typeof window === 'undefined') {
    return { lat: null, lng: null, city: 'Karachi', country: 'Pakistan', hasCoords: false, coordsAreStale: false, label: 'Karachi, Pakistan' };
  }
  const lat = readNum('isa:lat');
  const lng = readNum('isa:lng');
  const city = readStr('isa:city', 'Karachi');
  const country = readStr('isa:country', 'Pakistan');
  const coordsFor = readStr('isa:coordsFor', '');
  const method = readNum('isa:method');
  const { hasCoords, coordsAreStale } = resolveCoordsState(lat, lng, city, country, coordsFor);
  return {
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    city,
    country,
    method: typeof method === 'number' && method >= 0 ? method : undefined,
    hasCoords,
    coordsAreStale,
    label: [city, country].filter(Boolean).join(', '),
  };
}

/** Write a value to localStorage and notify same-tab useLocalStorage listeners. */
function persist(key: string, val: unknown) {
  try {
    const json = JSON.stringify(val);
    localStorage.setItem(key, json);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
  } catch {
    /* SSR / storage unavailable — ignore */
  }
}

/**
 * Clear any pinned mosque from localStorage and notify same-tab listeners.
 * Called when coords are detected as stale so the stale mosque can't keep
 * overriding the hero — the StorageEvent reaches the useLocalStorage listener
 * which overrides the re-hydration re-render that would otherwise restore it.
 */
export function clearPinnedMosque() {
  persist('isa:mosque', null);
}

/**
 * Persist a location chosen as an exact coordinate (GPS / IP / a picked mosque).
 * The coordinates are authoritative; city/country are optional display labels.
 * Pass `clearMosque` when this represents a *new* location (so a previously
 * pinned mosque can't keep overriding it on the Prayer Times page).
 */
export function setLocationByCoords(
  lat: number,
  lng: number,
  city?: string,
  country?: string,
  opts: { clearMosque?: boolean } = {},
) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  persist('isa:lat', lat);
  persist('isa:lng', lng);
  if (city) persist('isa:city', city);
  if (country) persist('isa:country', country);
  // Tag the coords with the place they represent. With both labels we know the
  // exact city; without them these are raw GPS coords that should still be
  // trusted (they get replaced the next time a city is explicitly chosen).
  persist('isa:coordsFor', city && country ? locLabel(city, country) : 'gps');
  if (opts.clearMosque) persist('isa:mosque', null);
}

/**
 * Persist a location chosen as a city + country (typed/selected by the user).
 * Geocodes the place so we keep timezone-aware coordinate mode AND so a
 * previously-stored GPS coordinate can no longer override the explicit choice.
 * Also clears any pinned mosque, which a fresh city choice supersedes.
 *
 * @returns true if it resolved to coordinates, false if only the city was stored.
 */
export async function setLocationByCity(city: string, country: string): Promise<boolean> {
  // Clear stale coords FIRST so that during the async geocode below, consumers
  // immediately fall back to (correct) city mode for the new city rather than
  // briefly showing the old GPS point. We re-populate coords on success.
  persist('isa:lat', null);
  persist('isa:lng', null);
  persist('isa:coordsFor', '');
  persist('isa:city', city);
  persist('isa:country', country);
  persist('isa:mosque', null);
  try {
    const hits = await geocodePlace(`${city}, ${country}`, 1);
    const hit = hits[0];
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
      persist('isa:lat', hit.lat);
      persist('isa:lng', hit.lng);
      persist('isa:coordsFor', locLabel(city, country));
      return true;
    }
  } catch {
    /* geocoding failed — stay in city mode (coords already null) */
  }
  return false;
}
