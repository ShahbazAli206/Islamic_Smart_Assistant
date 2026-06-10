'use client';

import { useLocalStorage } from './useLocalStorage';
import { resolveCoordsState } from './location';

/**
 * The user's location as persisted by the onboarding wizard / profile page.
 * `isa:lat` + `isa:lng` are the exact GPS fix (preferred — gives precise,
 * timezone-aware times); `isa:city` + `isa:country` are the reverse-geocoded
 * labels and also the fallback when no GPS fix is available.
 */
export type StoredLocation = {
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  /** Calculation method id (AlAdhan), set from the user's sect. */
  method?: number;
  /** True when usable coordinates are stored AND they belong to the current city. */
  hasCoords: boolean;
  /** True when coordinates are stored but they're stale (don't match the current city). */
  coordsAreStale: boolean;
  /** "City, Country" — used as the hero label in coordinate mode. */
  label: string;
};

export function useStoredLocation(): StoredLocation {
  const [lat] = useLocalStorage<number | null>('isa:lat', null);
  const [lng] = useLocalStorage<number | null>('isa:lng', null);
  const [city] = useLocalStorage<string>('isa:city', 'Karachi');
  const [country] = useLocalStorage<string>('isa:country', 'Pakistan');
  const [method] = useLocalStorage<number>('isa:method', -1);
  const [coordsFor] = useLocalStorage<string>('isa:coordsFor', '');

  // Only trust stored coordinates when they belong to the *current* place:
  // either tagged for this city/country, or raw GPS ('gps'). This ignores stale
  // coords (e.g. an old GPS fix left behind after the city was changed) so the
  // chosen city wins and is re-geocoded.
  const { hasCoords, coordsAreStale } = resolveCoordsState(lat, lng, city, country, coordsFor);
  const label = [city, country].filter(Boolean).join(', ');

  return {
    // Null out coordinates when they don't belong to the current city so EVERY
    // consumer (including heroes that pass lat/lng straight through) falls back
    // to city mode instead of using a stale GPS point.
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    city,
    country,
    // isa:method is stored as -1 ("auto") by the prayer-times page; only pass a
    // real method id through, otherwise let the hero use its own default.
    method: typeof method === 'number' && method >= 0 ? method : undefined,
    hasCoords,
    coordsAreStale,
    label,
  };
}
