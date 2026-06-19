'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Download, CheckCircle2, Bell, Sparkles, Volume2,
  BellRing, BellOff, UploadCloud, Trash2, Music2, Search, Globe2,
  ArrowDownUp, LayoutGrid, List, MapPin, Heart, Activity, Zap,
  RefreshCcw, ShieldCheck, Clock, Settings2, ChevronRight, Headphones,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { AzanUploader } from '@/components/AzanUploader';
import {
  customAzanUrl, deleteAzanClip, isCustomAzan, type CustomAzan,
} from '@/lib/customAzan';
import { formatClock } from '@/lib/audioTrim';
import { Azan } from '@/lib/api';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { qiblaBearing, compassPoint } from '@/lib/qibla';
import { useTheme } from '@/lib/ThemeContext';

type AzanVoice = {
  id: string;
  name: string;
  subtitle: string;
  region: string;
  lang: string;
  style: string;
  duration: string;
  badge?: 'popular' | 'new';
  /** Local path served from /public/audio/azan/ — created by download_assets.py */
  local: string;
  /** Public fallback URL (in case the local file isn't downloaded yet). */
  remote: string;
  /** Themed artwork (in /public/azan/). Drop a real photo at the same path to override. */
  art: string;
  accent: string;
  defaultPick?: boolean;
};

const VOICES: AzanVoice[] = [
  {
    id: 'makkah', name: 'Makkah — Haramain', subtitle: 'Sheikh Ali Mulla',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '4:38',
    badge: 'popular', local: '/audio/azan/makkah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    art: '/azan/makkah.svg', accent: 'from-emerald-600 to-emerald-800', defaultPick: true,
  },
  {
    id: 'madinah', name: 'Madinah — Masjid Nabawi', subtitle: 'Sheikh Essam Bukhari',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '4:12',
    badge: 'new', local: '/audio/azan/madinah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
    art: '/azan/madinah.svg', accent: 'from-gold-500 to-gold-700', defaultPick: true,
  },
  {
    id: 'pakistan', name: 'Pakistan Style', subtitle: 'Lahore — Classical',
    region: 'Pakistan', lang: 'Urdu', style: 'Classical', duration: '3:58',
    local: '/audio/azan/pakistan.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    art: '/azan/pakistan.svg', accent: 'from-rose-500 to-amber-500',
  },
  {
    id: 'turkey', name: 'Turkish — Istanbul', subtitle: 'Hafiz Mustafa Özcan',
    region: 'Türkiye', lang: 'Turkish', style: 'Traditional', duration: '4:21',
    local: '/audio/azan/turkey.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
    art: '/azan/turkey.svg', accent: 'from-cyan-500 to-indigo-600',
  },
  {
    id: 'egypt', name: 'Egyptian — Cairo', subtitle: 'Maqam Style',
    region: 'Egypt', lang: 'Arabic', style: 'Maqam', duration: '4:46',
    local: '/audio/azan/egypt.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    art: '/azan/egypt.svg', accent: 'from-fuchsia-500 to-rose-500',
  },

  // ── Uploaded reciter collection (bundled in /public/audio/azan, served to web + desktop) ──
  {
    id: 'hafiz-ahmed-raza-qadri', name: 'Hafiz Ahmed Raza Qadri', subtitle: 'Naat-style Azan',
    region: 'Pakistan', lang: 'Urdu', style: 'Melodic', duration: '2:26', badge: 'new',
    local: '/audio/azan/hafiz-ahmed-raza-qadri.m4a', remote: '/audio/azan/hafiz-ahmed-raza-qadri.m4a',
    art: '/azan/pakistan.svg', accent: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'abdul-rahman-mossad', name: 'Abdul Rahman Mossad', subtitle: 'Heartfelt recitation',
    region: 'Egypt', lang: 'Arabic', style: 'Maqam', duration: '2:49',
    local: '/audio/azan/abdul-rahman-mossad.m4a', remote: '/audio/azan/abdul-rahman-mossad.m4a',
    art: '/azan/egypt.svg', accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'madinah-adhan', name: 'Azan Madinah', subtitle: 'أذان مدني',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '3:09',
    local: '/audio/azan/madinah-adhan.m4a', remote: '/audio/azan/madinah-adhan.m4a',
    art: '/azan/madinah.svg', accent: 'from-gold-500 to-gold-700',
  },
  {
    id: 'egzon-ibrahimi', name: 'Egzon Ibrahimi', subtitle: 'Balkan melodic Azan',
    region: 'Kosovo', lang: 'Arabic', style: 'Melodic', duration: '3:44', badge: 'new',
    local: '/audio/azan/egzon-ibrahimi.m4a', remote: '/audio/azan/egzon-ibrahimi.m4a',
    art: '/azan/turkey.svg', accent: 'from-sky-500 to-indigo-600',
  },
  {
    id: 'islam-sobhi', name: 'Islam Sobhi', subtitle: 'القارئ اسلام صبحي',
    region: 'Egypt', lang: 'Arabic', style: 'Melodic', duration: '2:18', badge: 'popular',
    local: '/audio/azan/islam-sobhi.m4a', remote: '/audio/azan/islam-sobhi.m4a',
    art: '/azan/egypt.svg', accent: 'from-rose-500 to-pink-600',
  },
  {
    id: 'makkah-abdallah-ahmad', name: 'Makkah — Abdallah Ahmad', subtitle: 'Haramain reciter',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '2:29',
    local: '/audio/azan/makkah-abdallah-ahmad.m4a', remote: '/audio/azan/makkah-abdallah-ahmad.m4a',
    art: '/azan/makkah.svg', accent: 'from-emerald-600 to-emerald-800',
  },
  {
    id: 'masjid-al-haram', name: 'Masjid Al-Haram', subtitle: 'The Grand Mosque, Makkah',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '2:46', badge: 'popular',
    local: '/audio/azan/masjid-al-haram.m4a', remote: '/audio/azan/masjid-al-haram.m4a',
    art: '/azan/makkah.svg', accent: 'from-emerald-700 to-green-900',
  },
  {
    id: 'mevlan-kurtishi', name: 'Mevlan Kurtishi', subtitle: 'Balkan melodic Azan',
    region: 'Macedonia', lang: 'Arabic', style: 'Melodic', duration: '2:37',
    local: '/audio/azan/mevlan-kurtishi.m4a', remote: '/audio/azan/mevlan-kurtishi.m4a',
    art: '/azan/turkey.svg', accent: 'from-cyan-500 to-blue-700',
  },
  {
    id: 'seyyid-taleh-boradigahi', name: 'Seyyid Taleh Boradigahi', subtitle: 'Azerbaijani Azan',
    region: 'Azerbaijan', lang: 'Arabic', style: 'Melodic', duration: '4:23',
    local: '/audio/azan/seyyid-taleh-boradigahi.m4a', remote: '/audio/azan/seyyid-taleh-boradigahi.m4a',
    art: '/azan/turkey.svg', accent: 'from-violet-500 to-purple-700',
  },
  {
    id: 'masjid-nabawi-osama-akhdar', name: 'Masjid Nabawi — Osama Al-Akhdar', subtitle: 'المسجد النبوي الشريف',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '3:30',
    local: '/audio/azan/masjid-nabawi-osama-akhdar.m4a', remote: '/audio/azan/masjid-nabawi-osama-akhdar.m4a',
    art: '/azan/madinah.svg', accent: 'from-gold-600 to-amber-700',
  },
];

