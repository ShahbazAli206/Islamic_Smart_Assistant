'use client';

import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useStoredLocation } from './useStoredLocation';
import { defaultParams, normalizeFiqh, methodByCountry } from './sect';
import type { Mosque } from './overpass';

/**
 * The single source of truth for "which prayer times to show / fire".
 *
 * The prayer-times page's PrayerCountdownHero derives its method/school from the
 * user's fiqh (+ an optional manual override) and country, and its location from
 * a pinned mosque (`isa:mosque`) when one is selected, otherwise the stored GPS
 * coords / city. The Overview hero and the AutoAzanScheduler MUST resolve the
 * exact same inputs — otherwise they query AlAdhan with a different method and
 * compute times a few minutes apart, so the Overview countdown can hit 00:00 at
 * a moment that isn't the real prayer instant the Azan fires on.
 *
 * Keep this aligned with prayer-times/page.tsx `params` + the hero's lat/lng props.
 */
export type PrayerParams = {
  byCoords: boolean;
  lat: number | null;
  lng: number | null;
  city: string;
  country: string;
  method: number;
  school: 0 | 1;
  label: string;
};

export function usePrayerParams(): PrayerParams {
  const loc = useStoredLocation();
  const [rawFiqh] = useLocalStorage<string>('isa:fiqh', 'hanafi');
  const [methodOverride] = useLocalStorage<number>('isa:method', -1);
  // A pinned mosque (selected on the prayer-times map) wins the location, exactly
  // like the hero's `selected?.lat ?? loc.lat` precedence.
  const [mosque] = useLocalStorage<Mosque | null>('isa:mosque', null);

  const { method, school } = useMemo(() => {
    const base = defaultParams(normalizeFiqh(rawFiqh));
    const countryMethod = methodByCountry(loc.country ?? '');
    return {
      method: methodOverride >= 0 ? methodOverride : (countryMethod ?? base.method),
      school: base.school,
    };
  }, [rawFiqh, methodOverride, loc.country]);

  const lat = mosque?.lat ?? (loc.hasCoords ? loc.lat : null);
  const lng = mosque?.lng ?? (loc.hasCoords ? loc.lng : null);
  const byCoords = typeof lat === 'number' && typeof lng === 'number';
  const label = mosque
    ? `${mosque.name}${mosque.city ? ', ' + mosque.city : ''}`
    : loc.label;

  return { byCoords, lat, lng, city: loc.city, country: loc.country, method, school, label };
}
