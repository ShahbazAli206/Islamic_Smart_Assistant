// Free forward/reverse geocoding via OpenStreetMap Nominatim (no API key).
// Used for the "jump to a city" search box and map-click reverse lookup.
// Usage policy: light, user-initiated queries only. Docs: https://nominatim.org/

// `name`/`city`/`country` come straight from the matched record so callers can
// label a search result by what the user actually searched for. They must NOT
// re-derive the place by reverse-geocoding the centroid: adjacent municipalities
// share borders, so reversing e.g. Taxila's coords drifts to "Wah Cantonment".
export type GeoHit = { label: string; lat: number; lng: number; name: string; city: string; country: string };

export async function geocodePlace(query: string, limit = 5): Promise<GeoHit[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=${limit}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error('Geocoding failed');
  const arr = await res.json();
  return (arr ?? []).map((r: any) => {
    const addr = r.address ?? {};
    // Prefer the matched object's own name (what the user searched), then fall
    // back through the address hierarchy.
    const city =
      r.name || addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
    return {
      label: r.display_name as string,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      name: (r.name as string) || '',
      city,
      country: addr.country || '',
    };
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const d = await reverseGeocodeDetails(lat, lng);
  return d.label;
}

export type GeoDetail = { label: string; city: string; country: string };

/** Like reverseGeocode but also returns the city and country strings separately. */
export async function reverseGeocodeDetails(lat: number, lng: number): Promise<GeoDetail> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}` +
    `&zoom=12&accept-language=en`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NoorIslamicApp/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) return { label: 'Selected location', city: '', country: '' };
  const data = await res.json();
  const addr = data.address ?? {};
  const city    = addr.city || addr.town || addr.village || addr.county || addr.state || '';
  const country = addr.country || '';
  const parts = [
    addr.suburb || addr.neighbourhood || addr.quarter,
    city,
    country,
  ].filter(Boolean);
  const label = parts.length ? parts.join(', ') : (data.display_name as string) ?? 'Selected location';
  return { label, city, country };
}
