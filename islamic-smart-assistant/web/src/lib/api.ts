import axios from 'axios';

// API origin comes from NEXT_PUBLIC_API_URL (baked in at build time, exposed to
// the browser). Falls back to the local backend dev server when unset.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

// Shared axios instance for the whole app. withCredentials sends the auth
// cookie on cross-origin requests (refresh-token flow lives in an httpOnly cookie).
export const api = axios.create({ baseURL: BASE, withCredentials: true });

// Attach the bearer token to every request. Runs only in the browser — on the
// server there's no localStorage and no per-user token to read.
api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

/** The authenticated user's profile, as returned by GET /users/me. */
export interface MeProfile {
  id: string;
  email: string;
  name: string;
  language: string;                                                       // preference code: 'en', 'ur', … (drives default translation)
  sect: 'sunni' | 'shia' | null;                                          // null until the user picks one during onboarding
  fiqh_method: 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari' | null; // school of jurisprudence — determines Asr calc + prayer params
  is_admin: boolean;                                                      // gates access to the /admin endpoints below
  avatar_url: string | null;
  // Last known location used for prayer-time calculation; null until set.
  // detected_via records how it was obtained (gps / ip / manual).
  location: {
    lat: number; lng: number; timezone: string;
    city?: string | null; country?: string | null; detected_via?: string | null;
  } | null;
}

export type UpdateMe = Partial<Pick<MeProfile, 'name' | 'language' | 'sect' | 'fiqh_method'>>;

export interface SetLocation {
  lat: number; lng: number; timezone: string;
  city?: string; country?: string; detected_via?: 'gps' | 'ip' | 'manual';
}

/** Endpoints scoped to the current authenticated user (no admin rights needed). */
export const Me = {
  profile: (): Promise<MeProfile> => api.get('/users/me').then((r) => r.data),     // fetch own profile
  update: (dto: UpdateMe): Promise<MeProfile> => api.patch('/users/me', dto).then((r) => r.data), // patch editable fields, returns the updated profile
  setLocation: (loc: SetLocation) => api.post('/users/me/location', loc).then((r) => r.data),      // store location for prayer-time calc
};

export const Admin = {
  users: () => api.get('/admin/users').then((r) => r.data),
  user: (id: string) => api.get(`/admin/users/${id}`).then((r) => r.data),
  devicesOnline: () => api.get('/admin/devices/online').then((r) => r.data),
  analytics: () => api.get('/admin/analytics/summary').then((r) => r.data),
  uploadAzanPack: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/admin/azan-packs', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};
