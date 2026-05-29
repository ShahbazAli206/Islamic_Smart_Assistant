'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, Download, CheckCircle2, Bell, Sparkles, Volume2, Star,
  BellRing, BellOff,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';

type AzanVoice = {
  id: string;
  name: string;
  subtitle: string;
  region: string;
  duration: string;
  /** Local path served from /public/audio/azan/ — created by download_assets.py */
  local: string;
  /** Public fallback URL (in case the local file isn't downloaded yet). */
  remote: string;
  accent: string;
  defaultPick?: boolean;
};

// Local paths are written by download_assets.py; the remote URLs are public
// islamcan.com mirrors used as a streaming fallback when offline files are missing.
const VOICES: AzanVoice[] = [
  {
    id: 'makkah',
    name: 'Makkah — Haramain',
    subtitle: 'Sheikh Ali Mulla',
    region: 'Saudi Arabia',
    duration: '4:38',
    local:  '/audio/azan/makkah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    accent: 'from-emerald-600 to-emerald-800',
    defaultPick: true,
  },
  {
    id: 'madinah',
    name: 'Madinah — Masjid Nabawi',
    subtitle: 'Sheikh Essam Bukhari',
    region: 'Saudi Arabia',
    duration: '4:12',
    local:  '/audio/azan/madinah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
    accent: 'from-gold-500 to-gold-700',
    defaultPick: true,
  },
  {
    id: 'pakistan',
    name: 'Pakistan style',
    subtitle: 'Lahore — classical',
    region: 'Pakistan',
    duration: '3:58',
    local:  '/audio/azan/pakistan.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    accent: 'from-rose-500 to-amber-500',
  },
  {
    id: 'turkey',
    name: 'Turkish — Istanbul',
    subtitle: 'Hafiz Mustafa Özcan',
    region: 'Türkiye',
    duration: '4:21',
    local:  '/audio/azan/turkey.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
    accent: 'from-cyan-500 to-indigo-600',
  },
  {
    id: 'egypt',
    name: 'Egyptian — Cairo',
    subtitle: 'Maqam style',
    region: 'Egypt',
    duration: '4:46',
    local:  '/audio/azan/egypt.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    accent: 'from-fuchsia-500 to-rose-500',
  },
];

export default function AzanPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useLocalStorage<string>('isa:azanVoice', 'makkah');
  const [autoplay, setAutoplay]   = useLocalStorage<boolean>('isa:azanAutoplay', false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Probe which local files have been downloaded; fall back to remote otherwise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, boolean> = {};
      await Promise.all(
        VOICES.map(async (v) => {
          try {
            const res = await fetch(v.local, { method: 'HEAD' });
            out[v.id] = res.ok;
          } catch {
            out[v.id] = false;
          }
        }),
      );
      if (!cancelled) setAvailability(out);
    })();
    return () => { cancelled = true; };
  }, []);

  const playPause = (v: AzanVoice) => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (activeId === v.id) {
      el.pause();
      setActiveId(null);
      return;
    }
    el.src = availability[v.id] ? v.local : v.remote;
    el.play()
      .then(() => setActiveId(v.id))
      .catch((e) => {
        setActiveId(null);
        setError(`Couldn't play ${v.name}: ${e?.message ?? 'browser blocked playback'}`);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip-gold mb-2"><Sparkles size={12}/> Azan Library</p>
          <h1 className="h-display text-4xl font-bold">Azan Voices</h1>
          <p className="text-ink/60 mt-1">Pick a voice and we'll play it on every device at every prayer time.</p>
        </div>
        <button
          onClick={() => setAutoplay(!autoplay)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition shadow-md
                      ${autoplay
                        ? 'bg-emerald-600 text-white shadow-glow-emerald hover:bg-emerald-700'
                        : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'}`}
        >
          {autoplay ? <><BellRing size={16}/> Auto-Azan: ON</> : <><BellOff size={16}/> Auto-Azan: OFF</>}
        </button>
      </div>

      {autoplay && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3 flex items-start gap-2">
          <BellRing size={16} className="shrink-0 mt-0.5"/>
          <p>
            Auto-Azan is on. The browser will play <strong>{selectedId}</strong> at the next prayer time. Keep this tab open. On first prayer, you'll see a one-time "Enable" prompt so the browser allows autoplay.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VOICES.map((v, i) => {
          const isPlaying = activeId === v.id;
          const isSelected = selectedId === v.id;
          const isLocal = availability[v.id];
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3 }}
              className={`card card-pad relative overflow-hidden ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${v.accent} opacity-20`} />
              <div className="flex items-start justify-between">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-white bg-gradient-to-br ${v.accent} shadow-lg`}>
                  <Bell size={22} />
                </div>
                {v.defaultPick && <span className="chip-gold"><Star size={12}/> Default</span>}
              </div>

              <h3 className="mt-4 text-lg font-bold">{v.name}</h3>
              <p className="text-sm text-ink/65">{v.subtitle}</p>
              <p className="text-xs text-ink/50 mt-1">{v.region} · {v.duration}</p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => playPause(v)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition
                              ${isPlaying ? 'bg-emerald-700 text-white shadow-glow-emerald' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                >
                  {isPlaying ? <><Pause size={16}/> Pause</> : <><Play size={16}/> Preview</>}
                </button>

                <button
                  onClick={() => setSelectedId(v.id)}
                  className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold border transition
                              ${isSelected
                                ? 'bg-gold-gradient text-midnight-900 border-gold-400 shadow-glow-gold'
                                : 'bg-white text-ink/70 border-emerald-100 hover:border-emerald-300'}`}
                >
                  {isSelected ? <><CheckCircle2 size={16}/> Selected</> : 'Set default'}
                </button>
              </div>

              <p className="mt-3 text-[11px] text-ink/45 flex items-center gap-1">
                {isLocal === undefined && <>Checking availability…</>}
                {isLocal === true  && <><Volume2 size={11}/> Offline ready (downloaded)</>}
                {isLocal === false && <><Download size={11}/> Streaming — run <code className="text-emerald-700">download_assets.py</code> for offline</>}
              </p>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setActiveId(null)}
        onError={() => { setActiveId(null); setError('Audio failed to load. Try a different voice or run download_assets.py for offline files.'); }}
      />
    </div>
  );
}
