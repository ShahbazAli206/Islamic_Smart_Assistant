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
