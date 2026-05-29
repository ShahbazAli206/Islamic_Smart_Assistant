import { api } from './client';

export const Auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (data: { email: string; password: string; name: string; language?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
};

export const Users = {
  me: () => api.get('/users/me').then((r) => r.data),
  update: (data: any) => api.patch('/users/me', data).then((r) => r.data),
  setLocation: (loc: { lat: number; lng: number; timezone: string; city?: string; country?: string; detected_via?: string }) =>
    api.post('/users/me/location', loc).then((r) => r.data),
};

export const Prayer = {
  today: (date?: string) => api.get('/prayer-times', { params: { date } }).then((r) => r.data),
  range: (from: string, days: number) => api.get('/prayer-times/range', { params: { from, days } }).then((r) => r.data),
  qibla: () => api.get('/prayer-times/qibla').then((r) => r.data),
};

export const Azan = {
  voices: () => api.get('/azan/voices').then((r) => r.data),
  settings: () => api.get('/azan/settings').then((r) => r.data),
  update: (data: any) => api.put('/azan/settings', data).then((r) => r.data),
};

export const Quran = {
  surahs: () => api.get('/quran/surahs').then((r) => r.data),
  surah: (id: number, translation?: string) => api.get(`/quran/surah/${id}`, { params: { translation } }).then((r) => r.data),
  schedules: () => api.get('/quran/schedules').then((r) => r.data),
  createSchedule: (data: any) => api.post('/quran/schedules', data).then((r) => r.data),
  deleteSchedule: (id: string) => api.delete(`/quran/schedules/${id}`).then((r) => r.data),
};

export const Devices = {
  list: () => api.get('/devices').then((r) => r.data),
  register: (data: { device_type: string; platform: string; push_token?: string; name?: string }) =>
    api.post('/devices', data).then((r) => r.data),
  update: (id: string, data: { name?: string; sync_group?: string }) => api.patch(`/devices/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/devices/${id}`).then((r) => r.data),
};
