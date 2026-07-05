'use client';

// NOTE: content hash bumped (v2, 2026-07-04) to force Vercel to regenerate this
// route — a stale build cache had dropped /dashboard/azan-voices from the deployment
// (404). If it 404s again, redeploy from the Vercel dashboard with
// "Use existing Build Cache" off.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Loader2, Download, CheckCircle2, Bell, Sparkles, Volume2,
  BellRing, BellOff, UploadCloud, Trash2, Music2, Search, Globe2,
  ArrowDownUp, LayoutGrid, List, MapPin, Heart, Activity, Zap, Compass,
  RefreshCcw, ShieldCheck, Clock, Settings2, ChevronRight, Headphones,
  Pencil, Scissors, Square, X, AlertTriangle, Moon,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { AzanUploader } from '@/components/AzanUploader';
import { AzanDeviceMenu } from '@/components/AzanDeviceMenu';
import { AzanTrimmer, type TrimTarget } from '@/components/AzanTrimmer';
import {
  customAzanUrl, deleteAzanClip, putAzanClip, getAzanClip, isCustomAzan,
  saveRemoteUrl,
  BUILT_IN_DUROODS, BUILT_IN_DUAS,
  type CustomAzan, type AudioType,
} from '@/lib/customAzan';
import { formatClock, decodeAudioFile, encodeWavFromSegments, type WavSegment } from '@/lib/audioTrim';
import { Azan } from '@/lib/api';
import { fetchCommunityUploads, deleteCommunityUpload, subscribeToUploads, isCommunityEnabled } from '@/lib/communityUploads';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { qiblaBearing, compassPoint } from '@/lib/qibla';
import { useTheme } from '@/lib/ThemeContext';
import { ContentBackdrop } from '@/components/ContentBackdrop';

type AzanVoice = {
  id: string;
  name: string;
  subtitle: string;
  region: string;
  lang: string;
  style: string;
  duration: string;
  badge?: 'popular' | 'new';
  /** Extra label pills shown on the card alongside badge (e.g. 'Most Listened'). */
  tags?: string[];
  /** Local path served from /public/audio/adhan/ — created by download_assets.py */
  local: string;
  /** Public fallback URL (in case the local file isn't downloaded yet). */
  remote: string;
  /** Themed artwork (in /public/adhan/). Drop a real photo at the same path to override. */
  art: string;
  accent: string;
  defaultPick?: boolean;
};

const VOICES: AzanVoice[] = [
  // ── ★ Popular · 🎧 Most Listened (shown by default) ──────────────────────
  {
    id: 'azan-best-sound-quality', name: 'Azan — Best Sound Quality', subtitle: 'Crystal clear HD recording',
    region: 'Unknown', lang: 'Arabic', style: 'Melodic', duration: '2:46',
    badge: 'popular', tags: ['Most Listened'],
    local: '/audio/Azan Best Sound quality.mp3', remote: '/audio/Azan Best Sound quality.mp3',
    art: '/adhan/makkah.svg', accent: 'from-emerald-500 to-teal-700', defaultPick: true,
  },
  {
    id: 'hafiz-ahmed-raza-qadri', name: 'Hafiz Ahmed Raza Qadri', subtitle: 'Naat-style Azan',
    region: 'Pakistan', lang: 'Urdu', style: 'Melodic', duration: '2:26',
    badge: 'popular', tags: ['Most Listened'],
    local: '/audio/adhan/hafiz-ahmed-raza-qadri.m4a', remote: '/audio/adhan/hafiz-ahmed-raza-qadri.m4a',
    art: '/adhan/pakistan.svg', accent: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'mevlan-kurtishi', name: 'Mevlan Kurtishi', subtitle: 'Balkan melodic Azan',
    region: 'Macedonia', lang: 'Arabic', style: 'Melodic', duration: '2:37',
    badge: 'popular', tags: ['Most Listened'],
    local: '/audio/adhan/mevlan-kurtishi.m4a', remote: '/audio/adhan/mevlan-kurtishi.m4a',
    art: '/adhan/turkey.svg', accent: 'from-cyan-500 to-blue-700',
  },
  {
    id: 'egzon-ibrahimi', name: 'Egzon Ibrahimi', subtitle: 'Balkan melodic Azan',
    region: 'Kosovo', lang: 'Arabic', style: 'Melodic', duration: '3:44',
    badge: 'popular', tags: ['Most Listened'],
    local: '/audio/adhan/egzon-ibrahimi.m4a', remote: '/audio/adhan/egzon-ibrahimi.m4a',
    art: '/adhan/turkey.svg', accent: 'from-sky-500 to-indigo-600',
  },
  {
    id: 'abdul-rahman-mossad', name: 'Abdul Rahman Mossad', subtitle: 'Heartfelt recitation',
    region: 'Egypt', lang: 'Arabic', style: 'Maqam', duration: '2:49',
    badge: 'popular', tags: ['Most Listened'],
    local: '/audio/adhan/abdul-rahman-mossad.m4a', remote: '/audio/adhan/abdul-rahman-mossad.m4a',
    art: '/adhan/egypt.svg', accent: 'from-amber-500 to-orange-600',
  },

  // ── Sacred Mosques ────────────────────────────────────────────────────────
  {
    id: 'masjid-al-haram', name: 'Masjid Al-Haram', subtitle: 'The Grand Mosque, Makkah',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '2:46',
    local: '/audio/adhan/masjid-al-haram.m4a', remote: '/audio/adhan/masjid-al-haram.m4a',
    art: '/adhan/makkah.svg', accent: 'from-emerald-700 to-green-900',
  },
  {
    id: 'makkah-abdallah-ahmad', name: 'Makkah — Abdallah Ahmad', subtitle: 'Haramain reciter',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '2:29',
    local: '/audio/adhan/makkah-abdallah-ahmad.m4a', remote: '/audio/adhan/makkah-abdallah-ahmad.m4a',
    art: '/adhan/makkah.svg', accent: 'from-emerald-600 to-emerald-800',
  },
  {
    id: 'islam-sobhi', name: 'Islam Sobhi', subtitle: 'القارئ اسلام صبحي',
    region: 'Egypt', lang: 'Arabic', style: 'Melodic', duration: '2:18',
    local: '/audio/adhan/islam-sobhi.m4a', remote: '/audio/adhan/islam-sobhi.m4a',
    art: '/adhan/egypt.svg', accent: 'from-rose-500 to-pink-600',
  },

  // ── More Voices ───────────────────────────────────────────────────────────
  {
    id: 'masjid-nabawi-osama-akhdar', name: 'Masjid Nabawi — Osama Al-Akhdar', subtitle: 'المسجد النبوي الشريف',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '3:30',
    badge: 'popular',
    local: '/audio/adhan/masjid-nabawi-osama-akhdar.m4a', remote: '/audio/adhan/masjid-nabawi-osama-akhdar.m4a',
    art: '/adhan/madinah.svg', accent: 'from-gold-600 to-amber-700',
  },
  {
    id: 'pakistan', name: 'Pakistan Style', subtitle: 'Lahore — Classical',
    region: 'Pakistan', lang: 'Urdu', style: 'Classical', duration: '3:58',
    badge: 'popular',
    local: '/audio/adhan/pakistan.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    art: '/adhan/pakistan.svg', accent: 'from-rose-500 to-amber-500',
  },
  {
    id: 'turkey', name: 'Turkish — Istanbul', subtitle: 'Hafiz Mustafa Özcan',
    region: 'Türkiye', lang: 'Turkish', style: 'Traditional', duration: '4:21',
    local: '/audio/adhan/turkey.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
    art: '/adhan/turkey.svg', accent: 'from-cyan-500 to-indigo-600',
  },
  {
    id: 'egypt', name: 'Egyptian — Cairo', subtitle: 'Maqam Style',
    region: 'Egypt', lang: 'Arabic', style: 'Maqam', duration: '4:46',
    local: '/audio/adhan/egypt.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    art: '/adhan/egypt.svg', accent: 'from-fuchsia-500 to-rose-500',
  },
  {
    id: 'madinah-adhan', name: 'Azan Madinah', subtitle: 'أذان مدني',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '3:09',
    local: '/audio/adhan/madinah-adhan.m4a', remote: '/audio/adhan/madinah-adhan.m4a',
    art: '/adhan/madinah.svg', accent: 'from-gold-500 to-gold-700',
  },
  {
    id: 'makkah', name: 'Makkah — Haramain', subtitle: 'Sheikh Ali Mulla',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '4:38',
    local: '/audio/adhan/makkah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    art: '/adhan/makkah.svg', accent: 'from-emerald-600 to-emerald-800',
  },
  {
    id: 'madinah', name: 'Madinah — Masjid Nabawi', subtitle: 'Sheikh Essam Bukhari',
    region: 'Saudi Arabia', lang: 'Arabic', style: 'Traditional', duration: '4:12',
    local: '/audio/adhan/madinah.mp3',
    remote: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
    art: '/adhan/madinah.svg', accent: 'from-gold-500 to-gold-700',
  },
];

