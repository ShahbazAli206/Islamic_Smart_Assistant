'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X, Square, Radio, MapPin } from 'lucide-react';
import { DateTime } from 'luxon';
import { fetchTimingsByCity, fetchTimingsByCoords, LocationError, type PrayerTimes } from '@/lib/prayer';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { usePrayerParams } from '@/lib/usePrayerParams';
import { customAzanUrl, isCustomAzan, type CustomAzan } from '@/lib/customAzan';
import { azanLocalPath, resolveAzanCastUrl } from '@/lib/castAudioSources';

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

const UNLOCK_SRC = '/audio/azan/makkah.mp3';

// ── Prayer announcement (TTS) helpers ────────────────────────────────────────

const LANG_CODES: Record<string, string> = {
  en: 'en-US', ar: 'ar-SA', ur: 'ur-PK', fr: 'fr-FR',
  tr: 'tr-TR', id: 'id-ID', ms: 'ms-MY', bn: 'bn-BD',
  de: 'de-DE', es: 'es-ES', hi: 'hi-IN',
};

const PRAYER_NAMES_I18N: Record<string, Record<string, string>> = {
  ar: { Fajr: 'الفجر',  Dhuhr: 'الظهر',  Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  ur: { Fajr: 'فجر',    Dhuhr: 'ظہر',    Asr: 'عصر',   Maghrib: 'مغرب',   Isha: 'عشاء'   },
  fr: { Fajr: 'Fajr',   Dhuhr: 'Dhohr',  Asr: 'Asr',   Maghrib: 'Maghrib', Isha: 'Icha'  },
  tr: { Fajr: 'Sabah',  Dhuhr: 'Öğle',   Asr: 'İkindi',Maghrib: 'Akşam',   Isha: 'Yatsı' },
  id: { Fajr: 'Subuh',  Dhuhr: 'Zuhur',  Asr: 'Ashar', Maghrib: 'Magrib',  Isha: 'Isya'  },
  ms: { Fajr: 'Subuh',  Dhuhr: 'Zohor',  Asr: 'Asar',  Maghrib: 'Maghrib', Isha: 'Isyak' },
  bn: { Fajr: 'ফজর',   Dhuhr: 'জোহর',   Asr: 'আসর',  Maghrib: 'মাগরিব', Isha: 'এশা'   },
  hi: { Fajr: 'फजर',   Dhuhr: 'जुहर',   Asr: 'असर',  Maghrib: 'मगरिब',  Isha: 'ईशा'   },
};

function getAnnouncementText(prayer: string, lang: string): string {
  const p = PRAYER_NAMES_I18N[lang]?.[prayer] ?? prayer;
  switch (lang) {
    case 'ar': return `حان وقت صلاة ${p}`;
    case 'ur': return `${p} کی نماز کا وقت آ گیا`;
    case 'fr': return `Il est l'heure de la prière de ${p}`;
    case 'tr': return `${p} namazı vakti geldi`;
    case 'id': return `Waktu sholat ${p} telah tiba`;
    case 'ms': return `Waktu solat ${p} telah tiba`;
    case 'bn': return `${p} নামাযের সময় হয়েছে`;
    case 'hi': return `${p} की नमाज़ का वक्त हो गया है`;
    case 'de': return `Es ist Zeit für das ${p}-Gebet`;
    case 'es': return `Es hora de la oración de ${p}`;
    default:   return `${p} prayer time`;
  }
}

/** Speak `text` via the browser's TTS engine, resolving when done/cancelled/error. */
function speakTTS(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.88;
    utter.pitch = 1.05;
    utter.onend   = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

type SuppPos = 'before' | 'after' | 'both';

// ── Component ────────────────────────────────────────────────────────────────

export function AutoAzanScheduler() {
  const [voice]    = useLocalStorage<string>('isa:azanVoice', 'hafiz-ahmed-raza-qadri');
  const [enabled, setEnabled] = useLocalStorage<boolean>('isa:azanAutoplay', true);
  const [outputId] = useLocalStorage<string>('isa:audioOutput', '');
  const [unlocked, setUnlocked] = useLocalStorage<boolean>('isa:azanUnlocked', false);

  // Prayer announcement + durood/dua sequencing
  const [announce]       = useLocalStorage<boolean>('isa:azanAnnounce', true);
  const [language]       = useLocalStorage<string>('isa:language', 'en');
  const [duroodId]       = useLocalStorage<string | null>('isa:duroodId', null);
  const [duroodPos]      = useLocalStorage<SuppPos>('isa:duroodPos', 'after');
  const [duaId]          = useLocalStorage<string | null>('isa:duaId', null);
  const [duaPos]         = useLocalStorage<SuppPos>('isa:duaPos', 'after');
  const [customDuroods]  = useLocalStorage<CustomAzan[]>('isa:customDuroods', []);
  const [customDuas]     = useLocalStorage<CustomAzan[]>('isa:customDuas', []);

  const params = usePrayerParams();
  const byCoords = params.byCoords;

  const [needsGesture, setNeedsGesture] = useState(false);
  const [firing, setFiring] = useState<null | { prayer: string; voiceId: string }>(null);
  const [minimized, setMinimized] = useState(false);
  const [pendingPrayer, setPendingPrayer] = useState<string | null>(null);

  const audioRef         = useRef<HTMLAudioElement>(null);
  const firedRef         = useRef<Set<string>>(new Set());
  const customUrlRef     = useRef<string | null>(null);
  const revokeCustomUrl  = () => {
    if (customUrlRef.current) { URL.revokeObjectURL(customUrlRef.current); customUrlRef.current = null; }
  };

  const voiceRef    = useRef(voice);   voiceRef.current = voice;
  const outputIdRef = useRef(outputId); outputIdRef.current = outputId;
  const armedRef    = useRef(false);
  const firingRef   = useRef(false);

  // Refs for announcement / durood / dua — always fresh in callbacks
  const announceRef      = useRef(announce);      announceRef.current = announce;
  const languageRef      = useRef(language);      languageRef.current = language;
  const duroodIdRef      = useRef(duroodId);      duroodIdRef.current = duroodId;
  const duroodPosRef     = useRef(duroodPos);     duroodPosRef.current = duroodPos;
  const duaIdRef         = useRef(duaId);         duaIdRef.current = duaId;
  const duaPosRef        = useRef(duaPos);        duaPosRef.current = duaPos;
  const customDuroodsRef = useRef(customDuroods); customDuroodsRef.current = customDuroods;
  const customDuasRef    = useRef(customDuas);    customDuasRef.current = customDuas;

  // Sequential audio queue — each item is a src string played in order
  const playQueueRef    = useRef<string[]>([]);
  // Extra object URLs created for durood/dua blobs — revoked when queue finishes
  const extraUrlsRef    = useRef<string[]>([]);
  // Abort flag — set by stop(); checked after every await in fire()
  const abortRef        = useRef(false);
  // Currently-firing prayer name (needed inside advanceQueueRef for pending state)
  const firingPrayerRef = useRef<string | null>(null);

  const [castDeviceId] = useLocalStorage<string>('isa:castDeviceId', '');
  const castDeviceIdRef = useRef(castDeviceId);
  castDeviceIdRef.current = castDeviceId;
  const castClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCastTimer = () => {
    if (castClearTimerRef.current) { clearTimeout(castClearTimerRef.current); castClearTimerRef.current = null; }
  };

  const { data } = useQuery({
    queryKey: byCoords
      ? ['timings', 'coords', params.lat, params.lng, params.method, params.school]
      : ['timings', 'city', params.city, params.country],
    queryFn: () =>
      byCoords && params.lat != null && params.lng != null
        ? fetchTimingsByCoords(params.lat, params.lng, { method: params.method, school: params.school, label: params.label })
        : fetchTimingsByCity(params.city, params.country),
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof LocationError) return false;
      return failureCount < 2;
    },
  });

  const setAudioOutput = useCallback(async (el: HTMLAudioElement) => {
    if (!outputIdRef.current || !('setSinkId' in el)) return;
    try {
      await Promise.race([
        (el as any).setSinkId(outputIdRef.current),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ]);
    } catch {
      try { await (el as any).setSinkId(''); } catch {}
    }
  }, []);

  // ── Sequential audio queue ─────────────────────────────────────────────────
  // Defined as a ref-based function so it can self-reference without useCallback
  // circular deps. Fresh closure on every render → always captures current state.
  const advanceQueueRef = useRef<() => void>(() => {});
  advanceQueueRef.current = () => {
    const el = audioRef.current;
    if (!el || abortRef.current) return;
    const src = playQueueRef.current.shift();
    if (!src) {
      // Entire sequence finished
      firingRef.current = false;
      firingPrayerRef.current = null;
      setFiring(null);
      setMinimized(false);
      extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      extraUrlsRef.current = [];
      revokeCustomUrl();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('isa:azan-minimized', { detail: null }));
      return;
    }
    el.src = src;
    el.play().catch((err: Error) => {
      if (err?.name === 'NotAllowedError') {
        // Autoplay blocked — put src back and show Enable prompt
        playQueueRef.current.unshift(src);
        const p = firingPrayerRef.current;
        if (p) { setPendingPrayer(p); setNeedsGesture(true); }
      } else {
        // Other failure (codec, 404) — skip to next item
        advanceQueueRef.current();
      }
    });
  };

  // ── fire() — build and start the full playback sequence ───────────────────
  const fire = useCallback(async (prayer: string) => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = false;
    abortRef.current = false;
    firingPrayerRef.current = prayer;
    clearCastTimer();
    revokeCustomUrl();
    extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    extraUrlsRef.current = [];
    playQueueRef.current = [];

    const v = voiceRef.current;
    const { name: voiceLabel } = resolveVoiceInfo(v);

    // LAN device (Chromecast/DLNA) — cast the main azan and return
    const lanPath = azanLocalPath(v);
    const desktopApi = typeof window !== 'undefined' ? (window as any).desktop?.devices : null;
    if (castDeviceIdRef.current && desktopApi && lanPath) {
      try {
        await desktopApi.play({
          deviceId: castDeviceIdRef.current,
          source: { kind: 'lan', path: lanPath, fallbackUrl: resolveAzanCastUrl(v).url },
          title: `Adhan — ${voiceLabel}`,
        });
        setFiring({ prayer, voiceId: v });
        firingRef.current = true;
        clearCastTimer();
        castClearTimerRef.current = setTimeout(() => setFiring(null), 4 * 60_000);
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`${prayer} prayer time`, { body: `Playing ${voiceLabel} on your device`, silent: true });
        }
        return;
      } catch {
        // Device unreachable — fall through to local playback
      }
    }

    // Resolve main azan src
    let mainSrc: string;
    if (isCustomAzan(v)) {
      const url = await customAzanUrl(v);
      if (url) { customUrlRef.current = url; mainSrc = url; }
      else mainSrc = UNLOCK_SRC;
    } else {
      mainSrc = azanLocalPath(v) ?? UNLOCK_SRC;
    }

    // Show popup immediately (even during TTS announcement)
    setFiring({ prayer, voiceId: v });
    firingRef.current = true;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`${prayer} prayer time`, { body: `Playing ${voiceLabel}`, silent: true });
    }

    // ── 1. TTS announcement ──
    if (announceRef.current) {
      const lang = languageRef.current;
      await speakTTS(getAnnouncementText(prayer, lang), LANG_CODES[lang] ?? 'en-US');
      if (abortRef.current) return;
    }

    // ── 2. Build ordered audio queue ──
    const resolveSupp = async (id: string): Promise<string | null> => {
      const url = await customAzanUrl(id);
      if (url) extraUrlsRef.current.push(url);
      return url;
    };

    const queue: string[] = [];
    const dId  = duroodIdRef.current;
    const dPos = duroodPosRef.current;
    const qaId  = duaIdRef.current;
    const qaPos = duaPosRef.current;

    // Before durood
    if (dId && (dPos === 'before' || dPos === 'both')) {
      const src = await resolveSupp(dId);
      if (abortRef.current) { extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); extraUrlsRef.current = []; return; }
      if (src) queue.push(src);
    }
    // Before dua
    if (qaId && (qaPos === 'before' || qaPos === 'both')) {
      const src = await resolveSupp(qaId);
      if (abortRef.current) { extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); extraUrlsRef.current = []; return; }
      if (src) queue.push(src);
    }

    // Main azan
    queue.push(mainSrc);

    // After durood
    if (dId && (dPos === 'after' || dPos === 'both')) {
      const src = await resolveSupp(dId);
      if (src) queue.push(src);
    }
    // After dua
    if (qaId && (qaPos === 'after' || qaPos === 'both')) {
      const src = await resolveSupp(qaId);
      if (src) queue.push(src);
    }

    if (abortRef.current) {
      extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      extraUrlsRef.current = [];
      return;
    }

    playQueueRef.current = queue;
    await setAudioOutput(el);
    advanceQueueRef.current();
  }, [setAudioOutput]);

  const armAudio = useCallback(async (): Promise<boolean> => {
    if (armedRef.current) return true;
    if (firingRef.current) return false;
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

  const stop = () => {
    abortRef.current = true;
    // Cancel any in-progress TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    playQueueRef.current = [];
    extraUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    extraUrlsRef.current = [];
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    revokeCustomUrl();
    firingRef.current = false;
    firingPrayerRef.current = null;
    clearCastTimer();
    const id = castDeviceIdRef.current;
    const api = typeof window !== 'undefined' ? (window as any).desktop?.devices : null;
    if (id && api) { try { api.stop({ deviceId: id }); } catch {} }
    setFiring(null);
    setMinimized(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('isa:azan-minimized', { detail: null }));
    }
  };

  const minimize = () => {
    setMinimized(true);
    if (typeof window !== 'undefined' && firing) {
      window.dispatchEvent(new CustomEvent('isa:azan-minimized', { detail: { prayer: firing.prayer, voiceId: firing.voiceId } }));
    }
  };

  useEffect(() => {
    if (!enabled) { setNeedsGesture(false); return; }
    if (typeof window === 'undefined') return;
    try { if (!window.localStorage.getItem('isa:setupDone')) return; } catch {}
    let alreadyUnlocked = unlocked;
    try { alreadyUnlocked = alreadyUnlocked || window.localStorage.getItem('isa:azanUnlocked') === 'true'; } catch {}
    if (alreadyUnlocked) return;
    if (window.sessionStorage.getItem('isa:azanPromptSeen') === '1') return;
    try { window.sessionStorage.setItem('isa:azanPromptSeen', '1'); } catch {}
    setNeedsGesture(true);
  }, [enabled, unlocked]);

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

  // ── Core scheduler: poll every second, fire at prayer time ────────────────
  useEffect(() => {
    if (!enabled || !data) return;
    const { timings, timezone } = data;

    const prayerMs = (h: number, m: number, refNow: Date): number => {
      if (timezone) {
        const loc = DateTime.fromJSDate(refNow).setZone(timezone);
        return loc.startOf('day').set({ hour: h, minute: m, second: 0, millisecond: 0 }).toMillis();
      }
      const pt = new Date(refNow);
      pt.setHours(h, m, 0, 0);
      return pt.getTime();
    };

    const locationDateKey = (refNow: Date): string => {
      if (timezone) {
        const loc = DateTime.fromJSDate(refNow).setZone(timezone);
        return `${loc.year}-${loc.month}-${loc.day}`;
      }
      return `${refNow.getFullYear()}-${refNow.getMonth()}-${refNow.getDate()}`;
    };

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
        if (diff >= 0 && diff < 60_000) {
          firedRef.current.add(key);
          fire(name);
          break;
        }
      }
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [enabled, data, fire]);

  useEffect(() => {
    const onStop   = () => stop();
    const onExpand = () => setMinimized(false);
    window.addEventListener('isa:azan-stop',   onStop);
    window.addEventListener('isa:azan-expand', onExpand);
    return () => {
      window.removeEventListener('isa:azan-stop',   onStop);
      window.removeEventListener('isa:azan-expand', onExpand);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissPrompt = () => setNeedsGesture(false);

  const unlock = async () => {
    await armAudio();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    if (pendingPrayer) {
      const p = pendingPrayer;
      setPendingPrayer(null);
      await fire(p);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => {
          // Advance to the next item in the sequence (durood → dua → done)
          advanceQueueRef.current();
        }}
        onError={() => {
          const el = audioRef.current;
          if (!el || !firingRef.current) return;
          // If the guaranteed fallback also failed, skip to next queue item
          if (el.src.includes('makkah.mp3') || el.src === UNLOCK_SRC) {
            advanceQueueRef.current();
            return;
          }
          // First failure: try the fallback, then continue queue
          el.src = UNLOCK_SRC;
          el.play().catch(() => advanceQueueRef.current());
        }}
        preload="auto"
      />

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
        {firing && !minimized && (() => {
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
                background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(244,250,246,0.94) 100%)',
                border: '1px solid rgba(16,185,129,0.20)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 24px 50px rgba(6,40,28,0.22), 0 0 0 1px rgba(16,185,129,0.08)',
              }}
            >
              <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-gold-400 to-emerald-600" />
              <div className="p-4 pb-5">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center"
                    >
                      <Radio size={13} className="text-emerald-600" />
                    </motion.div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Azan Playing</span>
                  </div>
                  <button onClick={minimize}
                    className="p-1.5 rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 text-emerald-900/40 hover:text-emerald-800 transition"
                    title="Minimize to sidebar">
                    <X size={14} />
                  </button>
                </div>

                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: 'rgba(180,131,24,0.12)', border: '1px solid rgba(180,131,24,0.28)', color: '#92670A' }}>
                    🕌 {firing.prayer} Prayer
                  </span>
                </div>

                <p className="text-emerald-950 font-bold text-base leading-snug">{info.name}</p>
                <div className="flex items-center gap-2 mt-0.5 mb-4">
                  <p className="text-emerald-900/60 text-xs">{info.subtitle}</p>
                  {info.region && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-emerald-900/25 shrink-0" />
                      <span className="flex items-center gap-1 text-[10px] text-emerald-900/45">
                        <MapPin size={9} /> {info.region}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-[2.5px] h-10 mb-4 px-1">
                  {WAVE.map((h, i) => (
                    <motion.span
                      key={i}
                      className="rounded-full bg-emerald-500"
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

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={stop}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.30)',
                    color: '#b91c1c',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.10)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.30)';
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
