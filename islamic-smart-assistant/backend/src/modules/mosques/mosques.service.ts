import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface Mosque {
  id: string; // OSM "node/123" | "way/456"
  name: string;
  lat: number;
  lng: number;
  city?: string;
  distanceKm?: number;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

@Injectable()
export class MosquesService {
  private readonly log = new Logger(MosquesService.name);
  // Small in-memory TTL cache keyed by a coarse grid so we don't hammer Overpass.
  private readonly cache = new Map<string, { at: number; data: Mosque[] }>();
  private readonly ttlMs = 10 * 60 * 1000;

  async nearby(lat: number, lng: number, radiusM = 5000, limit = 60): Promise<Mosque[]> {
    const key = `${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusM}`;
    const hit = this.cache.get(key);
    const now = Date.now();
    if (hit && now - hit.at < this.ttlMs) return hit.data.slice(0, limit);

    const query =
      `[out:json][timeout:25];` +
      `(` +
      `node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});` +
      `way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});` +
      `relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});` +
      `);out center ${limit};`;

    let lastErr: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // OSM/Overpass usage policy requires a descriptive User-Agent; Node's
            // fetch sends none by default, which Overpass rejects with HTTP 403.
            'User-Agent': 'IslamicSmartAssistant/0.1 (+https://github.com/islamic-smart-assistant; mosque search)',
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        const json: any = await res.json();
        const mosques = this.parse(json, lat, lng);
        this.cache.set(key, { at: now, data: mosques });
        return mosques.slice(0, limit);
      } catch (e) {
        lastErr = e;
        this.log.warn(`Overpass mirror failed (${endpoint}): ${(e as Error).message}`);
      }
    }
    throw new ServiceUnavailableException(
      `Mosque search is temporarily unavailable: ${(lastErr as Error)?.message ?? 'all mirrors failed'}`,
    );
  }

  private parse(json: any, lat: number, lng: number): Mosque[] {
    const out: Mosque[] = (json.elements ?? [])
      .map((el: any): Mosque | null => {
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
          distanceKm: this.haversineKm(lat, lng, pLat, pLng),
        };
      })
      .filter((m: Mosque | null): m is Mosque => m !== null);
    out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return out;
  }

  private haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
}
