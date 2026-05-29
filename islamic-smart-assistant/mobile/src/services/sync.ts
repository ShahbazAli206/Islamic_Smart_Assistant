import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { playAt } from './audio';

let socket: Socket | null = null;

export function initRealtimeSync() {
  if (socket?.connected) return;
  const token = getAccessToken();
  if (!token) return; // user not logged in yet — we'll re-init after login

  const wsBase = (process.env.WS_BASE_URL ?? 'wss://api.islamicassistant.app/v1/sync');
  socket = io(wsBase, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  socket.on('connect', () => console.log('[sync] connected'));
  socket.on('disconnect', (reason) => console.log('[sync] disconnect', reason));

  socket.on('azan.play', (payload: { playAt: number; audioUrl: string; prayer: string; playbackId: string }) => {
    playAt(payload.playAt, payload.audioUrl, { title: `${payload.prayer} Azan` });
    socket?.emit('playback.ack', { playbackId: payload.playbackId, status: 'played' });
  });

  socket.on('quran.play', (payload: { playAt: number; audioUrl: string; surah: number; playbackId: string }) => {
    playAt(payload.playAt, payload.audioUrl, { title: `Quran — Surah ${payload.surah}` });
    socket?.emit('playback.ack', { playbackId: payload.playbackId, status: 'played' });
  });

  socket.on('device.kicked', (p: { reason: string }) => {
    console.warn('[sync] kicked', p.reason);
    socket?.disconnect();
  });
}

export function shutdownSync() {
  socket?.disconnect();
  socket = null;
}
