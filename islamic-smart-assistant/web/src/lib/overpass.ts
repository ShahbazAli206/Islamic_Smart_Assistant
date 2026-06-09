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

// A few public mirrors — we fall back through them if one is busy (429/5xx).
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

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
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
      relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
    );
    out center ${limit};
  `;

  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json();
      const mosques: Mosque[] = (json.elements ?? [])
        .map((el: any) => {
          const pLat = el.lat ?? el.center?.lat;
          const pLng = el.lon ?? el.center?.lon;
          if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;
          const tags = el.tags ?? {};
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
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Overpass mirrors failed');
}
