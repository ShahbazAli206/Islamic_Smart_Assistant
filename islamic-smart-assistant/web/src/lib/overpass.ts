// Find mosques anywhere on earth via the OpenStreetMap Overpass API.
// Completely free, no API key. We query for Muslim places of worship.
// Docs: https://wiki.openstreetmap.org/wiki/Overpass_API

export type Mosque = {
  id: string;            // OSM "node/123" | "way/456"
  name: string;
  lat: number;
  lng: number;
  city?: string;
  distanceKm?: number;   // from the search centre, when available
};

// A few public mirrors — we fall back through them if one is busy/blocked.
// Order matters: canonical first, then a confirmed CORS-enabled global mirror.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Per-request cutoff so a slow or blocked mirror can't stall the whole chain —
// without this, a hanging fetch leaves the "Nearby mosques" list spinning forever.
const REQUEST_TIMEOUT_MS = 15_000;

// Mosques are tagged inconsistently in OpenStreetMap, but `religion=muslim` and
// `building=mosque` are both indexed, so querying them is fast and reliable.
//
// We deliberately DON'T add a server-side name regex (e.g. [~"name"~"masjid…"]):
// a case-insensitive key-regex over every place_of_worship in the search radius
// is so expensive it exceeds Overpass's 25 s timeout in dense cities — which
// returns an EMPTY result set, so the list silently showed "No mosques found".
// We instead recover name-tagged mosques client-side from the candidate pool.
const MOSQUE_NAME_RE =
  /masjid|masjed|musjid|musjit|mosque|mosquée|moschee|moskee|mezquita|musalla|jamia|eidgah|imambargah|imambara|مسجد|جامع|مصلى/i;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Search for mosques within `radiusM` metres of a coordinate.
 * Results are sorted nearest-first and capped at `limit`.
 */
export async function searchMosquesNear(
  lat: number,
  lng: number,
  radiusM = 5000,
  limit = 60,
): Promise<Mosque[]> {
  const at = `(around:${radiusM},${lat},${lng})`;
  // Candidate pool: every place of worship + explicit mosque buildings in range.
  // Both filters are indexed, so this returns in ~2 s even in dense cities — and
  // never times out. We classify which of these are mosques client-side below.
  const query = `
    [out:json][timeout:25];
    (
      nwr["amenity"="place_of_worship"]${at};
      nwr["building"="mosque"]${at};
    );
    out center 1500;
  `;

  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json();
      // A server-side timeout still returns HTTP 200 — but with an empty set and
      // a `remark`. Treat that as a failure so we fall through to the next mirror
      // instead of silently rendering "No mosques found".
      if (typeof json.remark === 'string' && /timed out|runtime error/i.test(json.remark)) {
        throw new Error(`Overpass remark: ${json.remark}`);
      }
      const mosques: Mosque[] = (json.elements ?? [])
        .map((el: any) => {
          const pLat = el.lat ?? el.center?.lat;
          const pLng = el.lon ?? el.center?.lon;
          if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;
          const tags = el.tags ?? {};
          // Keep only mosques: an explicit muslim/mosque tag, or a name (in any
          // language) matching a mosque keyword. This recovers name-only mosques
          // that the cheap indexed query alone would miss.
          const isMosque =
            tags.religion === 'muslim' ||
            tags.building === 'mosque' ||
            tags.amenity === 'mosque' ||
            Object.keys(tags).some((k) => /name/i.test(k) && MOSQUE_NAME_RE.test(tags[k]));
          if (!isMosque) return null;
          return {
            id: `${el.type}/${el.id}`,
            name: tags.name || tags['name:en'] || tags['name:ar'] || 'Unnamed mosque',
            lat: pLat,
            lng: pLng,
            city: tags['addr:city'] || tags['addr:suburb'] || undefined,
            distanceKm: haversineKm(lat, lng, pLat, pLng),
          } as Mosque;
        })
        .filter(Boolean) as Mosque[];
      mosques.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      return mosques.slice(0, limit);
    } catch (e) {
      lastErr = e;
      // try the next mirror
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Overpass mirrors failed');
}
