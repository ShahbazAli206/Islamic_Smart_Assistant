'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Pause, Volume2, X } from 'lucide-react';
import { fetchTimingsByCity, LocationError, type PrayerTimes } from '@/lib/prayer';
import { useLocalStorage } from '@/lib/useLocalStorage';

/** Prayers that get an Azan (Sunrise is excluded). */
const AZAN_PRAYERS: (keyof PrayerTimes)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * Polls every second and plays the user's chosen Azan the moment a prayer
 * time arrives — reliable even across tab-sleeps and query refetches.
 *
 * Limits of running this in a browser:
 *  - The page must be open in a tab. (To survive a closed tab, the backend cron
 *    would push a notification + the device app would play it.)
 *  - Browsers block autoplay until there's been one user gesture on the page.
 *    A first-load "Enable auto-Azan" prompt resolves that.
 */
export function AutoAzanScheduler() {
  const [voice]   = useLocalStorage<string>('isa:azanVoice', 'makkah');
  const [enabled, setEnabled] = useLocalStorage<boolean>('isa:azanAutoplay', true);
  const [city]    = useLocalStorage<string>('isa:city', 'Karachi');
  const [country] = useLocalStorage<string>('isa:country', 'Pakistan');
  const [outputId] = useLocalStorage<string>('isa:audioOutput', '');
  const [needsGesture, setNeedsGesture] = useState(false);
  const [firing, setFiring] = useState<null | { prayer: string; voice: string }>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  /** Track which prayers already fired so we never double-play. Key = "YYYY-M-D:Prayer" */
  const firedRef = useRef<Set<string>>(new Set());

  // Keep mutable refs so the interval callback always reads fresh values.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const outputIdRef = useRef(outputId);
  outputIdRef.current = outputId;

  const { data } = useQuery({
    queryKey: ['timings', city, country],
    queryFn: () => fetchTimingsByCity(city, country),
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof LocationError) return false;
      return failureCount < 2;
    },
  });

  const fire = useCallback(async (prayer: string) => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = false;
    el.src = `/audio/azan/${voiceRef.current}.mp3`;
    // Route to chosen output device if the browser supports it.
    try {
      if (outputIdRef.current && 'setSinkId' in el) await (el as any).setSinkId(outputIdRef.current);
    } catch {}
    try {
      await el.play();
      setFiring({ prayer, voice: voiceRef.current });
      // Browser desktop notification too.
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`${prayer} prayer time`, { body: `Playing ${voiceRef.current} Azan`, silent: true });
        }
      }
    } catch {
      setNeedsGesture(true);
    }
  }, []);

  // ── Core: poll every second, fire when a prayer time arrives ──
  useEffect(() => {
    if (!enabled || !data) return;

    const timings = data.timings;

    // Mark all already-passed prayers as "fired" so we only trigger future ones.
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    for (const name of AZAN_PRAYERS) {
      const parts = timings[name]?.split(':');
      if (!parts || parts.length < 2) continue;
      const [h, m] = parts.map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      const pt = new Date(now);
      pt.setHours(h, m, 0, 0);
      if (now.getTime() - pt.getTime() > 5_000) {
        firedRef.current.add(`${dateKey}:${name}`);
      }
    }

    const tick = () => {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

      for (const name of AZAN_PRAYERS) {
        const key = `${dateKey}:${name}`;
        if (firedRef.current.has(key)) continue;

        const parts = timings[name]?.split(':');
        if (!parts || parts.length < 2) continue;
        const [h, m] = parts.map(Number);
        if (isNaN(h) || isNaN(m)) continue;
        const pt = new Date(now);
        pt.setHours(h, m, 0, 0);

        const diff = now.getTime() - pt.getTime();
        // Fire if we're 0-5 s after the exact prayer time.
        if (diff >= 0 && diff < 5_000) {
          firedRef.current.add(key);
          fire(name);
          break; // one azan at a time
        }
      }
    };

    tick(); // check immediately (page might open right at prayer time)
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [enabled, data, fire]);

  // Browser-permission probe: once user enables, try a 0-volume silent play
  // to confirm autoplay is unlocked. If it throws, surface the gesture prompt.
  useEffect(() => {
    if (!enabled) return;
    const el = audioRef.current;
    if (!el) return;
    el.muted = true;
    el.src = '/audio/azan/makkah.mp3';
    el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = false; setNeedsGesture(false); })
             .catch(() => setNeedsGesture(true));
  }, [enabled]);

  const stop = () => {
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setFiring(null);
  };

  const unlock = async () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = true;
    el.src = `/audio/azan/${voice}.mp3`;
    try {
      await el.play();
      el.pause(); el.currentTime = 0; el.muted = false;
      setNeedsGesture(false);
      // Ask for desktop notification permission while we're here.
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch {}
  };

  return (
    <>
      <audio ref={audioRef} onEnded={() => setFiring(null)} preload="auto" />

      <AnimatePresence>
        {needsGesture && enabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm card card-pad shadow-glow-emerald flex items-start gap-3"
          >
            <BellRing className="text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Enable auto-Azan</p>
              <p className="text-xs text-ink/60 mt-0.5">Click once so the browser allows the Azan to autoplay at prayer time.</p>
              <button onClick={unlock} className="btn-primary text-sm py-2 px-4 mt-3">Enable</button>
            </div>
            <button onClick={() => setEnabled(false)} className="p-1 hover:bg-emerald-50 rounded"><X size={16} /></button>
          </motion.div>
        )}

        {firing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl p-4 bg-mosque-gradient text-parchment shadow-glow-emerald flex items-center gap-3"
          >
            <Volume2 className="text-gold-300 animate-pulse-soft" />
            <div className="flex-1">
              <p className="font-semibold">{firing.prayer} — Azan playing</p>
              <p className="text-xs text-emerald-100/80">{firing.voice} voice</p>
            </div>
            <button onClick={stop} className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-gold-300">
              <Pause size={16}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
