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

/** An Azan voice as stored on the backend (built-in or a user's custom upload). */
export interface AzanVoice {
  id: string;
  name: string;
  audio_url: string;
  size_bytes: number;
  duration_ms: number;
  is_default: boolean;
  is_custom: boolean;
  uploaded_by: string | null;
}

/** Azan voices + custom-upload sync, shared across web / desktop / mobile. */
export const Azan = {
  voices: (): Promise<AzanVoice[]> => api.get('/azan/voices').then((r) => r.data),
  // Upload a custom clip (WAV blob). Persisted to the DB and returned with a
  // public audio_url playable on every platform.
  uploadVoice: (file: Blob, meta: { name: string; durationMs: number; audioType?: string }): Promise<AzanVoice> => {
    const fd = new FormData();
    const safe = (meta.name || 'custom-azan').replace(/[^\w.-]+/g, '_').slice(0, 60);
    fd.append('file', file, `${safe}.wav`);
    fd.append('name', meta.name ?? 'Custom Azan');
    fd.append('duration_ms', String(Math.round(meta.durationMs) || 0));
    if (meta.audioType) fd.append('audio_type', meta.audioType);
    return api.post('/azan/voices', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  deleteVoice: (id: string) => api.delete(`/azan/voices/${encodeURIComponent(id)}`).then((r) => r.data),
};

/** A device the user has registered/linked to their account (GET /devices). */
export interface BackendDevice {
  id: string;
  user_id: string;
  device_type: 'mobile' | 'tablet' | 'web' | 'desktop' | 'speaker';
  platform: 'android' | 'ios' | 'web' | 'windows' | 'macos' | 'linux' | 'alexa' | 'google_home';
  name: string | null;
  push_token: string | null;
  sync_group: string;
  last_seen_at: string | null;
  created_at: string;
}

export interface RegisterDevice {
  device_type: BackendDevice['device_type'];
  platform: BackendDevice['platform'];
  name?: string;
  push_token?: string;
}

/** Devices linked to the current account — shared across web / desktop / mobile. */
export const Devices = {
  list: (): Promise<BackendDevice[]> => api.get('/devices').then((r) => r.data),
  register: (dto: RegisterDevice): Promise<BackendDevice> => api.post('/devices', dto).then((r) => r.data),
  rename: (id: string, name: string) => api.patch(`/devices/${id}`, { name }).then((r) => r.data),
  remove: (id: string) => api.delete(`/devices/${id}`).then((r) => r.data),
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
