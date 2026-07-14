import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import axios from 'axios';

export interface ResolvedLocation {
  lat: number;
  lng: number;
  timezone: string;
  city?: string;
  country?: string;
  detected_via: 'gps' | 'ip' | 'manual';
}

export async function detectLocation(): Promise<ResolvedLocation> {
  const tz = RNLocalize.getTimeZone();
  try {
    return await gpsLocation(tz);
  } catch {
    return await ipLocation(tz);
  }
}

async function gpsLocation(timezone: string): Promise<ResolvedLocation> {
  const perm = Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  const current = await check(perm);
  const granted = current === RESULTS.GRANTED ? RESULTS.GRANTED : await request(perm);
  if (granted !== RESULTS.GRANTED) throw new Error('location permission denied');

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Reverse-geocode so we can show a city name; failure is non-fatal since
        // the backend computes prayer times from the raw coordinates anyway.
        const place = await reverseGeocode(lat, lng).catch(() => ({}));
        resolve({ lat, lng, timezone, ...place, detected_via: 'gps' });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string }> {
  const r = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: { format: 'json', lat, lon: lng, zoom: 10, 'accept-language': 'en' },
    headers: { 'User-Agent': 'SyediIsmaaApp/1.0 (mobile)' },
    timeout: 8000,
  });
  const a = r.data?.address ?? {};
  return {
    city: a.city || a.town || a.village || a.county || a.state || undefined,
    country: a.country || undefined,
  };
}

async function ipLocation(timezone: string): Promise<ResolvedLocation> {
  // Try three services in order so a single outage doesn't block detection.
  try {
    const r = await axios.get('https://ipapi.co/json/', { timeout: 8000 });
    if (r.data?.latitude && r.data?.city) {
      return {
        lat: r.data.latitude,
        lng: r.data.longitude,
        timezone: r.data.timezone || timezone,
        city: r.data.city,
        country: r.data.country_code,
        detected_via: 'ip',
      };
    }
  } catch { /* fall through */ }

  try {
    const r2 = await axios.get('https://ipinfo.io/json', { timeout: 8000 });
    if (r2.data?.city && r2.data?.country) {
      const [lat, lng] = (r2.data.loc || '0,0').split(',').map(Number);
      return {
        lat, lng,
        timezone: r2.data.timezone || timezone,
        city: r2.data.city,
        country: r2.data.country,
        detected_via: 'ip',
      };
    }
  } catch { /* fall through */ }

  const r3 = await axios.get('https://ip-api.com/json/?fields=status,city,country,countryCode,lat,lon,timezone', { timeout: 8000 });
  if (r3.data?.status === 'success') {
    return {
      lat: r3.data.lat,
      lng: r3.data.lon,
      timezone: r3.data.timezone || timezone,
      city: r3.data.city,
      country: r3.data.countryCode,
      detected_via: 'ip',
    };
  }
  throw new Error('IP location detection failed. Check your internet connection.');
}
