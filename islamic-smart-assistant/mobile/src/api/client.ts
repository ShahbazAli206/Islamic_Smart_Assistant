import axios, { AxiosInstance } from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const API_BASE = process.env.API_BASE_URL ?? 'https://api.islamicassistant.app/v1';

export const api: AxiosInstance = axios.create({ baseURL: API_BASE, timeout: 15_000 });

api.interceptors.request.use((cfg) => {
  const token = storage.getString('accessToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<string> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config?.__retry) {
      err.config.__retry = true;
      if (!refreshing) {
        const refreshToken = storage.getString('refreshToken');
        refreshing = axios
          .post(`${API_BASE}/auth/refresh`, { refreshToken })
          .then((r) => {
            storage.set('accessToken', r.data.accessToken);
            storage.set('refreshToken', r.data.refreshToken);
            return r.data.accessToken as string;
          })
          .finally(() => { refreshing = null; });
      }
      const newToken = await refreshing;
      err.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(err.config);
    }
    return Promise.reject(err);
  },
);

export const setAuth = (accessToken: string, refreshToken: string) => {
  storage.set('accessToken', accessToken);
  storage.set('refreshToken', refreshToken);
};

export const clearAuth = () => {
  storage.delete('accessToken');
  storage.delete('refreshToken');
};

export const getAccessToken = () => storage.getString('accessToken');
