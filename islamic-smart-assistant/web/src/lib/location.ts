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
  persist('isa:city', city);
  persist('isa:country', country);
  persist('isa:mosque', null);
  try {
    const hits = await geocodePlace(`${city}, ${country}`, 1);
    const hit = hits[0];
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
      persist('isa:lat', hit.lat);
      persist('isa:lng', hit.lng);
      return true;
    }
  } catch {
    /* geocoding failed — stay in city mode (coords already null) */
  }
  return false;
}
