// Free forward-geocoding via OpenStreetMap Nominatim (no API key).
// Used for the "jump to a city" search box on the prayer-times map.
// Usage policy: light, user-initiated queries only. Docs: https://nominatim.org/

export type GeoHit = { label: string; lat: number; lng: number };

export async function geocodePlace(query: string, limit = 5): Promise<GeoHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error('Geocoding failed');
  const arr = await res.json();
  return (arr ?? []).map((r: any) => ({
    label: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
