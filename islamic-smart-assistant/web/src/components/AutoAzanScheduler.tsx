'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Volume2, X, Square, Radio, MapPin } from 'lucide-react';
import { DateTime } from 'luxon';
import { fetchTimingsByCity, fetchTimingsByCoords, LocationError, type PrayerTimes } from '@/lib/prayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { defaultParams, normalizeFiqh, methodByCountry } from '@/lib/sect';
import { customAzanUrl, isCustomAzan } from '@/lib/customAzan';
import { builtInAzanPath } from '@/lib/castAudioSources';

/** Prayers that get an Azan (Sunrise is excluded). */
const AZAN_PRAYERS: (keyof PrayerTimes)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const VOICE_NAMES: Record<string, { name: string; subtitle: string; region: string }> = {
  'hafiz-ahmed-raza-qadri':    { name: 'Hafiz Ahmed Raza Qadri', subtitle: 'Naat-style Azan', region: 'Pakistan' },
  'egzon-ibrahimi':            { name: 'Egzon Ibrahimi',          subtitle: 'Balkan melodic Azan', region: 'Kosovo' },
  'abdul-rahman-mossad':       { name: 'Abdul Rahman Mossad',     subtitle: 'Heartfelt recitation', region: 'Egypt' },
  'mevlan-kurtishi':           { name: 'Mevlan Kurtishi',         subtitle: 'Balkan melodic Azan', region: 'Macedonia' },
  'masjid-nabawi-osama-akhdar':{ name: 'Masjid Nabawi — Osama Al-Akhdar', subtitle: 'المسجد النبوي الشريف', region: 'Saudi Arabia' },
  'pakistan':                  { name: 'Pakistan Style',          subtitle: 'Lahore — Classical', region: 'Pakistan' },
  'turkey':                    { name: 'Turkish — Istanbul',      subtitle: 'Hafiz Mustafa Özcan', region: 'Türkiye' },
  'egypt':                     { name: 'Egyptian — Cairo',        subtitle: 'Maqam Style', region: 'Egypt' },
  'madinah-adhan':             { name: 'Azan Madinah',            subtitle: 'أذان مدني', region: 'Saudi Arabia' },
  'islam-sobhi':               { name: 'Islam Sobhi',             subtitle: 'القارئ اسلام صبحي', region: 'Egypt' },
  'makkah-abdallah-ahmad':     { name: 'Makkah — Abdallah Ahmad', subtitle: 'Haramain reciter', region: 'Saudi Arabia' },
  'masjid-al-haram':           { name: 'Masjid Al-Haram',         subtitle: 'The Grand Mosque, Makkah', region: 'Saudi Arabia' },
  'seyyid-taleh-boradigahi':   { name: 'Seyyid Taleh Boradigahi', subtitle: 'Azerbaijani Azan', region: 'Azerbaijan' },
  'beautiful-azan':            { name: 'Beautiful Azan',          subtitle: 'Melodic & Heartfelt', region: '' },
  'makkah':                    { name: 'Makkah — Haramain',       subtitle: 'Sheikh Ali Mulla', region: 'Saudi Arabia' },
  'madinah':                   { name: 'Madinah — Masjid Nabawi', subtitle: 'Sheikh Essam Bukhari', region: 'Saudi Arabia' },
};

function resolveVoiceInfo(id: string): { name: string; subtitle: string; region: string } {
  if (isCustomAzan(id)) return { name: 'Custom Azan', subtitle: 'Your upload', region: '' };
  return VOICE_NAMES[id] ?? {
    name: id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    subtitle: '', region: '',
  };
}

/** Deterministic waveform bar heights for SSR-stable animation (no Math.random). */
function waveHeights(count = 30): number[] {
  return Array.from({ length: count }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.72 + 1.4) * 0.6 + Math.sin(i * 0.29 + 2.1) * 0.4);
    return 0.18 + 0.82 * v;
  });
}
const WAVE = waveHeights();