const FEATURES = [
  { Icon: Headphones, title: 'Hi-Fi Audio',   sub: 'Crystal clear sound' },
  { Icon: Download,   title: 'Offline Ready',  sub: 'Download & listen' },
  { Icon: Zap,        title: 'Auto Play',      sub: 'Smart automation' },
  { Icon: Globe2,     title: 'Global Voices',  sub: "World's best reciters" },
];

const STATS = [
  { Icon: Music2,      title: '100+ Voices',     sub: "World's best reciters" },
  { Icon: ShieldCheck, title: 'High Quality',    sub: 'Crystal clear audio' },
  { Icon: RefreshCcw,  title: 'Regular Updates', sub: 'New voices added' },
  { Icon: Heart,       title: 'User Favorites',  sub: 'Save your favorites' },
];

// Deterministic waveform bar heights for a given seed (SSR-stable, no Math.random).
function waveBars(seed: number, count = 38): number[] {
  return Array.from({ length: count }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.7 + seed) * 0.6 + Math.sin(i * 0.27 + seed * 1.7) * 0.4);
    return 0.22 + 0.78 * v;
  });
}
const seedFromId = (id: string) => id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

// ── Small UI helpers ────────────────────────────────────────────────────────

function Waveform({ id, playing }: { id: string; playing: boolean }) {
  const bars = useMemo(() => waveBars(seedFromId(id)), [id]);
  return (
    <div className="flex items-center gap-[2px] h-9 flex-1 overflow-hidden">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={`w-[2.5px] rounded-full ${playing ? 'bg-emerald-500' : 'bg-emerald-300/70'}`}
          style={{ height: `${Math.round(h * 100)}%` }}
          animate={playing ? { scaleY: [1, 0.35 + h * 0.6, 1] } : { scaleY: 1 }}
          transition={playing
            ? { duration: 0.7 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.05 }
            : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${on ? 'bg-emerald-500' : 'bg-emerald-900/15'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

// Compass widget for the Qibla banner. Rendered larger than the strip so it
// pokes out top & bottom; theme-aware (rich dark face in dark mode). The tapered
// gold/green needle continuously points toward the qibla bearing.
function MiniCompass({ bearing, isDark }: { bearing: number | null; isDark: boolean }) {
  const tickMajor = isDark ? '#E9CF7A' : '#059669';
  const tickMinor = isDark ? 'rgba(110,231,183,0.45)' : '#a7f3d0';
  const labelN = isDark ? '#E9CF7A' : '#C9A227';
  const labelO = isDark ? '#6ee7b7' : '#059669';
  const goldTip = isDark ? '#E9CF7A' : '#C9A227';
  const greenTail = isDark ? '#10b981' : '#059669';
  const hubFill = isDark ? '#0b1712' : '#ffffff';

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: 240, height: 240,
        background: isDark ? 'radial-gradient(circle at 50% 42%, #15291f 0%, #060d0a 100%)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(233,207,122,0.28)' : '#d1fae5'}`,
        boxShadow: isDark
          ? '0 18px 50px -12px rgba(0,0,0,0.7), 0 0 0 6px rgba(7,15,11,0.55)'
          : '0 18px 50px -12px rgba(6,78,59,0.35), 0 0 0 6px rgba(255,255,255,0.7)',
      }}
    >
      <svg viewBox="0 0 100 100" width="216" height="216">
        <defs>
          <radialGradient id="cfFace" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={isDark ? '#13271d' : '#f8fcfa'} />
            <stop offset="100%" stopColor={isDark ? '#070f0b' : '#ecfdf5'} />
          </radialGradient>
          <linearGradient id="cfRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E9CF7A" />
            <stop offset="100%" stopColor={isDark ? '#10b981' : '#059669'} />
          </linearGradient>
          <filter id="cfGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="47" fill="url(#cfFace)" stroke="url(#cfRing)" strokeWidth="2" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#ecfdf5'} strokeWidth="1" />

        {Array.from({ length: 60 }, (_, i) => {
          const a = (i * 6 - 90) * Math.PI / 180;
          const major = i % 15 === 0;
          const r0 = major ? 36 : 40, r1 = 44;
          return (
            <line key={i}
              x1={50 + r0 * Math.cos(a)} y1={50 + r0 * Math.sin(a)}
              x2={50 + r1 * Math.cos(a)} y2={50 + r1 * Math.sin(a)}
              stroke={major ? tickMajor : tickMinor} strokeWidth={major ? 1.5 : 0.7} strokeLinecap="round" />
          );
        })}

        {(['N', 'E', 'S', 'W'] as const).map((l, i) => {
          const a = (i * 90 - 90) * Math.PI / 180;
          return (
            <text key={l} x={50 + 31 * Math.cos(a)} y={50 + 31 * Math.sin(a) + 2.6}
              textAnchor="middle" fontSize="7" fontWeight="800"
              fill={l === 'N' ? labelN : labelO} fontFamily="system-ui">{l}</text>
          );
        })}

        <motion.g
          style={{ transformOrigin: '50px 50px' }}
          animate={{ rotate: bearing != null ? [bearing - 2.5, bearing + 2.5, bearing - 2.5] : 0 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          filter="url(#cfGlow)"
        >
          <polygon points="50,14 55,50 50,56 45,50" fill={goldTip} />
          <polygon points="50,86 55,50 50,44 45,50" fill={greenTail} />
        </motion.g>

        <circle cx="50" cy="50" r="5" fill={hubFill} stroke={goldTip} strokeWidth="1.6" />
        <circle cx="50" cy="50" r="2" fill={greenTail} />
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Item = {
  id: string; name: string; subtitle: string; region: string;
  lang: string; style: string; duration: string; art: string; accent: string;
  badge?: 'popular' | 'new'; isCustom: boolean; defaultPick?: boolean;
  remoteUrl?: string;   // set for backend-synced customs — played directly from this URL
};

export default function AzanPage() {
  const loc = useStoredLocation();
  const { isDark } = useTheme();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useLocalStorage<string>('isa:azanVoice', 'makkah');
  const [autoplay, setAutoplay]   = useLocalStorage<boolean>('isa:azanAutoplay', true);
  const [favorites, setFavorites] = useLocalStorage<string[]>('isa:azanFavorites', []);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Smart Azan Settings (persisted) — the first maps to the real auto-azan flag.
  const [diffVoices, setDiffVoices] = useLocalStorage<boolean>('isa:azanDiffVoices', false);
  const [volAuto, setVolAuto]       = useLocalStorage<boolean>('isa:azanVolAuto', true);
  const [weekend, setWeekend]       = useLocalStorage<boolean>('isa:azanWeekend', false);

  // Toolbar state
  const [query, setQuery]   = useState('');
  const [langF, setLangF]   = useState('All Languages');
  const [styleF, setStyleF] = useState('All Styles');
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'duration'>('popular');
  const [view, setView]     = useState<'grid' | 'list'>('grid');

  // Custom uploads
  const [customAzans, setCustomAzans] = useLocalStorage<CustomAzan[]>('isa:customAzans', []);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const customUrlRef = useRef<string | null>(null);
  const revokeCustomUrl = () => {
    if (customUrlRef.current) { URL.revokeObjectURL(customUrlRef.current); customUrlRef.current = null; }
  };

  // Custom azans synced from the backend (uploaded on ANY device). They're played
  // straight from their public audio_url, so a clip uploaded on web/desktop/mobile
  // shows up everywhere.
  const [remoteCustoms, setRemoteCustoms] = useState<{ id: string; name: string; url: string; durationMs: number }[]>([]);
  useEffect(() => {
    Azan.voices()
      .then((vs) => setRemoteCustoms(
        vs.filter((v) => v.is_custom && v.audio_url)
          .map((v) => ({ id: v.id, name: v.name, url: v.audio_url, durationMs: v.duration_ms })),
      ))
      .catch(() => { /* offline / signed out — fall back to local customs only */ });
  }, []);

  const selectedLabel = isCustomAzan(selectedId)
    ? (customAzans.find((c) => c.id === selectedId)?.name ?? 'Custom Azan')
    : (VOICES.find((v) => v.id === selectedId)?.name ?? selectedId);

  // Live Qibla bearing from stored location.
  const qibBearing = useMemo(
    () => (loc.hasCoords && loc.lat != null && loc.lng != null ? qiblaBearing(loc.lat, loc.lng) : null),
    [loc.hasCoords, loc.lat, loc.lng],
  );

  useEffect(() => () => revokeCustomUrl(), []);

  // Probe which local files exist; fall back to remote streaming otherwise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, boolean> = {};
      await Promise.all(VOICES.map(async (v) => {
        try { const res = await fetch(v.local, { method: 'HEAD' }); out[v.id] = res.ok; }
        catch { out[v.id] = false; }
      }));
      if (!cancelled) setAvailability(out);
    })();
    return () => { cancelled = true; };
  }, []);

  const playPause = (v: AzanVoice) => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (activeId === v.id) { el.pause(); setActiveId(null); return; }
    revokeCustomUrl();
    el.src = availability[v.id] ? v.local : v.remote;
    el.play().then(() => setActiveId(v.id))
      .catch((e) => { setActiveId(null); setError(`Couldn't play ${v.name}: ${e?.message ?? 'browser blocked playback'}`); });
  };

  const previewCustom = async (meta: CustomAzan) => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (activeId === meta.id) { el.pause(); setActiveId(null); return; }
    el.pause();
    revokeCustomUrl();
    const url = await customAzanUrl(meta.id);
    if (!url) { setError(`"${meta.name}" couldn't be found in this browser's storage.`); return; }
    customUrlRef.current = url;
    el.src = url;
    el.play().then(() => setActiveId(meta.id))
      .catch((e) => { setActiveId(null); setError(`Couldn't play ${meta.name}: ${e?.message ?? 'browser blocked playback'}`); });
  };

  const deleteCustom = async (id: string) => {
    if (activeId === id) { audioRef.current?.pause(); setActiveId(null); revokeCustomUrl(); }
    await deleteAzanClip(id);
    setCustomAzans((prev) => prev.filter((c) => c.id !== id));
    setRemoteCustoms((prev) => prev.filter((c) => c.id !== id));
    // Remove the synced copy too (server checks ownership; no-op otherwise).
    Azan.deleteVoice(id).catch(() => {});
    if (selectedId === id) setSelectedId('makkah');
  };

  const onSaved = (meta: CustomAzan) => {
    setCustomAzans((prev) => [meta, ...prev]);
    setSelectedId(meta.id);
    setUploaderOpen(false);
  };

  const toggleFav = (id: string) =>
    setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const downloadItem = async (item: Item) => {
    let url: string | null = null;
    let filename = `${item.name}.mp3`;
    if (item.remoteUrl) {
      url = item.remoteUrl;
      filename = `${item.name}.wav`;
    } else if (item.isCustom) {
      url = await customAzanUrl(item.id);
      filename = `${item.name}.wav`;
    } else {
      const v = VOICES.find((x) => x.id === item.id);
      if (v) url = availability[v.id] ? v.local : v.remote;
    }
    if (!url) { setError('That clip is not available to download.'); return; }
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  };

  // Play a backend-synced custom straight from its public URL.
  const playRemote = (item: Item) => {
    const el = audioRef.current;
    if (!el || !item.remoteUrl) return;
    setError(null);
    if (activeId === item.id) { el.pause(); setActiveId(null); return; }
    el.pause();
    revokeCustomUrl();
    el.src = item.remoteUrl;
    el.play().then(() => setActiveId(item.id))
      .catch((e) => { setActiveId(null); setError(`Couldn't play ${item.name}: ${e?.message ?? 'playback blocked'}`); });
  };

  const playItem = (item: Item) => {
    if (item.remoteUrl) { playRemote(item); return; }
    if (item.isCustom) {
      const meta = customAzans.find((c) => c.id === item.id);
      if (meta) previewCustom(meta);
    } else {
      const v = VOICES.find((x) => x.id === item.id);
      if (v) playPause(v);
    }
  };

  // ── Build, filter & sort the unified item list ─────────────────────────────
  const allItems: Item[] = useMemo(() => {
    const builtin: Item[] = VOICES.map((v) => ({
      id: v.id, name: v.name, subtitle: v.subtitle, region: v.region,
      lang: v.lang, style: v.style, duration: v.duration, art: v.art,
      accent: v.accent, badge: v.badge, isCustom: false, defaultPick: v.defaultPick,
    }));
    const custom: Item[] = customAzans.map((c) => ({
      id: c.id, name: c.name, subtitle: 'Your upload', region: 'Custom',
      lang: 'Custom', style: 'Custom', duration: formatClock(c.durationSec),
      art: '/azan/custom.svg', accent: 'from-violet-500 to-fuchsia-600', isCustom: true,
    }));
    // Backend-synced customs — skip any matching a local upload (same name +
    // duration) so the uploader's own clip isn't listed twice on this device.
    const localKeys = new Set(customAzans.map((c) => `${c.name}|${Math.round(c.durationSec)}`));
    const remote: Item[] = remoteCustoms
      .filter((r) => !localKeys.has(`${r.name}|${Math.round(r.durationMs / 1000)}`))
      .map((r) => ({
        id: r.id, name: r.name, subtitle: 'Synced upload', region: 'Custom',
        lang: 'Custom', style: 'Custom', duration: formatClock(Math.round(r.durationMs / 1000)),
        art: '/azan/custom.svg', accent: 'from-violet-500 to-fuchsia-600', isCustom: true, remoteUrl: r.url,
      }));
    return [...builtin, ...custom, ...remote];
  }, [customAzans, remoteCustoms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allItems.filter((it) => {
      const matchesQ = !q || [it.name, it.subtitle, it.region, it.lang, it.style]
        .some((f) => f.toLowerCase().includes(q));
      const matchesLang = langF === 'All Languages' || it.lang === langF;
      const matchesStyle = styleF === 'All Styles' || it.style === styleF;
      return matchesQ && matchesLang && matchesStyle;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'duration') return a.duration.localeCompare(b.duration);
      // popular: badged 'popular' first, then 'new', then the rest
      const rank = (x: Item) => x.badge === 'popular' ? 0 : x.badge === 'new' ? 1 : 2;
      return rank(a) - rank(b);
    });
    return list;
  }, [allItems, query, langF, styleF, sortBy]);

  const languages = useMemo(
    () => ['All Languages', ...Array.from(new Set(VOICES.map((v) => v.lang)))],
    [],
  );
  const styles = useMemo(
    () => ['All Styles', ...Array.from(new Set(VOICES.map((v) => v.style)))],
    [],
  );

  const settingsRows = [
    { Icon: Clock,   title: 'Auto play before prayer', sub: '2 min before adhan', on: autoplay,   set: () => setAutoplay(!autoplay) },
    { Icon: Volume2, title: 'Different voices',         sub: 'For each prayer',     on: diffVoices, set: () => setDiffVoices(!diffVoices) },
    { Icon: Activity,title: 'Volume control',           sub: 'Auto adjust',         on: volAuto,    set: () => setVolAuto(!volAuto) },
    { Icon: Clock,   title: 'Weekend mode',             sub: 'Custom schedule',     on: weekend,    set: () => setWeekend(!weekend) },
  ];

  return (
    <div
      className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'azan-dark text-parchment' : ''}`}
      style={isDark ? { background: '#070b09' } : undefined}
    >

      {/* ════════ HEADER (full-bleed, animated mosque background) ════════ */}
      <header className="relative overflow-hidden">
        {/* Background layers: optional video → animated mosque image → overlays → particles */}
        <div aria-hidden className="absolute inset-0">
          {/* Ken-burns mosque image (always animates) */}
          <motion.div
            className="absolute inset-0 bg-cover bg-right-top"
            style={{ backgroundImage: "url('/hero-bg.jpg')" }}
            animate={{ scale: [1.08, 1.16, 1.08], x: [0, -14, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Optional looping video — drop /azan/mosque-loop.mp4 to activate (transparent until present) */}
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster="/hero-bg.jpg"
          >
            <source src="/azan/mosque-loop.mp4" type="video/mp4" />
          </video>
          {/* Legibility overlays — light cream wash only behind the left-hand text; the image stays clear elsewhere */}
          <div className="absolute inset-0" style={{ background: isDark
            ? 'linear-gradient(90deg,#070b09 0%,rgba(7,11,9,0.88) 16%,rgba(7,11,9,0.46) 40%,transparent 66%)'
            : 'linear-gradient(90deg,#FAF7EE 0%,rgba(250,247,238,0.82) 16%,rgba(250,247,238,0.28) 38%,transparent 62%)' }} />
          <div className="absolute inset-0" style={{ background: isDark
            ? 'linear-gradient(180deg,transparent 0%,transparent 62%,#070b09 100%)'
            : 'linear-gradient(180deg,transparent 0%,transparent 68%,rgba(250,247,238,0.9) 100%)' }} />
          {/* Drifting colour auroras */}
          <motion.div className="absolute -top-20 right-1/4 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(16,185,129,0.18) 0%,transparent 70%)' }}
            animate={{ x: [0, 40, 0], y: [0, 24, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute top-10 right-10 w-60 h-60 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(212,175,55,0.2) 0%,transparent 70%)' }}
            animate={{ x: [0, -30, 0], y: [0, 30, 0] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }} />
          {/* Floating light specks */}
          {[
            { l: '30%', t: '20%', d: 9 }, { l: '52%', t: '40%', d: 12 }, { l: '70%', t: '18%', d: 10 },
            { l: '84%', t: '52%', d: 14 }, { l: '44%', t: '64%', d: 11 }, { l: '62%', t: '30%', d: 13 },
          ].map((p, i) => (
            <motion.span key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-gold-300/70"
              style={{ left: p.l, top: p.t }}
              animate={{ y: [0, -22, 0], opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }} />
          ))}
        </div>

        <div className="relative px-5 sm:px-8 pt-7 pb-5">
          {/* — title row — */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="font-display font-bold text-4xl sm:text-5xl text-emerald-950 leading-none">Azan Voices</h1>
              <p className="text-emerald-900/60 mt-2 text-sm sm:text-base">Beautiful voices for every prayer time</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-2.5"
            >
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setUploaderOpen(true)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-white/90 backdrop-blur border border-emerald-200 text-emerald-800 shadow-md hover:bg-white transition"
              >
                <UploadCloud size={16} /> Upload Azan
              </motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setAutoplay(!autoplay)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition
                  ${autoplay ? 'bg-emerald-600 text-white shadow-glow-emerald hover:bg-emerald-700' : 'bg-white/90 backdrop-blur border border-emerald-200 text-emerald-800 hover:bg-white'}`}
              >
                {autoplay ? <><BellRing size={16} /> Auto-Azan: ON</> : <><BellOff size={16} /> Auto-Azan: OFF</>}
              </motion.button>
            </motion.div>
          </div>

          {/* — feature chips — */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
            {FEATURES.map(({ Icon, title, sub }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm px-3.5 py-3"
              >
                <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-950 leading-none">{title}</p>
                  <p className="text-[11px] text-emerald-900/55 mt-1 leading-none truncate">{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* — Qibla banner — */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
            className="relative mt-5"
          >
            <div
              className="relative rounded-3xl overflow-hidden border border-emerald-700/30 shadow-xl shadow-emerald-950/20"
              style={{ background: isDark
                ? 'linear-gradient(120deg,#0a3a2b 0%,#072a1f 55%,#051e16 100%)'
                : 'linear-gradient(120deg,#0b6b4f 0%,#065f46 55%,#064e3b 100%)' }}
            >
            <div aria-hidden className="absolute inset-0 pattern-bg opacity-[0.08]" />
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/40 to-transparent" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 px-6 py-5 pr-6 lg:pr-52">
              {/* Qibla direction */}
              <div className="flex items-center gap-4">
                <motion.span className="text-3xl" animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>🕋</motion.span>
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide">Qibla Direction</p>
                  <p className="text-white font-bold text-lg leading-tight">
                    {qibBearing != null ? `${Math.round(qibBearing)}°` : '—'}
                    <span className="text-emerald-100/70 font-medium text-sm"> from your location</span>
                  </p>
                </div>
                <Link href="/dashboard/qibla"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-emerald-800 font-semibold text-xs px-4 py-2 hover:bg-white transition shadow-sm">
                  View on Map
                </Link>
              </div>

              <div className="hidden lg:block w-px h-12 bg-white/15" />

              {/* Current location */}
              <div className="flex items-center gap-4">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-gold-200">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide">Current Location</p>
                  <p className="text-white font-bold text-base leading-tight">{loc.hasCoords ? loc.label : 'Not set'}</p>
                </div>
                <Link href="/dashboard/prayer-times"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-white/30 text-white font-semibold text-xs px-4 py-2 hover:bg-white/10 transition">
                  Change
                </Link>
              </div>
            </div>
            </div>

            {/* Compass — outside the clipped banner so it pokes out top & bottom */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block z-10">
              <MiniCompass bearing={qibBearing} isDark={isDark} />
            </div>
          </motion.div>
        </div>
      </header>

      {/* ════════ CONTENT ════════ */}
      <div className="px-5 sm:px-8 pb-10">

        {/* auto-azan note */}
        <AnimatePresence>
          {autoplay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3 flex items-start gap-2 mb-5">
                <BellRing size={16} className="shrink-0 mt-0.5" />
                <p>Auto-Azan is on — the browser will play <strong>{selectedLabel}</strong> at the next prayer time. Keep this tab open; on the first prayer you&apos;ll get a one-time &quot;Enable&quot; prompt so the browser allows autoplay.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700/50" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search voices, reciters, styles..."
              className="w-full rounded-2xl border border-emerald-200 bg-white pl-10 pr-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-sm"
            />
          </div>

          <SelectChip Icon={Globe2} value={langF} options={languages} onChange={setLangF} />
          <SelectChip Icon={Music2} value={styleF} options={styles} onChange={setStyleF} />
          <SelectChip Icon={ArrowDownUp}
            value={sortBy === 'popular' ? 'Sort by Popular' : sortBy === 'name' ? 'Sort by Name' : 'Sort by Duration'}
            options={['Sort by Popular', 'Sort by Name', 'Sort by Duration']}
            onChange={(v) => setSortBy(v.includes('Name') ? 'name' : v.includes('Duration') ? 'duration' : 'popular')}
          />

          <div className="flex items-center gap-1 rounded-2xl border border-emerald-200 bg-white p-1 shadow-sm">
            <button onClick={() => setView('grid')} aria-label="Grid view"
              className={`p-2 rounded-xl transition ${view === 'grid' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')} aria-label="List view"
              className={`p-2 rounded-xl transition ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* ── Cards + settings panel ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
          {/* card grid */}
          <div className={`xl:col-span-3 grid gap-4 ${view === 'grid' ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
            <AnimatePresence mode="popLayout">
              {filtered.map((item, i) => {
                const isPlaying = activeId === item.id;
                const isSelected = selectedId === item.id;
                const isFav = favorites.includes(item.id);
                const isLocal = item.isCustom ? true : availability[item.id];
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    whileHover={{ y: -4 }}
                    className={`group relative rounded-3xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-xl hover:shadow-emerald-900/10
                      ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-emerald-900/8'}`}
                  >
                    {/* badge */}
                    {item.badge && (
                      <span className={`absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm
                        ${item.badge === 'popular' ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-amber-950'}`}>
                        {item.badge === 'popular' ? '+ Popular' : 'New'}
                      </span>
                    )}
                    {item.isCustom && (
                      <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold bg-violet-500 text-white shadow-sm">
                        Custom
                      </span>
                    )}

                    {/* bell — quick-select for auto-azan */}
                    <button
                      onClick={() => setSelectedId(item.id)}
                      title={isSelected ? 'Active auto-Azan voice' : 'Use for auto-Azan'}
                      className={`absolute top-4 right-4 p-2 rounded-full transition ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'text-emerald-900/30 hover:bg-emerald-50 hover:text-emerald-600'}`}
                    >
                      <Bell size={16} fill={isSelected ? 'currentColor' : 'none'} />
                    </button>

                    {/* avatar + identity */}
                    <div className="flex items-start gap-4 pr-8">
                      <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br ${item.accent}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.art} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        {/* play overlay */}
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                          onClick={() => playItem(item)}
                          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full grid place-items-center shadow-lg transition
                            ${isPlaying ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50'}`}
                        >
                          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </motion.button>
                      </div>

                      <div className="min-w-0 pt-1">
                        <h3 className="font-bold text-emerald-950 leading-tight truncate">{item.name}</h3>
                        <p className="text-sm text-emerald-900/60 truncate">{item.subtitle}</p>
                        <p className="text-xs text-emerald-900/40 mt-0.5">{item.lang} • {item.region}</p>
                      </div>
                    </div>

                    {/* waveform */}
                    <div className="mt-4 flex items-center gap-3">
                      <Waveform id={item.id} playing={isPlaying} />
                      <span className="text-xs font-mono text-emerald-900/50 shrink-0">{item.duration}</span>
                    </div>

                    {/* actions */}
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => toggleFav(item.id)} title="Favorite"
                        className={`w-10 h-10 grid place-items-center rounded-full border transition shrink-0
                          ${isFav ? 'bg-rose-50 border-rose-200 text-rose-500' : 'border-emerald-900/10 text-emerald-900/40 hover:text-rose-500 hover:border-rose-200'}`}>
                        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => downloadItem(item)} title="Download"
                        className="w-10 h-10 grid place-items-center rounded-full border border-emerald-900/10 text-emerald-900/40 hover:text-emerald-700 hover:border-emerald-300 transition shrink-0">
                        <Download size={16} />
                      </button>
                      {item.isCustom && (
                        <button onClick={() => deleteCustom(item.id)} title="Delete upload"
                          className="w-10 h-10 grid place-items-center rounded-full border border-rose-100 text-rose-500 hover:bg-rose-50 transition shrink-0">
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedId(item.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition
                          ${isSelected ? 'bg-emerald-600 text-white shadow-glow-emerald' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
                      >
                        {isSelected ? <><CheckCircle2 size={16} /> Selected</> : 'Set as Default'}
                      </button>
                    </div>

                    {/* availability hint */}
                    {!item.isCustom && (
                      <p className="mt-2.5 text-[11px] text-emerald-900/35 flex items-center gap-1">
                        {isLocal === undefined && 'Checking availability…'}
                        {isLocal === true && <><Volume2 size={11} /> Offline ready</>}
                        {isLocal === false && <><Download size={11} /> Streaming — run download_assets.py for offline</>}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="sm:col-span-2 2xl:col-span-3 text-center py-16 text-emerald-900/40">
                <Search size={32} className="mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No voices match your filters</p>
                <p className="text-sm">Try a different search or reset the filters.</p>
              </div>
            )}
          </div>

          {/* ── Smart Azan Settings panel ── */}
          <motion.div
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="xl:col-span-1 rounded-3xl border border-emerald-900/8 bg-white shadow-sm p-5 xl:sticky xl:top-4"
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Activity size={17} />
              </span>
              <h2 className="font-display font-bold text-lg text-emerald-950">Smart Azan Settings</h2>
            </div>

            <div className="space-y-1">
              {settingsRows.map(({ Icon, title, sub, on, set }, i) => (
                <motion.div key={title}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-emerald-50/60 transition"
                >
                  <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-950 leading-tight">{title}</p>
                    <p className="text-[11px] text-emerald-900/50 leading-tight mt-0.5">{sub}</p>
                  </div>
                  <Toggle on={on} onClick={set} />
                </motion.div>
              ))}
            </div>

            <Link href="/dashboard/settings"
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-3 shadow-glow-emerald transition group">
              <Settings2 size={16} /> Advanced Settings
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition" />
            </Link>

            {favorites.length > 0 && (
              <p className="mt-4 text-center text-[11px] text-emerald-900/45 flex items-center justify-center gap-1.5">
                <Heart size={11} className="text-rose-400" fill="currentColor" /> {favorites.length} favorite{favorites.length > 1 ? 's' : ''} saved
              </p>
            )}
          </motion.div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">{error}</div>
        )}

        {/* ── Bottom stats ── */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map(({ Icon, title, sub }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ y: -3 }}
              className="flex items-center gap-3 rounded-2xl border border-emerald-900/8 bg-white shadow-sm px-4 py-3.5"
            >
              <span className="inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-950 leading-none">{title}</p>
                <p className="text-[11px] text-emerald-900/50 mt-1 leading-none">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => { setActiveId(null); revokeCustomUrl(); }}
        onError={() => { setActiveId(null); revokeCustomUrl(); setError('Audio failed to load. Try a different voice or run download_assets.py for offline files.'); }}
      />

      <AzanUploader open={uploaderOpen} onClose={() => setUploaderOpen(false)} onSaved={onSaved} />
    </div>
  );
}

// ── Dropdown chip (native select styled as a pill) ──────────────────────────────

function SelectChip({
  Icon, value, options, onChange,
}: {
  Icon: typeof Globe2; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white pl-3.5 pr-2 py-3 text-sm font-semibold text-emerald-800 shadow-sm hover:border-emerald-300 transition">
      <Icon size={15} className="text-emerald-600 shrink-0" />
      <span className="whitespace-nowrap">{value}</span>
      <ChevronRight size={14} className="rotate-90 text-emerald-700/40" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label={value}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
