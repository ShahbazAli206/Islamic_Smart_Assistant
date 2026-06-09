import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export interface MeProfile {
  id: string;
  email: string;
  name: string;
  language: string;
  sect: 'sunni' | 'shia' | null;
  fiqh_method: 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari' | null;
  is_admin: boolean;
  avatar_url: string | null;
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

export const Me = {
  profile: (): Promise<MeProfile> => api.get('/users/me').then((r) => r.data),
  update: (dto: UpdateMe): Promise<MeProfile> => api.patch('/users/me', dto).then((r) => r.data),
  setLocation: (loc: SetLocation) => api.post('/users/me/location', loc).then((r) => r.data),
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
