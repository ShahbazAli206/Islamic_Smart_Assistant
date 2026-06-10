// Free forward/reverse geocoding via OpenStreetMap Nominatim (no API key).
// Used for the "jump to a city" search box and map-click reverse lookup.
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

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}` +
    `&zoom=12&accept-language=en`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NoorIslamicApp/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) return 'Selected location';
  const data = await res.json();
  const addr = data.address ?? {};
  const parts = [
    addr.suburb || addr.neighbourhood || addr.quarter,
    addr.city || addr.town || addr.village || addr.county,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : (data.display_name as string) ?? 'Selected location';
}
