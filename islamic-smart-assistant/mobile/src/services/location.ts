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
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, timezone, detected_via: 'gps' }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

async function ipLocation(timezone: string): Promise<ResolvedLocation> {
  // Free tier: ipapi.co, ipinfo.io, ip-api.com (no key for low volume). Pick one.
  const r = await axios.get('https://ipapi.co/json/', { timeout: 8000 });
  return {
    lat: r.data.latitude,
    lng: r.data.longitude,
    timezone: r.data.timezone || timezone,
    city: r.data.city,
    country: r.data.country_code,
    detected_via: 'ip',
  };
}
