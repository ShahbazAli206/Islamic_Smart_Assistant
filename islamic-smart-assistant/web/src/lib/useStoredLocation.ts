'use client';

import { useLocalStorage } from './useLocalStorage';

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
  /** True when an exact GPS coordinate is stored. */
  hasCoords: boolean;
  /** "City, Country" — used as the hero label in coordinate mode. */
  label: string;
};

export function useStoredLocation(): StoredLocation {
  const [lat] = useLocalStorage<number | null>('isa:lat', null);
  const [lng] = useLocalStorage<number | null>('isa:lng', null);
  const [city] = useLocalStorage<string>('isa:city', 'Karachi');
  const [country] = useLocalStorage<string>('isa:country', 'Pakistan');
  const [method] = useLocalStorage<number>('isa:method', -1);

  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const label = [city, country].filter(Boolean).join(', ');

  return {
    lat,
    lng,
    city,
    country,
    // isa:method is stored as -1 ("auto") by the prayer-times page; only pass a
    // real method id through, otherwise let the hero use its own default.
    method: typeof method === 'number' && method >= 0 ? method : undefined,
    hasCoords,
    label,
  };
}