const FEATURES = [
  { Icon: Headphones, title: 'Hi-Fi Audio',   sub: 'Crystal clear sound' },
  { Icon: Globe2,     title: 'Global Voices',  sub: "World's best reciters" },
];

const STATS = [
  { Icon: Music2,      title: '100+ Voices',     sub: "World's best reciters" },
  { Icon: ShieldCheck, title: 'High Quality',    sub: 'Crystal clear audio' },
  { Icon: RefreshCcw,  title: 'Regular Updates', sub: 'New voices added' },
  { Icon: Heart,       title: 'User Favorites',  sub: 'Save your favorites' },
];

// ── Supplementary audio types ────────────────────────────────────────────────

export type SuppPos = 'before' | 'after' | 'both';


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

// ── Uploaded supplementary track card ────────────────────────────────────────

function UploadedCard({
  meta, isPlaying, accent, onPlay, onDelete,
  isBefore, isAfter, onToggleBefore, onToggleAfter,
  readOnly = false,
}: {
  meta: CustomAzan; isPlaying: boolean;
  accent: 'emerald' | 'rose';
  onPlay: () => void; onDelete: () => void;
  isBefore: boolean; isAfter: boolean;
  onToggleBefore: () => void; onToggleAfter: () => void;
  readOnly?: boolean;
}) {
  const { isDark } = useTheme();
  const [queueOpen, setQueueOpen] = useState(false);
  const initials = meta.name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const g = accent === 'rose' ? 'from-rose-400 to-pink-600' : 'from-emerald-400 to-teal-600';
  const active = isBefore || isAfter;
  const showQueueBtns = queueOpen || active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`relative rounded-2xl border p-3.5 shadow-sm transition hover:shadow-md ${
        isDark
          ? `bg-black/25 backdrop-blur-sm ${active ? 'border-emerald-500/50 ring-1 ring-emerald-500/25' : 'border-white/10'}`
          : `bg-white ${active ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-emerald-900/8'}`
      }`}
    >
      {active && (
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-600 grid place-items-center shadow-sm">
          <CheckCircle2 size={11} className="text-white" />
        </span>
      )}

      {readOnly ? (
        <span className={`absolute top-2.5 right-2.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full leading-tight ${
          isDark ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                 : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
        }`}>
          Built-in
        </span>
      ) : (
        <button onClick={onDelete} title="Delete"
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-emerald-900/20 hover:text-rose-500 hover:bg-rose-50 transition">
          <Trash2 size={12} />
        </button>
      )}

      {/* Row: avatar + play button + name */}
      <div className="flex items-center gap-3 pr-6">
        <div className="shrink-0">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${g} flex items-center justify-center ring-2 ring-white shadow-md`}>
            <span className="text-white text-sm font-bold">{initials || '?'}</span>
          </div>
        </div>

        {/* Play button — sits between avatar and name */}
        <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }} onClick={onPlay}
          className={`shrink-0 w-8 h-8 rounded-full grid place-items-center shadow-md transition-all
            ${isPlaying
              ? 'bg-emerald-500 text-white ring-2 ring-emerald-300/60 shadow-emerald-400/40'
              : isDark
              ? 'bg-white/10 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-white/20'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'}`}
        >
          {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-px" />}
        </motion.button>

        <div className="min-w-0 flex-1">
          <h4 className={`font-bold text-sm leading-tight truncate pr-2 ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>{meta.name}</h4>
          <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-emerald-400/55' : 'text-emerald-900/35'}`}>{formatClock(meta.durationSec)}</p>
        </div>
      </div>

      {/* Before / After — only revealed after "Select to Play" is tapped */}
      <div className="mt-3">
        {!showQueueBtns ? (
          <button
            onClick={() => setQueueOpen(true)}
            className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition border ${
              isDark
                ? 'border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/40'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            + Select to Play
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleBefore}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition ${
                isBefore
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-emerald-400 border border-white/10 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
              }`}
            >
              ⏮ Before
            </button>
            <button
              onClick={onToggleAfter}
              className={`py-1.5 rounded-lg text-[11px] font-bold transition ${
                isAfter
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-emerald-400 border border-white/10 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
              }`}
            >
              After ⏭
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Item = {
  id: string; name: string; subtitle: string; region: string;
  lang: string; style: string; duration: string; art: string; accent: string;
  badge?: 'popular' | 'new'; tags?: string[]; isCustom: boolean; defaultPick?: boolean;
  remoteUrl?: string;   // set for backend-synced customs — played directly from this URL
};

const AZAN_AYAH: Record<string, string> = {
  en: 'O you who have believed, when the call to prayer is made on Friday, then proceed to the remembrance of Allah.',
  ar: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا نُودِىَ لِلصَّلَوٰةِ مِن يَوْمِ ٱلْجُمُعَةِ فَٱسْعَوْا۟ إِلَىٰ ذِكْرِ ٱللَّهِ',
  ur: 'اے ایمان والو! جب جمعہ کے دن نماز کے لیے اذان دی جائے تو اللہ کے ذکر کی طرف دوڑو۔',
  tr: 'Ey iman edenler! Cuma günü namaza çağrıldığınızda Allah\'ın zikrine koşun.',
  hi: 'ऐ ईमान लाने वालो! जब जुमे के दिन नमाज़ के लिए पुकारा जाए तो अल्लाह के ज़िक्र की तरफ दौड़ो।',
  bn: 'হে মুমিনগণ! জুমআর দিনে সালাতের জন্য আহ্বান করা হলে আল্লাহর স্মরণে ছুটে যাও।',
  fr: "Ô vous qui croyez ! Quand on appelle à la prière du vendredi, accourez au rappel d'Allah.",
  zh: '信士们啊！当聚礼日宣礼时，你们当赶快去记念真主。',
  id: 'Wahai orang-orang beriman! Apabila dipanggil untuk shalat Jumat, bersegeralah mengingat Allah.',
  ps: 'اې مؤمنانو! چې جمعې ورځ د لمانځه لپاره اذان ووایل شي نو د الله د ذکر خوا ته وسپاریئ.',
};

export default function AzanPage() {
  const loc = useStoredLocation();
  const { isDark } = useTheme();
  const [language] = useLocalStorage<string>('isa:language', 'en');

  const [activeId, setActiveId]   = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useLocalStorage<string>('isa:azanVoice', 'azan-best-sound-quality');
  const [autoplay, setAutoplay]   = useLocalStorage<boolean>('isa:azanAutoplay', true);
  const [favorites, setFavorites] = useLocalStorage<string[]>('isa:azanFavorites', []);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-dismiss the error popup after 7 s.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 7000);
    return () => clearTimeout(t);
  }, [error]);

  // Smart Azan Settings (persisted) — the first maps to the real auto-azan flag.
  const [diffVoices, setDiffVoices] = useLocalStorage<boolean>('isa:azanDiffVoices', false);
  const [volAuto, setVolAuto]       = useLocalStorage<boolean>('isa:azanVolAuto', true);
  const [weekend, setWeekend]       = useLocalStorage<boolean>('isa:azanWeekend', false);

  // Toolbar state
  const [query, setQuery]   = useState('');
  const [langF, setLangF]   = useState('All Languages');
  const [styleF, setStyleF] = useState('All Styles');
  const [sortBy, setSortBy] = useState<'default' | 'popular' | 'name' | 'duration'>('default');
  const [showAllCards, setShowAllCards] = useState(false);
  const [view, setView]     = useState<'grid' | 'list'>('grid');

  // Custom uploads
  const [customAzans, setCustomAzans] = useLocalStorage<CustomAzan[]>('isa:customAzans', []);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const customUrlRef = useRef<string | null>(null);

  // Built-in voices the user has hidden (deleted)
  const [hiddenVoices, setHiddenVoices] = useLocalStorage<string[]>('isa:hiddenVoices', []);

  // Durood Sharif & Dua supplementary selections (optional).
  const [duroodId,  setDuroodId]  = useLocalStorage<string | null>('isa:duroodId',  null);
  const [duroodPos, setDuroodPos] = useLocalStorage<SuppPos>('isa:duroodPos', 'after');
  const [duaId,     setDuaId]     = useLocalStorage<string | null>('isa:duaId',    null);
  const [duaPos,    setDuaPos]    = useLocalStorage<SuppPos>('isa:duaPos',    'after');

  // User-uploaded supplementary clips
  const [customDuroods, setCustomDuroods] = useLocalStorage<CustomAzan[]>('isa:customDuroods', []);
  const [customDuas,    setCustomDuas]    = useLocalStorage<CustomAzan[]>('isa:customDuas',    []);

  // Durood is only shown for Hanafi fiqh (or when no fiqh is selected yet).
  const [fiqh] = useLocalStorage<string | null>('isa:fiqh', null);
  const showDurood = !fiqh || fiqh === '' || fiqh === 'hanafi';

  // Ramadan mode
  const [ramadanMode, setRamadanMode] = useLocalStorage<boolean>('isa:ramadanMode', false);

  // Multi-select before/after Azan queues (also read by the Settings page)
  const [preAzanQueue,  setPreAzanQueue]  = useLocalStorage<{id:string;name:string;audioType:string}[]>('isa:preAzanQueue',  []);
  const [postAzanQueue, setPostAzanQueue] = useLocalStorage<{id:string;name:string;audioType:string}[]>('isa:postAzanQueue', []);

  const togglePreAzan = (item: CustomAzan) =>
    setPreAzanQueue(prev =>
      prev.some(x => x.id === item.id)
        ? prev.filter(x => x.id !== item.id)
        : [...prev, { id: item.id, name: item.name, audioType: item.audioType ?? 'dua' }]
    );

  const togglePostAzan = (item: CustomAzan) =>
    setPostAzanQueue(prev =>
      prev.some(x => x.id === item.id)
        ? prev.filter(x => x.id !== item.id)
        : [...prev, { id: item.id, name: item.name, audioType: item.audioType ?? 'dua' }]
    );

  // Upload type picker state
  const [uploadType, setUploadType] = useState<AudioType | null>(null);
  const [typePicker, setTypePicker] = useState(false);

  // Azan trimmer — trim any existing voice and save as a new custom clip
  const [trimmingItem, setTrimmingItem] = useState<TrimTarget | null>(null);

  // Toast shown after a delete action.
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  useEffect(() => {
    if (!deleteToast) return;
    const t = setTimeout(() => setDeleteToast(null), 3000);
    return () => clearTimeout(t);
  }, [deleteToast]);

  // Azan editor (add intro / outro to an existing voice)
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editorExtraFile, setEditorExtraFile] = useState<File | null>(null);
  const [editorExtraBuffer, setEditorExtraBuffer] = useState<AudioBuffer | null>(null);
  const [editorExtraPos, setEditorExtraPos] = useState<'start' | 'end'>('start');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const editorFileRef = useRef<HTMLInputElement>(null);
  const revokeCustomUrl = () => {
    if (customUrlRef.current) { URL.revokeObjectURL(customUrlRef.current); customUrlRef.current = null; }
  };

  // Community uploads fetched from cloud storage — visible to ALL users on every device.
  const [remoteCustoms,   setRemoteCustoms]   = useState<{ id: string; name: string; url: string; durationMs: number }[]>([]);
  const [communityDuroods, setCommunityDuroods] = useState<CustomAzan[]>([]);
  const [communityDuas,    setCommunityDuas]    = useState<CustomAzan[]>([]);

  useEffect(() => {
    // Supabase community uploads — visible to ALL users on every device.
    // Fall back to the legacy backend only when Supabase is not configured.
    const loadAzans = async () => {
      if (isCommunityEnabled()) {
        try {
          const rows = await fetchCommunityUploads('azan');
          const customs = rows.map((r) => ({ id: r.id, name: r.name, url: r.public_url, durationMs: r.duration_sec * 1000 }));
          setRemoteCustoms(customs);
          customs.forEach((c) => saveRemoteUrl(c.id, c.url));
        } catch { /* fetch failed — leave state empty */ }
        return;
      }
      // Legacy backend fallback (only when Supabase is not configured)
      Azan.voices()
        .then((vs) => {
          const customs = vs
            .filter((v) => v.is_custom && v.audio_url)
            .map((v) => ({ id: v.id, name: v.name, url: v.audio_url, durationMs: v.duration_ms }));
          setRemoteCustoms(customs);
          customs.forEach((c) => saveRemoteUrl(c.id, c.url));
        })
        .catch(() => {});
    };

    const loadDuroods = async () => {
      try {
        const rows = await fetchCommunityUploads('durood');
        const clips = rows.map((r) => ({
          id: r.id, name: r.name,
          createdAt: new Date(r.created_at).getTime(),
          durationSec: r.duration_sec,
          audioType: 'durood' as const,
          remoteUrl: r.public_url,
        }));
        setCommunityDuroods(clips);
        clips.forEach((c) => saveRemoteUrl(c.id, c.remoteUrl!));
      } catch { /* Supabase not configured */ }
    };

    const loadDuas = async () => {
      try {
        const rows = await fetchCommunityUploads('dua');
        const clips = rows.map((r) => ({
          id: r.id, name: r.name,
          createdAt: new Date(r.created_at).getTime(),
          durationSec: r.duration_sec,
          audioType: 'dua' as const,
          remoteUrl: r.public_url,
        }));
        setCommunityDuas(clips);
        clips.forEach((c) => saveRemoteUrl(c.id, c.remoteUrl!));
      } catch { /* Supabase not configured */ }
    };

    loadAzans();
    loadDuroods();
    loadDuas();
  }, []);

  // Real-time subscription: when another browser uploads an azan, add it to
  // remoteCustoms immediately so users don't need to refresh the page.
  useEffect(() => {
    const unsubAzan = subscribeToUploads('azan', (upload) => {
      const item = { id: upload.id, name: upload.name, url: upload.public_url, durationMs: upload.duration_sec * 1000 };
      saveRemoteUrl(item.id, item.url);
      setRemoteCustoms((prev) => prev.some((c) => c.id === item.id) ? prev : [item, ...prev]);
    });
    const unsubDurood = subscribeToUploads('durood', (upload) => {
      const clip = { id: upload.id, name: upload.name, createdAt: new Date(upload.created_at).getTime(), durationSec: upload.duration_sec, audioType: 'durood' as const, remoteUrl: upload.public_url };
      saveRemoteUrl(clip.id, clip.remoteUrl!);
      setCommunityDuroods((prev) => prev.some((c) => c.id === clip.id) ? prev : [clip, ...prev]);
    });
    const unsubDua = subscribeToUploads('dua', (upload) => {
      const clip = { id: upload.id, name: upload.name, createdAt: new Date(upload.created_at).getTime(), durationSec: upload.duration_sec, audioType: 'dua' as const, remoteUrl: upload.public_url };
      saveRemoteUrl(clip.id, clip.remoteUrl!);
      setCommunityDuas((prev) => prev.some((c) => c.id === clip.id) ? prev : [clip, ...prev]);
    });
    return () => { unsubAzan(); unsubDurood(); unsubDua(); };
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
    if (loadingId === v.id) return;
    setLoadingId(v.id);
    revokeCustomUrl();
    el.src = availability[v.id] ? v.local : v.remote;
    el.play().then(() => { setActiveId(v.id); setLoadingId(null); })
      .catch((e) => { setActiveId(null); setLoadingId(null); setError(`Couldn't play ${v.name}: ${e?.message ?? 'browser blocked playback'}`); });
  };

  const previewCustom = async (meta: CustomAzan) => {
    const el = audioRef.current;
    if (!el) return;
    setError(null);
    if (activeId === meta.id) { el.pause(); setActiveId(null); return; }
    if (loadingId === meta.id) return;
    setLoadingId(meta.id);
    el.pause();
    revokeCustomUrl();
    const url = await customAzanUrl(meta.id);
    if (!url) { setLoadingId(null); setError(`"${meta.name}" couldn't be found in this browser's storage.`); return; }
    customUrlRef.current = url;
    el.src = url;
    el.play().then(() => { setActiveId(meta.id); setLoadingId(null); })
      .catch((e) => { setActiveId(null); setLoadingId(null); setError(`Couldn't play ${meta.name}: ${e?.message ?? 'browser blocked playback'}`); });
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

  const deleteItem = async (item: Item) => {
    if (item.isCustom) {
      await deleteCustom(item.id);
    } else {
      if (activeId === item.id) { audioRef.current?.pause(); setActiveId(null); }
      if (selectedId === item.id) setSelectedId('makkah');
      setHiddenVoices((prev) => [...prev, item.id]);
    }
    setDeleteToast(item.name);
  };

  const openTrimmer = (item: Item) => {
    const v = VOICES.find((x) => x.id === item.id);
    setTrimmingItem({
      id: item.id,
      name: item.name,
      local: v?.local,
      remote: v?.remote ?? item.remoteUrl,
      badge: item.badge,
      tags: item.tags,
    });
  };

  const openEditor = (item: Item) => {
    setEditingItem(item);
    setEditorExtraFile(null);
    setEditorExtraBuffer(null);
    setEditorExtraPos('start');
    setEditorError(null);
    setEditorSaving(false);
  };

  const onEditorFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setEditorExtraFile(file);
    setEditorError(null);
    try {
      const buf = await decodeAudioFile(file);
      setEditorExtraBuffer(buf);
    } catch {
      setEditorError('Could not decode this file. Try mp3, wav, or m4a.');
      setEditorExtraBuffer(null);
    }
  };

  const saveEdited = async () => {
    if (!editingItem || !editorExtraBuffer) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      let originalBuffer: AudioBuffer;
      if (editingItem.isCustom) {
        const blob = await getAzanClip(editingItem.id);
        if (!blob) throw new Error('Original audio not found in local storage');
        originalBuffer = await decodeAudioFile(new File([blob], 'original', { type: blob.type }));
      } else {
        const voice = VOICES.find((v) => v.id === editingItem.id);
        const url = voice ? (availability[voice.id] ? voice.local : voice.remote) : null;
        if (!url) throw new Error('Could not locate the original audio');
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to download the original audio');
        const blob = await resp.blob();
        originalBuffer = await decodeAudioFile(new File([blob], 'original', { type: blob.type || 'audio/mpeg' }));
      }
      const main: WavSegment = { buffer: originalBuffer, startSec: 0, endSec: originalBuffer.duration };
      const extra: WavSegment = { buffer: editorExtraBuffer, startSec: 0, endSec: editorExtraBuffer.duration };
      const segments = editorExtraPos === 'start' ? [extra, main] : [main, extra];
      const wavBlob = encodeWavFromSegments(segments);
      const totalDuration = originalBuffer.duration + editorExtraBuffer.duration;
      // Upload first to get the backend ID; fall back to a local-only ID if offline.
      let newId = `custom:${crypto.randomUUID()}`;
      let newRemoteUrl: string | undefined;
      try {
        const remote = await Azan.uploadVoice(wavBlob, { name: editingItem.name, durationMs: Math.round(totalDuration * 1000) });
        newId = remote.id;
        newRemoteUrl = remote.audio_url || undefined;
      } catch { /* offline — proceed with local-only ID */ }

      await putAzanClip(newId, wavBlob);
      if (newRemoteUrl) saveRemoteUrl(newId, newRemoteUrl);
      const newMeta: CustomAzan = { id: newId, name: editingItem.name, createdAt: Date.now(), durationSec: totalDuration, remoteUrl: newRemoteUrl };
      if (editingItem.isCustom) {
        await deleteAzanClip(editingItem.id);
        setCustomAzans((prev) => [newMeta, ...prev.filter((c) => c.id !== editingItem.id)]);
        setRemoteCustoms((prev) => prev.filter((c) => c.id !== editingItem.id));
        Azan.deleteVoice(editingItem.id).catch(() => {});
      } else {
        setHiddenVoices((prev) => [...prev, editingItem.id]);
        setCustomAzans((prev) => [newMeta, ...prev]);
      }
      if (selectedId === editingItem.id) setSelectedId(newId);
      setEditingItem(null);
    } catch (e: unknown) {
      setEditorError(e instanceof Error ? e.message : 'Failed to save modified audio');
    } finally {
      setEditorSaving(false);
    }
  };

  const onSaved = (meta: CustomAzan) => {
    if (uploadType === 'durood') {
      setCustomDuroods((prev) => [meta, ...prev]);
      if (!duroodId) setDuroodId(meta.id);
      // Refresh community duroods so the new upload shows without a page reload
      fetchCommunityUploads('durood').then((rows) => {
        const clips = rows.map((r) => ({
          id: r.id, name: r.name,
          createdAt: new Date(r.created_at).getTime(),
          durationSec: r.duration_sec,
          audioType: 'durood' as const,
          remoteUrl: r.public_url,
        }));
        setCommunityDuroods(clips);
        clips.forEach((c) => saveRemoteUrl(c.id, c.remoteUrl!));
      }).catch(() => {});
    } else if (uploadType === 'dua') {
      setCustomDuas((prev) => [meta, ...prev]);
      if (!duaId) setDuaId(meta.id);
      fetchCommunityUploads('dua').then((rows) => {
        const clips = rows.map((r) => ({
          id: r.id, name: r.name,
          createdAt: new Date(r.created_at).getTime(),
          durationSec: r.duration_sec,
          audioType: 'dua' as const,
          remoteUrl: r.public_url,
        }));
        setCommunityDuas(clips);
        clips.forEach((c) => saveRemoteUrl(c.id, c.remoteUrl!));
      }).catch(() => {});
    } else {
      setCustomAzans((prev) => [meta, ...prev]);
      // Refresh community azans so the new upload is visible immediately.
      fetchCommunityUploads('azan').then((rows) => {
        const customs = rows.map((r) => ({ id: r.id, name: r.name, url: r.public_url, durationMs: r.duration_sec * 1000 }));
        customs.forEach((c) => saveRemoteUrl(c.id, c.url));
        setRemoteCustoms(customs);
      }).catch(() => {
        // Supabase not configured — try legacy backend
        Azan.voices().then((vs) => {
          const customs = vs.filter((v) => v.is_custom && v.audio_url)
            .map((v) => ({ id: v.id, name: v.name, url: v.audio_url, durationMs: v.duration_ms }));
          customs.forEach((c) => saveRemoteUrl(c.id, c.url));
          setRemoteCustoms(customs);
        }).catch(() => {});
      });
    }
    setUploaderOpen(false);
    setUploadType(null);
  };

  const deleteDurood = async (id: string) => {
    if (activeId === id) { audioRef.current?.pause(); setActiveId(null); revokeCustomUrl(); }
    await deleteAzanClip(id);
    setCustomDuroods((prev) => prev.filter((c) => c.id !== id));
    setCommunityDuroods((prev) => prev.filter((c) => c.id !== id));
    deleteCommunityUpload(id, 'durood').catch(() => {});
    Azan.deleteVoice(id).catch(() => {});
    if (duroodId === id) setDuroodId(null);
    setPreAzanQueue(prev => prev.filter(x => x.id !== id));
    setPostAzanQueue(prev => prev.filter(x => x.id !== id));
    setDeleteToast('Durood deleted');
  };

  const deleteDua = async (id: string) => {
    if (activeId === id) { audioRef.current?.pause(); setActiveId(null); revokeCustomUrl(); }
    await deleteAzanClip(id);
    setCustomDuas((prev) => prev.filter((c) => c.id !== id));
    setCommunityDuas((prev) => prev.filter((c) => c.id !== id));
    deleteCommunityUpload(id, 'dua').catch(() => {});
    Azan.deleteVoice(id).catch(() => {});
    if (duaId === id) setDuaId(null);
    setPreAzanQueue(prev => prev.filter(x => x.id !== id));
    setPostAzanQueue(prev => prev.filter(x => x.id !== id));
    setDeleteToast('Dua deleted');
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
    if (loadingId === item.id) return;
    setLoadingId(item.id);
    el.pause();
    revokeCustomUrl();
    el.src = item.remoteUrl;
    el.play().then(() => { setActiveId(item.id); setLoadingId(null); })
      .catch((e) => { setActiveId(null); setLoadingId(null); setError(`Couldn't play ${item.name}: ${e?.message ?? 'playback blocked'}`); });
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
    const builtin: Item[] = VOICES
      .filter((v) => !hiddenVoices.includes(v.id))
      .map((v) => ({
        id: v.id, name: v.name, subtitle: v.subtitle, region: v.region,
        lang: v.lang, style: v.style, duration: v.duration, art: v.art,
        accent: v.accent, badge: v.badge, tags: v.tags, isCustom: false, defaultPick: v.defaultPick,
      }));
    const custom: Item[] = customAzans.map((c) => ({
      id: c.id, name: c.name, subtitle: 'Your upload', region: 'Custom',
      lang: 'Custom', style: 'Custom', duration: formatClock(c.durationSec),
      art: '/adhan/custom.svg', accent: 'from-violet-500 to-fuchsia-600', isCustom: true,
      badge: c.badge, tags: c.tags,
    }));
    // Backend-synced customs — skip any matching a local upload (same name +
    // duration) so the uploader's own clip isn't listed twice on this device.
    const localKeys = new Set(customAzans.map((c) => `${c.name}|${Math.round(c.durationSec)}`));
    const remote: Item[] = remoteCustoms
      .filter((r) => !localKeys.has(`${r.name}|${Math.round(r.durationMs / 1000)}`))
      .map((r) => ({
        id: r.id, name: r.name, subtitle: 'Synced upload', region: 'Custom',
        lang: 'Custom', style: 'Custom', duration: formatClock(Math.round(r.durationMs / 1000)),
        art: '/adhan/custom.svg', accent: 'from-violet-500 to-fuchsia-600', isCustom: true, remoteUrl: r.url,
      }));
    return [...builtin, ...custom, ...remote];
  }, [customAzans, remoteCustoms, hiddenVoices]);

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
      if (sortBy === 'default') return 0; // preserve VOICES array order
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
    { Icon: Clock,   title: 'Auto play before prayer', sub: '2 min before adhan',       on: autoplay,    set: () => setAutoplay(!autoplay) },
    { Icon: Volume2, title: 'Different voices',         sub: 'For each prayer',           on: diffVoices,  set: () => setDiffVoices(!diffVoices) },
    { Icon: Activity,title: 'Volume control',           sub: 'Auto adjust',               on: volAuto,     set: () => setVolAuto(!volAuto) },
    { Icon: Clock,   title: 'Weekend mode',             sub: 'Custom schedule',           on: weekend,     set: () => setWeekend(!weekend) },
    { Icon: Moon,    title: 'Ramadan mode',             sub: 'Suhoor & Iftar duas',       on: ramadanMode, set: () => setRamadanMode(!ramadanMode) },
  ];

  // Name of whichever audio item is currently playing (azan / durood / dua).
  const nowPlayingName = useMemo(() => {
    if (!activeId) return null;
    const fromAll = allItems.find((it) => it.id === activeId)?.name;
    if (fromAll) return fromAll;
    return (
      [...BUILT_IN_DUROODS, ...customDuroods, ...communityDuroods].find((c) => c.id === activeId)?.name ??
      [...BUILT_IN_DUAS, ...customDuas, ...communityDuas].find((c) => c.id === activeId)?.name ??
      null
    );
  }, [activeId, allItems, customDuroods, customDuas]);

  return (
    <div
      className="-m-5 sm:-m-8 min-h-full"
      style={isDark ? { background: '#070b09' } : undefined}
    >

      {/* ── Now-Playing pill (top-right, fixed) ── */}
      <AnimatePresence>
        {activeId && nowPlayingName && (
          <motion.div
            key="now-playing"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed top-4 right-4 z-[300] flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-white/95 backdrop-blur-lg shadow-xl shadow-emerald-900/15 px-4 py-3 max-w-[280px]"
          >
            {/* animated speaker dot */}
            <span className="relative shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
              <motion.span
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500 opacity-40"
              />
              <Volume2 size={14} className="relative text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none">Now Playing</p>
              <p className="text-sm font-bold text-emerald-950 leading-snug mt-0.5 truncate">{nowPlayingName}</p>
            </div>
            <button
              onClick={() => { audioRef.current?.pause(); setActiveId(null); }}
              title="Stop"
              className="shrink-0 w-8 h-8 rounded-full border border-emerald-100 hover:border-rose-200 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 grid place-items-center transition"
            >
              <Square size={13} fill="currentColor" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ HEADER ════════ — same appearance in both light and dark mode */}
      <header className="relative overflow-hidden min-h-[374px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{ objectPosition: 'center 30%' }}
        />

        <div className="relative px-5 sm:px-8 pt-8 pb-10">
          {/* — title row — */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
                <Bell size={12} /> Azan Voices
              </span>
              <div className="mt-4 w-fit rounded-2xl border border-white/60 bg-white/60 px-4 py-2 backdrop-blur-sm">
                <h1 className="font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] whitespace-nowrap text-black">
                  Azan Voices
                </h1>
              </div>
              <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
                <p className="text-base sm:text-lg leading-relaxed text-black/85">
                  Beautiful voices for every prayer time. Choose your favorite and set it as your Azan.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setTypePicker(true)}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-white/90 backdrop-blur border border-emerald-200 text-emerald-800 shadow-md hover:bg-white transition"
                  >
                    <UploadCloud size={16} /> Upload
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setAutoplay(!autoplay)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition
                      ${autoplay ? 'bg-emerald-600 text-white shadow-glow-emerald hover:bg-emerald-700' : 'bg-white/90 backdrop-blur border border-emerald-200 text-emerald-800 hover:bg-white'}`}
                  >
                    {autoplay ? <><BellRing size={16} /> Auto-Azan: ON</> : <><BellOff size={16} /> Auto-Azan: OFF</>}
                  </motion.button>
                  {/* Pick which output(s) the Adhan plays on when a prayer time arrives */}
                  <AzanDeviceMenu />
                </div>
              </div>
            </div>

            {/* right: Azan ayah */}
            <div className="hidden md:block" style={{ maxWidth: '360px' }}>
              <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                      ٩
                    </span>
                    <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                      يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا نُودِىَ لِلصَّلَوٰةِ مِن يَوْمِ ٱلْجُمُعَةِ فَٱسْعَوْا۟ إِلَىٰ ذِكْرِ ٱللَّهِ
                    </p>
                  </div>
                  <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                    {AZAN_AYAH[language] ?? AZAN_AYAH.en}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-Jumu&apos;ah (62:9)</p>
                </div>
              </div>
            </div>
          </div>

          {/* — feature + qibla row — */}
          <div className="mt-5 flex flex-wrap gap-3">
            {FEATURES.map(({ Icon, title, sub }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-sm px-3.5 py-3"
              >
                <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-black leading-none">{title}</p>
                  <p className="text-[11px] text-black/55 mt-1 leading-none truncate">{sub}</p>
                </div>
              </motion.div>
            ))}

            {/* Qibla direction chip */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }}
              whileHover={{ y: -3 }}
              className="flex items-center gap-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-sm px-3.5 py-3"
            >
              <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Compass size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-black/55 uppercase tracking-wide font-semibold leading-none">Qibla Direction</p>
                <p className="text-sm font-bold text-black leading-tight mt-0.5">
                  {qibBearing != null ? `${Math.round(qibBearing)}°` : '—'}
                  <span className="text-black/55 font-medium text-xs"> from your location</span>
                </p>
              </div>
              <Link href="/dashboard/qibla"
                className="ml-1 inline-flex items-center rounded-full bg-white/90 border border-emerald-200 text-emerald-800 font-semibold text-xs px-3 py-1.5 hover:bg-white transition shadow-sm">
                View on Map
              </Link>
            </motion.div>

            {/* Current location chip */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
              whileHover={{ y: -3 }}
              className="flex items-center gap-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 shadow-sm px-3.5 py-3"
            >
              <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <MapPin size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-black/55 uppercase tracking-wide font-semibold leading-none">Current Location</p>
                <p className="text-sm font-bold text-black leading-tight mt-0.5 truncate">{loc.hasCoords ? loc.label : 'Not set'}</p>
              </div>
              <Link href="/dashboard/prayer-times"
                className="ml-1 inline-flex items-center rounded-full border border-emerald-200 text-emerald-800 bg-white/80 font-semibold text-xs px-3 py-1.5 hover:bg-white transition">
                Change
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ════════ CONTENT ════════ — theme classes applied here only, not to header */}
      <ContentBackdrop isDark={isDark}>
      <div className={isDark ? 'azan-dark text-parchment' : 'text-ink page-light'}>
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
            value={sortBy === 'default' ? 'Default Order' : sortBy === 'popular' ? 'Sort by Popular' : sortBy === 'name' ? 'Sort by Name' : 'Sort by Duration'}
            options={['Default Order', 'Sort by Popular', 'Sort by Name', 'Sort by Duration']}
            onChange={(v) => setSortBy(v.includes('Name') ? 'name' : v.includes('Duration') ? 'duration' : v.includes('Popular') ? 'popular' : 'default')}
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
          <div className="xl:col-span-3 space-y-5">
            <div className={`grid gap-4 ${view === 'grid' ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
            <AnimatePresence mode="popLayout">
              {(showAllCards ? filtered : filtered.slice(0, 6)).map((item, i) => {
                const isPlaying  = activeId  === item.id;
                const isLoading  = loadingId === item.id;
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
                    {/* badge + extra tags */}
                    {(item.badge || item.tags?.length) && (
                      <div className="absolute -top-2.5 left-5 flex gap-1.5 flex-wrap">
                        {item.badge && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm
                            ${item.badge === 'popular' ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-amber-950'}`}>
                            {item.badge === 'popular' ? '★ Popular' : 'New'}
                          </span>
                        )}
                        {item.tags?.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                            🎧 {tag}
                          </span>
                        ))}
                      </div>
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
                      <div className="shrink-0">
                        <div className={`w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br ${item.accent}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.art} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="min-w-0 pt-1">
                        <h3 className="font-bold text-emerald-950 leading-tight truncate">{item.name}</h3>
                        <p className="text-sm text-emerald-900/60 truncate">{item.subtitle}</p>
                        <p className="text-xs text-emerald-900/40 mt-0.5">{item.lang} • {item.region}</p>
                      </div>
                    </div>

                    {/* waveform row — play button sits LEFT of the wave */}
                    <div className="mt-4 flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: isLoading ? 1 : 1.13 }}
                        whileTap={{ scale: isLoading ? 1 : 0.9 }}
                        onClick={() => playItem(item)}
                        disabled={isLoading}
                        className={`shrink-0 w-9 h-9 rounded-full grid place-items-center shadow-md transition-all
                          ${isPlaying
                            ? 'bg-emerald-500 text-white shadow-emerald-400/50 ring-2 ring-emerald-300/60'
                            : isLoading
                            ? 'bg-emerald-100 text-emerald-400 cursor-default'
                            : isDark
                            ? 'bg-white/10 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-white/20 hover:border-emerald-500 hover:shadow-emerald-600/40'
                            : 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-500 hover:shadow-emerald-500/30'}`}
                      >
                        {isLoading  ? <Loader2 size={14} className="animate-spin" />
                         : isPlaying ? <Pause size={14} fill="currentColor" />
                         : <Play size={14} fill="currentColor" className="ml-0.5" />}
                      </motion.button>
                      <Waveform id={item.id} playing={isPlaying} />
                      <span className="text-xs font-mono text-emerald-900/50 shrink-0">{item.duration}</span>
                    </div>

                    {/* actions */}
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <button onClick={() => toggleFav(item.id)} title="Favorite"
                        className={`w-10 h-10 grid place-items-center rounded-full border transition shrink-0
                          ${isFav ? 'bg-rose-50 border-rose-200 text-rose-500' : 'border-emerald-900/10 text-emerald-900/40 hover:text-rose-500 hover:border-rose-200'}`}>
                        <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => downloadItem(item)} title="Download"
                        className="w-10 h-10 grid place-items-center rounded-full border border-emerald-900/10 text-emerald-900/40 hover:text-emerald-700 hover:border-emerald-300 transition shrink-0">
                        <Download size={16} />
                      </button>
                      <button onClick={() => openEditor(item)} title="Add intro / outro"
                        className="w-10 h-10 grid place-items-center rounded-full border border-emerald-900/10 text-emerald-900/40 hover:text-emerald-700 hover:border-emerald-300 transition shrink-0">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openTrimmer(item)} title="Trim"
                        className="w-10 h-10 grid place-items-center rounded-full border border-emerald-900/10 text-emerald-900/40 hover:text-emerald-700 hover:border-emerald-300 transition shrink-0">
                        <Scissors size={15} />
                      </button>
                      <button onClick={() => deleteItem(item)} title="Delete"
                        className="w-10 h-10 grid place-items-center rounded-full border border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0">
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => setSelectedId(item.id)}
                        className={`flex-1 min-w-[7rem] whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition
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

            {/* View All / Show Less button */}
            {filtered.length > 6 && (
              <div className="flex justify-center pt-1">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAllCards((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-white text-emerald-800 font-semibold text-sm px-6 py-3 shadow-sm hover:bg-emerald-50 transition"
                >
                  {showAllCards
                    ? <><BellOff size={16} /> Show less</>
                    : <><Sparkles size={16} /> View All {filtered.length} Voices</>}
                </motion.button>
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

        {/* ══════ Durood Sharif & Dua ══════ */}
        <div className="mt-8">
          <div className={`flex items-center gap-3 mb-5 rounded-2xl px-4 py-3 ${isDark ? '' : 'bg-emerald-50/60 border border-emerald-900/[0.05]'}`}>
            <span className="text-2xl select-none">🌿</span>
            <div>
              <h2 className={`font-display font-bold text-xl ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>
                Durood Sharif &amp; Dua
              </h2>
              <p className={`text-sm ${isDark ? 'text-emerald-100/55' : 'text-emerald-900/50'}`}>
                Optional — plays alongside your Azan automatically
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Durood panel — visible only for Hanafi or unset fiqh ── */}
            {showDurood && <div className={`rounded-3xl border p-5 shadow-sm ${isDark ? 'bg-black/35 backdrop-blur-md border-white/10' : 'bg-white border-emerald-900/8'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl select-none">📿</span>
                <h3 className={`font-bold text-base ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Durood Sharif</h3>
                {duroodId && (
                  <span className="ml-auto text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    Active
                  </span>
                )}
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-emerald-100/45' : 'text-emerald-900/50'}`}>
                Blessings upon the Prophet ﷺ — select each clip individually to play before or after Azan
              </p>

              {/* Active queue summary */}
              {(() => {
                const allDuroods = [...BUILT_IN_DUROODS, ...customDuroods, ...communityDuroods];
                const beforeCount = preAzanQueue.filter(x => allDuroods.some(d => d.id === x.id)).length;
                const afterCount  = postAzanQueue.filter(x => allDuroods.some(d => d.id === x.id)).length;
                return (beforeCount > 0 || afterCount > 0) ? (
                  <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                           : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <CheckCircle2 size={12} />
                    {beforeCount} before · {afterCount} after Azan active
                  </div>
                ) : null;
              })()}

              {/* Cards — built-ins first, then community uploads, then own uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {BUILT_IN_DUROODS.map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="emerald" readOnly
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => {}}
                    />
                  ))}
                  {communityDuroods
                    .filter((r) => !customDuroods.some((c) => c.id === r.id))
                    .map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="emerald" readOnly
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => {}}
                    />
                  ))}
                  {customDuroods.map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="emerald"
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => deleteDurood(track.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {customDuroods.length === 0 && communityDuroods.length === 0 && (
                <button
                  onClick={() => { setUploadType('durood'); setUploaderOpen(true); }}
                  className={`mt-3 w-full py-2 rounded-xl border-2 border-dashed text-xs font-semibold transition ${
                    isDark ? 'border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30'
                           : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  + Upload your own Durood
                </button>
              )}
            </div>}

            {/* ── Dua panel ── */}
            <div className={`rounded-3xl border p-5 shadow-sm ${isDark ? 'bg-black/35 backdrop-blur-md border-white/10' : 'bg-white border-emerald-900/8'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl select-none">🤲</span>
                <h3 className={`font-bold text-base ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Dua after Azan</h3>
                {duaId && (
                  <span className="ml-auto text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5">
                    Active
                  </span>
                )}
              </div>
              <p className={`text-xs mb-3 ${isDark ? 'text-emerald-100/45' : 'text-emerald-900/50'}`}>
                Supplication after the call to prayer — select each clip individually to play before or after Azan
              </p>

              {/* Active queue summary */}
              {(() => {
                const allDuas = [...BUILT_IN_DUAS, ...customDuas, ...communityDuas];
                const beforeCount = preAzanQueue.filter(x => allDuas.some(d => d.id === x.id)).length;
                const afterCount  = postAzanQueue.filter(x => allDuas.some(d => d.id === x.id)).length;
                return (beforeCount > 0 || afterCount > 0) ? (
                  <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-rose-900/30 text-rose-300 border border-rose-700/40'
                           : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <CheckCircle2 size={12} />
                    {beforeCount} before · {afterCount} after Azan active
                  </div>
                ) : null;
              })()}

              {/* Cards — built-ins first, then community uploads, then own uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {BUILT_IN_DUAS.map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="rose" readOnly
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => {}}
                    />
                  ))}
                  {communityDuas
                    .filter((r) => !customDuas.some((c) => c.id === r.id))
                    .map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="rose" readOnly
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => {}}
                    />
                  ))}
                  {customDuas.map((track) => (
                    <UploadedCard
                      key={track.id} meta={track} accent="rose"
                      isPlaying={activeId === track.id}
                      isBefore={preAzanQueue.some(x => x.id === track.id)}
                      isAfter={postAzanQueue.some(x => x.id === track.id)}
                      onPlay={() => previewCustom(track)}
                      onToggleBefore={() => togglePreAzan(track)}
                      onToggleAfter={() => togglePostAzan(track)}
                      onDelete={() => deleteDua(track.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {customDuas.length === 0 && communityDuas.length === 0 && (
                <button
                  onClick={() => { setUploadType('dua'); setUploaderOpen(true); }}
                  className={`mt-3 w-full py-2 rounded-xl border-2 border-dashed text-xs font-semibold transition ${
                    isDark ? 'border-rose-700/50 text-rose-400 hover:bg-rose-900/20'
                           : 'border-rose-200 text-rose-500 hover:bg-rose-50'
                  }`}
                >
                  + Upload your own Dua
                </button>
              )}
            </div>

          </div>
        </div>

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
        onEnded={() => { setActiveId(null); setLoadingId(null); revokeCustomUrl(); }}
        onError={() => { setActiveId(null); setLoadingId(null); revokeCustomUrl(); setError('Audio failed to load. Try a different voice or run download_assets.py for offline files.'); }}
      />

      {/* ── Delete success toast ── */}
      <AnimatePresence>
        {deleteToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed top-5 right-5 z-[300] flex items-center gap-3 rounded-2xl bg-white border border-emerald-200 shadow-xl px-4 py-3 max-w-xs"
          >
            <span className="inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 leading-tight truncate">{deleteToast}</p>
              <p className="text-xs text-emerald-700/65 leading-tight">Deleted successfully</p>
            </div>
            <button onClick={() => setDeleteToast(null)} className="ml-1 shrink-0 text-emerald-900/30 hover:text-emerald-700 transition">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Playback error popup ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 32, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 32, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed top-5 right-5 z-[299] w-[300px] rounded-2xl overflow-hidden shadow-2xl border border-rose-200 bg-white"
          >
            {/* coloured top strip */}
            <div className="flex items-center gap-2.5 bg-rose-500 px-4 py-3">
              <span className="w-7 h-7 shrink-0 grid place-items-center rounded-full bg-white/20">
                <AlertTriangle size={14} className="text-white" />
              </span>
              <p className="flex-1 text-sm font-bold text-white leading-tight">Playback Error</p>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss"
                className="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-white/15 text-white hover:bg-white/30 transition"
              >
                <X size={13} />
              </button>
            </div>
            {/* body */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-rose-800/80 leading-relaxed line-clamp-3">
                {/* strip raw URLs from the browser error message */}
                {error.replace(/https?:\/\/\S+/g, '').trim()}
              </p>
              <div className="flex items-start gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  Tap one voice at a time — wait for it to start before switching to another.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload type picker ── */}
      <AnimatePresence>
        {typePicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm"
              onClick={() => setTypePicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-[320px] rounded-3xl bg-white shadow-2xl ring-1 ring-black/[0.06] overflow-hidden"
            >
              <div className="bg-mosque-gradient px-6 py-5">
                <h3 className="font-display font-bold text-lg text-white">What are you uploading?</h3>
                <p className="text-white/65 text-sm mt-0.5">Choose the type of audio</p>
              </div>
              <div className="p-4 space-y-2.5">
                {([
                  { type: 'azan'   as AudioType, emoji: '🔔', label: 'Azan',          sub: 'Call to prayer audio'          },
                  { type: 'durood' as AudioType, emoji: '📿', label: 'Durood Sharif',  sub: 'Blessings on the Prophet ﷺ'  },
                  { type: 'dua'    as AudioType, emoji: '🤲', label: 'Dua',            sub: 'Supplication after Azan'      },
                ]).map(({ type, emoji, label, sub }) => (
                  <button
                    key={type}
                    onClick={() => { setUploadType(type); setTypePicker(false); setUploaderOpen(true); }}
                    className="w-full flex items-center gap-3.5 rounded-2xl border border-emerald-900/8 bg-emerald-50/40 px-4 py-3.5 text-left hover:bg-emerald-50 hover:border-emerald-300 transition"
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <div>
                      <p className="font-bold text-sm text-emerald-950">{label}</p>
                      <p className="text-xs text-emerald-900/55">{sub}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setTypePicker(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-900/45 hover:text-emerald-900/80 transition">
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AzanUploader
        open={uploaderOpen}
        onClose={() => { setUploaderOpen(false); setUploadType(null); }}
        onSaved={onSaved}
        audioType={uploadType ?? 'azan'}
      />

      <AzanTrimmer
        open={trimmingItem !== null}
        target={trimmingItem}
        onClose={() => setTrimmingItem(null)}
        onSaved={(meta, replacedId) => {
          setCustomAzans((prev) => {
            const filtered = replacedId && isCustomAzan(replacedId) ? prev.filter((x) => x.id !== replacedId) : prev;
            return [meta, ...filtered];
          });
          // If the original was a built-in voice, hide it from the list.
          if (replacedId && !isCustomAzan(replacedId)) {
            setHiddenVoices((prev) => prev.includes(replacedId) ? prev : [...prev, replacedId]);
          }
          // Sync remoteCustoms: remove replaced clip, add new one if it uploaded.
          if (replacedId && isCustomAzan(replacedId)) {
            setRemoteCustoms((prev) => prev.filter((c) => c.id !== replacedId));
          }
          if (meta.remoteUrl) {
            const item = { id: meta.id, name: meta.name, url: meta.remoteUrl, durationMs: meta.durationSec * 1000 };
            setRemoteCustoms((prev) => [item, ...prev.filter((c) => c.id !== meta.id)]);
          }
          setSelectedId(meta.id);
        }}
      />

      {/* ── Azan Editor modal — add intro / outro to any existing voice ── */}
      <input ref={editorFileRef} type="file" accept="audio/*" className="hidden" onChange={onEditorFilePick} />
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !editorSaving) setEditingItem(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-5"
            >
              {/* header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-emerald-950">Modify Azan Audio</h2>
                <button onClick={() => { if (!editorSaving) setEditingItem(null); }}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 transition">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-emerald-900/60">
                Editing: <span className="font-semibold text-emerald-900">{editingItem.name}</span>
              </p>

              {/* extra audio picker */}
              <div>
                <label className="block text-sm font-semibold text-emerald-900 mb-2">
                  Upload audio to add <span className="font-normal text-emerald-900/50">(mp3, wav, m4a…)</span>
                </label>
                <button
                  onClick={() => editorFileRef.current?.click()}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-emerald-200 px-4 py-3 text-sm text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition text-left"
                >
                  <UploadCloud size={18} className="shrink-0 text-emerald-500" />
                  <span className="truncate">{editorExtraFile ? editorExtraFile.name : 'Choose an audio file…'}</span>
                </button>
                {editorExtraBuffer && (
                  <p className="mt-1.5 text-xs text-emerald-600 font-medium">
                    ✓ Ready — {formatClock(editorExtraBuffer.duration)}
                  </p>
                )}
              </div>

              {/* position picker */}
              {editorExtraBuffer && (
                <div>
                  <label className="block text-sm font-semibold text-emerald-900 mb-2">Place the added audio at</label>
                  <div className="flex gap-3">
                    {(['start', 'end'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setEditorExtraPos(pos)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition
                          ${editorExtraPos === pos
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-glow-emerald'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'}`}
                      >
                        {pos === 'start' ? '⏮ Start (intro)' : 'End (outro) ⏭'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-emerald-900/50">
                    {editorExtraPos === 'start'
                      ? 'Added audio will play before the Azan begins.'
                      : 'Added audio will play after the Azan finishes.'}
                  </p>
                </div>
              )}

              {editorError && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">{editorError}</p>
              )}

              {/* footer buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { if (!editorSaving) setEditingItem(null); }}
                  disabled={editorSaving}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdited}
                  disabled={!editorExtraBuffer || editorSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition"
                >
                  {editorSaving ? 'Saving…' : 'Save & Replace'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>{/* end theme wrapper */}
      </ContentBackdrop>
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
