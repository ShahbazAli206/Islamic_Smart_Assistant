'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Pause, Volume2, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { fetchTimingsByCity, fetchTimingsByCoords, LocationError, type PrayerTimes } from '@/lib/prayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { defaultParams, normalizeFiqh } from '@/lib/sect';

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
  const [voice]    = useLocalStorage<string>('isa:azanVoice', 'makkah');
  const [enabled, setEnabled] = useLocalStorage<boolean>('isa:azanAutoplay', true);
  const [outputId] = useLocalStorage<string>('isa:audioOutput', '');
  const [unlocked, setUnlocked] = useLocalStorage<boolean>('isa:azanUnlocked', false);
  // Method/fiqh — must match what the hero uses so we fire on the same times.
  const [rawFiqh]        = useLocalStorage<string>('isa:fiqh', 'hanafi');
  const [methodOverride] = useLocalStorage<number>('isa:method', -1);

  // Same location source as the overview-page hero so query keys are identical
  // and both components share a single React Query cache entry.
  const loc = useStoredLocation();

  const { method, school } = useMemo(() => {
    const fiqh = normalizeFiqh(rawFiqh);
    const base = defaultParams(fiqh);
    return {
      method: methodOverride >= 0 ? methodOverride : base.method,
      school: base.school as 0 | 1,
    };
  }, [rawFiqh, methodOverride]);

  const byCoords = loc.hasCoords && loc.lat != null && loc.lng != null;

  const [needsGesture, setNeedsGesture] = useState(false);
  const [firing, setFiring] = useState<null | { prayer: string; voice: string }>(null);
  // A prayer that tried to fire but was blocked by the browser's autoplay policy.
  const [pendingPrayer, setPendingPrayer] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  /** Key = "YYYY-M-D:Prayer" — never double-play. */
  const firedRef = useRef<Set<string>>(new Set());

  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const outputIdRef = useRef(outputId);
  outputIdRef.current = outputId;

  // Query key matches PrayerCountdownHero exactly so both share the same cache.
  const { data } = useQuery({
    queryKey: byCoords
      ? ['timings', 'coords', loc.lat, loc.lng, method, school]
      : ['timings', 'city', loc.city, loc.country],
    queryFn: () =>
      byCoords && loc.lat != null && loc.lng != null
        ? fetchTimingsByCoords(loc.lat, loc.lng, { method, school })
        : fetchTimingsByCity(loc.city, loc.country),
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof LocationError) return false;
      return failureCount < 2;
    },
  });

  // Route audio to the selected output device, falling back to default speakers
  // if the device is unavailable (e.g. Bluetooth disconnected).
  const setAudioOutput = useCallback(async (el: HTMLAudioElement) => {
    if (!outputIdRef.current || !('setSinkId' in el)) return;
    try {
      await Promise.race([
        (el as any).setSinkId(outputIdRef.current),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ]);
    } catch {
      // Device unavailable — reset to default (laptop speakers).
      try { await (el as any).setSinkId(''); } catch {}
    }
  }, []);

  const fire = useCallback(async (prayer: string) => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = false;
    el.src = `/audio/azan/${voiceRef.current}.mp3`;
    await setAudioOutput(el);
    try {
      await el.play();
      setFiring({ prayer, voice: voiceRef.current });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`${prayer} prayer time`, { body: `Playing ${voiceRef.current} Azan`, silent: true });
        }
      }
    } catch {
      // Blocked because no user gesture has happened yet on THIS page load.
      // Keep the saved "enabled" state intact — just show a one-tap prompt for
      // this single prayer; the global re-arm listener below unlocks the rest.
      setPendingPrayer(prayer);
      setNeedsGesture(true);
    }
  }, [setAudioOutput]);

  // Show the Enable banner only ONCE per browser-tab session — the first time
  // the user lands while auto-Azan is enabled but not yet unlocked. We flag it
  // as "seen" the instant it shows (not only on dismiss), so reloads and in-app
  // navigation never re-show it. sessionStorage (not localStorage) is the right
  // fit: it survives reloads but clears when the tab closes, so a genuinely new
  // visit gets one fresh chance to enable.
  //
  // We read both flags straight from storage rather than trusting `unlocked`,
  // because useLocalStorage returns its default (false) on the very first render
  // and only reads localStorage one tick later — without this, an already-unlocked
  // user would see a one-frame flash of the banner on every reload.
  useEffect(() => {
    if (!enabled) { setNeedsGesture(false); return; }
    if (typeof window === 'undefined') return;
    let alreadyUnlocked = unlocked;
    try { alreadyUnlocked = alreadyUnlocked || window.localStorage.getItem('isa:azanUnlocked') === 'true'; } catch {}
    if (alreadyUnlocked) return;
    if (window.sessionStorage.getItem('isa:azanPromptSeen') === '1') return;
    try { window.sessionStorage.setItem('isa:azanPromptSeen', '1'); } catch {}
    setNeedsGesture(true);
  }, [enabled, unlocked]);

  // Once auto-Azan has ever been enabled, browsers still won't autoplay audio
  // after a reload without a fresh user gesture. So we silently RE-ARM on the
  // first interaction of each page load — any click, tap, or keypress unlocks
  // the <audio> element for the rest of the session. The user is bound to touch
  // the page before the next prayer, so the Azan plays on time with no extra
  // "Enable" click. (If a prayer somehow arrives before ANY interaction, the
  // one-tap fallback prompt in fire()'s catch still covers that rare case.)
  useEffect(() => {
    if (!enabled || !unlocked) return;
    let done = false;
    const arm = async () => {
      if (done) return;
      done = true;
      cleanup();
      const el = audioRef.current;
      if (!el) return;
      el.muted = true;
      el.src = `/audio/azan/${voiceRef.current}.mp3`;
      try { await el.play(); el.pause(); el.currentTime = 0; } catch {}
      el.muted = false;
    };
    const cleanup = () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    window.addEventListener('touchstart', arm);
    return cleanup;
  }, [enabled, unlocked]);

  // ── Core: poll every second, fire when a prayer time arrives ──
  useEffect(() => {
    if (!enabled || !data) return;

    const { timings, timezone } = data;

    // Resolve prayer time HH:MM to an absolute UTC millisecond timestamp.
    // MUST use the location's timezone (from AlAdhan meta), not the user's local
    // clock — otherwise Isha 22:45 in China fires at 22:45 Pakistan time, 3h late.
    const prayerMs = (h: number, m: number, refNow: Date): number => {
      if (timezone) {
        const loc = DateTime.fromJSDate(refNow).setZone(timezone);
        return loc.startOf('day').set({ hour: h, minute: m, second: 0, millisecond: 0 }).toMillis();
      }
      const pt = new Date(refNow);
      pt.setHours(h, m, 0, 0);
      return pt.getTime();
    };

    // dateKey uses the location's calendar date, not the user's local date, so
    // we never double-fire when the user and the prayer location are in different days.
    const locationDateKey = (refNow: Date): string => {
      if (timezone) {
        const loc = DateTime.fromJSDate(refNow).setZone(timezone);
        return `${loc.year}-${loc.month}-${loc.day}`;
      }
      return `${refNow.getFullYear()}-${refNow.getMonth()}-${refNow.getDate()}`;
    };

    // Mark already-passed prayers as fired so we only trigger future ones.
    // Use 60 s threshold so a tab-sleep that delayed the interval still catches up.
    const now = new Date();
    const initKey = locationDateKey(now);
    for (const name of AZAN_PRAYERS) {
      const parts = timings[name]?.split(':');
      if (!parts || parts.length < 2) continue;
      const [h, m] = parts.map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      if (now.getTime() - prayerMs(h, m, now) > 60_000) {
        firedRef.current.add(`${initKey}:${name}`);
      }
    }

    const tick = () => {
      const now = new Date();
      const dateKey = locationDateKey(now);

      for (const name of AZAN_PRAYERS) {
        const key = `${dateKey}:${name}`;
        if (firedRef.current.has(key)) continue;

        const parts = timings[name]?.split(':');
        if (!parts || parts.length < 2) continue;
        const [h, m] = parts.map(Number);
        if (isNaN(h) || isNaN(m)) continue;

        const diff = now.getTime() - prayerMs(h, m, now);
        // 60 s window survives browser tab throttling; still only fires once per prayer.
        if (diff >= 0 && diff < 60_000) {
          firedRef.current.add(key);
          fire(name);
          break;
        }
      }
    };

    tick(); // check immediately (page might open right at prayer time)
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [enabled, data, fire]);

  const stop = () => {
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setFiring(null);
  };

  // X just hides the banner — the "seen" flag is already set when it showed, so
  // it won't return this session. Does NOT disable azan, only stops the prompt.
  const dismissPrompt = () => setNeedsGesture(false);

  const unlock = async () => {
    const el = audioRef.current;
    if (!el) return;
    // A muted play registers a user gesture with the browser, unlocking future autoplay.
    el.muted = true;
    el.src = `/audio/azan/${voice}.mp3`;
    try {
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
    } catch {}

    setUnlocked(true);
    setNeedsGesture(false);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // If a prayer was blocked while waiting for gesture, play it now.
    if (pendingPrayer) {
      const p = pendingPrayer;
      setPendingPrayer(null);
      await fire(p);
    }
  };

  return (
    <>
      <audio ref={audioRef} onEnded={() => setFiring(null)} preload="auto" />

      <AnimatePresence>
        {needsGesture && enabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 lg:top-4 z-50 max-w-sm card card-pad shadow-glow-emerald flex items-start gap-3"
          >
            <BellRing className="text-emerald-700 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Enable auto-Azan</p>
              <p className="text-xs text-ink/60 mt-0.5">
                {pendingPrayer
                  ? `${pendingPrayer} prayer time just arrived — click to play the Azan now.`
                  : 'Click once so the browser allows the Azan to autoplay at prayer time.'}
              </p>
              <button onClick={unlock} className="btn-primary text-sm py-2 px-4 mt-3">Enable</button>
            </div>
            {/* X dismisses the banner only — does NOT disable azan */}
            <button onClick={dismissPrompt} className="p-1 hover:bg-emerald-50 rounded"><X size={16} /></button>
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