// A guaranteed-present built-in file used only for the MUTED autoplay-unlock
// plays — a `custom:` voice id isn't a valid path, and content is irrelevant
// when muted, so we always unlock with this.
const UNLOCK_SRC = '/audio/azan/makkah.mp3';

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
    const countryMethod = methodByCountry(loc.country ?? '');
    return {
      method: methodOverride >= 0 ? methodOverride : (countryMethod ?? base.method),
      school: base.school as 0 | 1,
    };
  }, [rawFiqh, methodOverride, loc.country]);

  const byCoords = loc.hasCoords && loc.lat != null && loc.lng != null;

  const [needsGesture, setNeedsGesture] = useState(false);
  const [firing, setFiring] = useState<null | { prayer: string; voiceId: string }>(null);
  // A prayer that tried to fire but was blocked by the browser's autoplay policy.
  const [pendingPrayer, setPendingPrayer] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  /** Key = "YYYY-M-D:Prayer" — never double-play. */
  const firedRef = useRef<Set<string>>(new Set());
  // Object URL for a custom clip currently loaded into the element (revoked when done).
  const customUrlRef = useRef<string | null>(null);
  const revokeCustomUrl = () => {
    if (customUrlRef.current) { URL.revokeObjectURL(customUrlRef.current); customUrlRef.current = null; }
  };

  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const outputIdRef = useRef(outputId);
  outputIdRef.current = outputId;
  // True once the <audio> element has been unlocked by a user gesture this page
  // load — guards the muted-unlock play from running more than once.
  const armedRef = useRef(false);
  // True while an Azan is actually playing, so a stray gesture doesn't re-arm
  // (which would reload the element's src) mid-playback.
  const firingRef = useRef(false);

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

    // Resolve the audio source. Built-in voices map to a bundled file; a custom
    // voice loads its trimmed clip from IndexedDB as an object URL (falling back
    // to a built-in if the clip is missing, e.g. cleared site data).
    revokeCustomUrl();
    const v = voiceRef.current;
    const { name: voiceLabel } = resolveVoiceInfo(v);
    // Resolve to the bundled file with its REAL extension (most voices are .m4a,
    // not .mp3) via the shared voice table — guessing `${v}.mp3` 404s for those
    // and the Azan silently fails to play.
    let src: string;
    if (isCustomAzan(v)) {
      const url = await customAzanUrl(v);
      if (url) { customUrlRef.current = url; src = url; }
      else src = UNLOCK_SRC;
    } else {
      src = builtInAzanPath(v) ?? UNLOCK_SRC;
    }
    el.src = src;
    await setAudioOutput(el);
    try {
      await el.play();
      firingRef.current = true;
      setFiring({ prayer, voiceId: v });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`${prayer} prayer time`, { body: `Playing ${voiceLabel}`, silent: true });
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

  // Unlock the <audio> element for autoplay using the current user gesture.
  // Idempotent — the muted priming play runs at most once per page load — and
  // safe to call from both the global gesture listener and the Enable button.
  // On success it persists `unlocked` (so the prompt never returns on future
  // loads) and hides any visible prompt.
  const armAudio = useCallback(async (): Promise<boolean> => {
    if (armedRef.current) return true;
    if (firingRef.current) return false; // don't reload src mid-Azan
    const el = audioRef.current;
    if (!el) return false;
    armedRef.current = true;
    el.muted = true;
    el.src = UNLOCK_SRC;
    try { await el.play(); el.pause(); el.currentTime = 0; }
    catch { armedRef.current = false; el.muted = false; return false; }
    el.muted = false;
    setUnlocked(true);
    setNeedsGesture(false);
    return true;
  }, [setUnlocked]);

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
    // Never show this toast when the first-visit onboarding modal already asks about
    // auto-Azan. If onboarding has been completed the user already made their choice.
    try { if (!window.localStorage.getItem('isa:setupDone')) return; } catch {}
    let alreadyUnlocked = unlocked;
    try { alreadyUnlocked = alreadyUnlocked || window.localStorage.getItem('isa:azanUnlocked') === 'true'; } catch {}
    if (alreadyUnlocked) return;
    if (window.sessionStorage.getItem('isa:azanPromptSeen') === '1') return;
    try { window.sessionStorage.setItem('isa:azanPromptSeen', '1'); } catch {}
    setNeedsGesture(true);
  }, [enabled, unlocked]);

  // Browsers won't autoplay audio after a (re)load without a fresh user gesture,
  // even if auto-Azan was unlocked in a previous session. So we silently arm on
  // the FIRST interaction of each page load — any click, tap, or keypress primes
  // the <audio> element for the rest of the session AND persists `unlocked`. We
  // attach this whenever auto-Azan is enabled (not only once unlocked), so the
  // very first interaction is enough for the Azan to play on time with no
  // "Enable" click — and it permanently retires the Enable prompt. armAudio is
  // idempotent, so leaving the listeners attached is harmless.
  useEffect(() => {
    if (!enabled) return;
    const arm = () => { void armAudio(); };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    window.addEventListener('touchstart', arm);
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
    };
  }, [enabled, armAudio]);

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
    revokeCustomUrl();
    firingRef.current = false;
    setFiring(null);
  };

  // X just hides the banner — the "seen" flag is already set when it showed, so
  // it won't return this session. Does NOT disable azan, only stops the prompt.
  const dismissPrompt = () => setNeedsGesture(false);

  const unlock = async () => {
    // Prime autoplay (idempotent — the global gesture listener fires on this same
    // click's pointerdown, so armAudio has usually already run; this just no-ops).
    // armAudio persists `unlocked` and hides the prompt, so it never returns.
    await armAudio();

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
      <audio ref={audioRef} onEnded={() => { firingRef.current = false; setFiring(null); revokeCustomUrl(); }} preload="auto" />

      <AnimatePresence>
        {/* ── Enable auto-Azan prompt ── */}
        {needsGesture && enabled && !firing && (
          <motion.div
            key="azan-unlock"
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed top-20 right-4 lg:top-4 z-[200] w-72 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(16,185,129,0.18)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,185,129,0.1)',
            }}
          >
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <BellRing size={17} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-emerald-950">Enable auto-Azan</p>
                <p className="text-xs text-emerald-900/55 mt-0.5 leading-relaxed">
                  {pendingPrayer
                    ? `${pendingPrayer} prayer time just arrived — tap to play the Azan now.`
                    : 'Tap once so the browser allows the Azan to autoplay at prayer time.'}
                </p>
                <button onClick={unlock}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 transition">
                  <BellRing size={12} /> Enable
                </button>
              </div>
              <button onClick={dismissPrompt}
                className="p-1 rounded-full hover:bg-emerald-50 text-emerald-900/40 hover:text-emerald-700 transition shrink-0">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Azan playing popup ── */}
        {firing && (() => {
          const info = resolveVoiceInfo(firing.voiceId);
          return (
            <motion.div
              key="azan-firing"
              initial={{ opacity: 0, x: 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="fixed top-20 right-4 lg:top-4 z-[200] w-80 rounded-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(6,20,13,0.97) 0%, rgba(4,12,8,0.98) 100%)',
                border: '1px solid rgba(233,207,122,0.22)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(233,207,122,0.10), 0 0 50px rgba(52,211,153,0.10)',
              }}
            >
              {/* top gold accent bar */}
              <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-gold-400 to-emerald-600" />

              <div className="p-4 pb-5">
                {/* header row */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/25 flex items-center justify-center"
                    >
                      <Radio size={13} className="text-emerald-400" />
                    </motion.div>
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Azan Playing</span>
                  </div>
                  <button onClick={stop}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/[0.12] text-white/40 hover:text-white/80 transition"
                    title="Stop & dismiss">
                    <X size={14} />
                  </button>
                </div>

                {/* prayer badge */}
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: 'rgba(233,207,122,0.12)', border: '1px solid rgba(233,207,122,0.22)', color: '#E9CF7A' }}>
                    🕌 {firing.prayer} Prayer
                  </span>
                </div>

                {/* voice info */}
                <p className="text-white font-bold text-base leading-snug">{info.name}</p>
                <div className="flex items-center gap-2 mt-0.5 mb-4">
                  <p className="text-emerald-100/55 text-xs">{info.subtitle}</p>
                  {info.region && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-white/20 shrink-0" />
                      <span className="flex items-center gap-1 text-[10px] text-white/35">
                        <MapPin size={9} /> {info.region}
                      </span>
                    </>
                  )}
                </div>

                {/* animated waveform */}
                <div className="flex items-center gap-[2.5px] h-10 mb-4 px-1">
                  {WAVE.map((h, i) => (
                    <motion.span
                      key={i}
                      className="rounded-full bg-emerald-400"
                      style={{ width: 2.5, height: `${Math.round(h * 100)}%` }}
                      animate={{ scaleY: [1, 0.28 + h * 0.55, 1] }}
                      transition={{
                        duration: 0.65 + (i % 5) * 0.13,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: (i % 7) * 0.055,
                      }}
                    />
                  ))}
                </div>

                {/* stop button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={stop}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.22)',
                    color: 'rgba(252,165,165,0.9)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.22)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.22)';
                  }}
                >
                  <Square size={13} fill="currentColor" /> Stop Azan
                </motion.button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
