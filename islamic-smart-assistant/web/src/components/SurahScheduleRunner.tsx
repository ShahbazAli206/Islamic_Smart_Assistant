'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Pause, Volume2, X } from 'lucide-react';
import { useLocalStorage, readLocalStorageJSON } from '@/lib/useLocalStorage';
import { SURAHS } from '@/lib/surahs';
import {
  createRecitationController, type RecitationController,
} from '@/lib/recitationPlayer';
import { surahAudioUrl } from '@/lib/quran';
import {
  isDueOn, parseHM, type RecitationSchedule,
} from '@/lib/recitationSchedule';

/**
 * Background runner for the Surah recitation scheduler. Polls every second and
 * plays the chosen Surah(s) the moment a schedule's time arrives — mirroring
 * AutoAzanScheduler.
 *
 * Same browser limits as auto-Azan: the page must be open in a tab, and browsers
 * block autoplay until one user gesture has happened. We silently "re-arm" the
 * <audio> element on the first interaction of each page load; if a schedule fires
 * before any interaction, a one-tap prompt covers that rare case.
 */

/** Short, friendly label for a list of surah numbers. */
function surahLabel(nums: number[]): string {
  const names = nums.map((n) => SURAHS.find((s) => s.number === n)?.englishName ?? `Surah ${n}`);
  if (names.length <= 2) return names.join(' · ');
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} more`;
}

// A tiny silent WAV used only to register a user gesture so the browser unlocks
// autoplay for the <audio> element — no network, built lazily on the client.
let silentWavCache: string | null = null;
function getSilentWav(): string {
  if (silentWavCache) return silentWavCache;
  const sampleRate = 8000, ms = 40;
  const numSamples = Math.floor((sampleRate * ms) / 1000);
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, dataSize, true);
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  silentWavCache = 'data:audio/wav;base64,' + btoa(binary);
  return silentWavCache;
}

type NowPlaying = { id: string; label: string; surah: number; index: number; total: number };

export function SurahScheduleRunner() {
  const [schedules] = useLocalStorage<RecitationSchedule[]>('isa:recitationSchedules', []);
  const [outputId] = useLocalStorage<string>('isa:audioOutput', '');

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  // A schedule that tried to fire but was blocked by the autoplay policy.
  const [pending, setPending] = useState<RecitationSchedule | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const controllerRef = useRef<RecitationController | null>(null);
  /** Key = "YYYY-M-D:id" — fire each schedule at most once per local day. */
  const firedRef = useRef<Set<string>>(new Set());
  const armedRef = useRef(false);

  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;
  const outputIdRef = useRef(outputId);
  outputIdRef.current = outputId;

  // Create the playback controller once the <audio> element is mounted.
  useEffect(() => {
    if (audioRef.current && !controllerRef.current) {
      controllerRef.current = createRecitationController(audioRef.current);
    }
  }, []);

  // Route audio to the selected output device, falling back to default speakers
  // if it's unavailable (e.g. Bluetooth disconnected). Same as AutoAzanScheduler.
  const setAudioOutput = useCallback(async (el: HTMLAudioElement) => {
    if (!outputIdRef.current || !('setSinkId' in el)) return;
    try {
      await Promise.race([
        (el as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(outputIdRef.current),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ]);
    } catch {
      try { await (el as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(''); } catch {}
    }
  }, []);

  const fire = useCallback(async (s: RecitationSchedule) => {
    const ctrl = controllerRef.current;
    const el = audioRef.current;
    if (!ctrl || !el) return;
    await setAudioOutput(el);
    const label = surahLabel(s.surahs);
    setNowPlaying({ id: s.id, label, surah: s.surahs[0] ?? 0, index: 0, total: s.surahs.length });
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Quran recitation', { body: label, silent: true }); } catch {}
    }
    // LAN devices — fire first surah as a CDN URL on all selected devices simultaneously.
    // Read fresh from localStorage rather than a useLocalStorage snapshot: this
    // component mounts once for the whole session, and the Devices page's own
    // useLocalStorage instance writing the same key won't update our React state
    // in the same tab (see readLocalStorageJSON's doc comment).
    const desktopApi = typeof window !== 'undefined' ? (window as any).desktop?.devices : null;
    const lanDeviceIds = readLocalStorageJSON<string[]>('isa:recitationDeviceIds', []);
    if (desktopApi && lanDeviceIds.length > 0 && s.surahs.length > 0) {
      const url = surahAudioUrl(s.surahs[0], s.reciter);
      lanDeviceIds.forEach((id) => {
        desktopApi.play({ deviceId: id, source: { kind: 'url', url, title: label } }).catch(() => {});
      });
    }

    ctrl.play(
      {
        surahs: s.surahs, reciter: s.reciter,
        withTranslation: s.withTranslation, translation: s.translation, volume: s.volume,
      },
      {
        onProgress: (info) =>
          setNowPlaying((np) => (np && np.id === s.id ? { ...np, surah: info.surah, index: info.index, total: info.total } : np)),
        onDone: () => setNowPlaying((np) => (np?.id === s.id ? null : np)),
        onBlocked: () => {
          setNowPlaying((np) => (np?.id === s.id ? null : np));
          setPending(s);
        },
      },
    );
  }, [setAudioOutput]);

  const fireRef = useRef(fire);
  fireRef.current = fire;

  // Silently unlock the <audio> element with a muted play. Idempotent per load,
  // and a no-op while a recitation is already playing (so it never interrupts).
  const armAudio = useCallback(() => {
    if (armedRef.current) return;
    const el = audioRef.current;
    if (!el || controllerRef.current?.isPlaying()) return;
    armedRef.current = true;
    try {
      el.muted = true;
      el.src = getSilentWav();
      el.play().then(() => {
        // If a real recitation started during this ~40ms silent clip, leave it alone.
        if (controllerRef.current?.isPlaying()) return;
        el.pause(); el.currentTime = 0; el.muted = false;
      }).catch(() => { el.muted = false; });
    } catch { el.muted = false; }
  }, []);

  // Re-arm on the first user gesture of each page load.
  useEffect(() => {
    const handler = () => { armAudio(); cleanup(); };
    const cleanup = () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', handler);
    };
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', handler);
    return cleanup;
  }, [armAudio]);

  // ── Core: poll every second, fire when a schedule's time arrives ──
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

      for (const s of schedulesRef.current) {
        if (!s.enabled || !s.surahs?.length) continue;
        if (!isDueOn(s, now)) continue;

        const key = `${dateKey}:${s.id}`;
        if (firedRef.current.has(key)) continue;

        const { h, m } = parseHM(s.time);
        const target = new Date(now);
        target.setHours(h, m, 0, 0);
        const diff = now.getTime() - target.getTime();

        if (diff >= 60_000) {
          // Already passed (e.g. page opened later, or schedule added after its
          // time today) — mark fired so it neither replays nor fires late.
          firedRef.current.add(key);
        } else if (diff >= 0) {
          // Within the 60 s window — fire once.
          firedRef.current.add(key);
          fireRef.current(s);
          break;
        }
        // diff < 0 → still in the future; leave unmarked so it fires later today.
      }
    };

    tick(); // check immediately (page might open right at a scheduled time)
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const stop = () => {
    controllerRef.current?.stop();
    setNowPlaying(null);
    const api = typeof window !== 'undefined' ? (window as any).desktop?.devices : null;
    if (api) {
      const lanDeviceIds = readLocalStorageJSON<string[]>('isa:recitationDeviceIds', []);
      lanDeviceIds.forEach((id) => { try { api.stop({ deviceId: id }); } catch {} });
    }
  };

  const enablePending = () => {
    armAudio(); // register this click as the unlocking gesture
    const p = pending;
    setPending(null);
    if (p) fireRef.current(p);
  };

  const currentSurahName = nowPlaying
    ? SURAHS.find((s) => s.number === nowPlaying.surah)?.englishName ?? `Surah ${nowPlaying.surah}`
    : '';

  return (
    <>
      <audio ref={audioRef} preload="auto" />

      <AnimatePresence>
        {pending && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 lg:top-4 z-50 max-w-sm card card-pad shadow-glow-emerald flex items-start gap-3"
          >
            <BookOpen className="text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Recitation ready to play</p>
              <p className="text-xs text-ink/60 mt-0.5">
                {surahLabel(pending.surahs)} — click to start playing now.
              </p>
              <button onClick={enablePending} className="btn-primary text-sm py-2 px-4 mt-3">Play now</button>
            </div>
            <button onClick={() => setPending(null)} className="p-1 hover:bg-emerald-50 rounded"><X size={16} /></button>
          </motion.div>
        )}

        {nowPlaying && (
          <motion.div
            key="now"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl p-4 bg-mosque-gradient text-parchment shadow-glow-emerald flex items-center gap-3"
          >
            <Volume2 className="text-gold-300 animate-pulse-soft shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">Now reciting · {currentSurahName}</p>
              <p className="text-xs text-emerald-100/80 truncate">
                {nowPlaying.total > 1 ? `Surah ${nowPlaying.index + 1} of ${nowPlaying.total} · ` : ''}{nowPlaying.label}
              </p>
            </div>
            <button onClick={stop} className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-gold-300 shrink-0">
              <Pause size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
