'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, Tablet, Monitor, Speaker, Headphones, Radio, Wifi, Globe2,
  Bluetooth, RefreshCw, Volume2, VolumeX, CheckCircle2, AlertTriangle, Info, Cast, Loader2,
  Star, Bell, Users, Download, Compass, ChevronRight, ChevronDown, Zap, Music2, Activity,
  MonitorSpeaker, MonitorSmartphone, Mic, X, Plus, Play, Pause, Trash2, Link2, WifiOff, LogIn,
  HelpCircle, Settings, ExternalLink,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useGoogleCast } from '@/lib/useGoogleCast';
import { useTheme } from '@/lib/ThemeContext';
import { ContentBackdrop } from '@/components/ContentBackdrop';
import { Devices, type BackendDevice } from '@/lib/api';
import { resolveAzanCastUrl, RECITATION_CAST_TEST_URL, azanLocalPath, azanVoiceName } from '@/lib/castAudioSources';
import { useDesktopDevices, type LanDevice } from '@/lib/useDesktopDevices';

// ── Types ─────────────────────────────────────────────────────────────────────

type DeviceMode = {
  deviceId: string;
  label: string;
  modeLabel: string;
  quality: number;
};

type DeviceGroup = {
  id: string;
  name: string;
  isBluetooth: boolean;
  isDefault: boolean;
  modes: DeviceMode[];
};

type DiagInfo = {
  ua: string; hasMediaDevices: boolean; hasEnumerate: boolean; hasSelectOutput: boolean;
  hasSetSinkId: boolean; totalDevices: number; byKind: Record<string, number>;
  rawOutputs: Array<{ id: string; label: string }>;
};

// ── Device dedup helpers ──────────────────────────────────────────────────────

function extractDeviceName(label: string): { name: string; modeLabel: string } {
  let s = label
    .replace(/\s*\(Bluetooth\)\s*/gi, '')
    .replace(/\s*\[Bluetooth\]\s*/gi, '')
    .trim();
  s = s.replace(/^(Default|Communications)\s*[-–]\s*/i, '').trim();

  const roleMatch = s.match(
    /^(Headphones?|Headset|Speakers?|Earbuds?|Earphones?)\s+\((.+)\)$/i,
  );
  if (roleMatch) {
    const inner = roleMatch[2];
    const modeWords = (
      inner.match(/\b(Stereo|Mono|Hands-Free|Hands Free|AG\s*Audio|HFP|A2DP|SCO)\b/gi) || []
    )
      .join(' ')
      .trim();
    const name = inner
      .replace(/\s*\b(Stereo|Mono|Hands-Free|Hands Free|AG\s*Audio|HFP|A2DP|SCO)\b\s*/gi, ' ')
      .trim();
    return { name: name || s, modeLabel: modeWords || roleMatch[1] };
  }
  return { name: s, modeLabel: 'Output' };
}

function modePriority(modeLabel: string): number {
  if (/stereo/i.test(modeLabel)) return 1;
  if (/headphones?/i.test(modeLabel)) return 2;
  if (/speakers?/i.test(modeLabel)) return 2;
  if (/headset/i.test(modeLabel)) return 3;
  if (/hands.free|ag.audio/i.test(modeLabel)) return 4;
  return 2;
}

function buildDeviceGroups(
  labelled: Array<{ deviceId: string; groupId: string; label: string }>,
): DeviceGroup[] {
  // Exclude virtual aliases (default/communications) when the same physical mode exists as a real entry
  const real = labelled.filter(
    (d) => d.deviceId !== 'default' && d.deviceId !== 'communications',
  );
  const realKeys = new Set(
    real.map((d) => {
      const { name, modeLabel } = extractDeviceName(d.label);
      return `${name.toLowerCase()}::${modeLabel.toLowerCase()}`;
    }),
  );
  const virtual = labelled
    .filter((d) => d.deviceId === 'default' || d.deviceId === 'communications')
    .filter((d) => {
      const { name, modeLabel } = extractDeviceName(d.label);
      return !realKeys.has(`${name.toLowerCase()}::${modeLabel.toLowerCase()}`);
    });

  const toProcess = [...real, ...virtual];

  // Group by extracted device name so one physical device = one card
  const nameMap = new Map<string, typeof toProcess>();
  toProcess.forEach((d) => {
    const { name } = extractDeviceName(d.label);
    const key = name.toLowerCase().trim();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(d);
  });

  return [...nameMap.entries()].map(([, devices]) => {
    const modes: DeviceMode[] = devices.map((d) => {
      const { name, modeLabel } = extractDeviceName(d.label);
      return {
        deviceId: d.deviceId,
        label: d.label,
        modeLabel,
        quality: modePriority(modeLabel),
      };
    });
    modes.sort((a, b) => a.quality - b.quality);
    const best = modes[0];
    const { name } = extractDeviceName(best.label);
    const isBT =
      /bluetooth/i.test(best.label) ||
      /airpod|g\d+\s*pro|jabra|jbl|bose|sony|beats|havit|edifier|anker|soundcore|skullcandy|sennheiser/i.test(
        name,
      );
    const isDefault = devices.some((d) => d.deviceId === 'default');
    return {
      id: devices[0].groupId || devices[0].deviceId || name,
      name: name || 'Audio Device',
      isBluetooth: isBT,
      isDefault,
      modes,
    };
  });
}

// ── OS detection ─────────────────────────────────────────────────────────────

type OS = 'windows' | 'macos' | 'linux' | 'unknown';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'unknown';
  const p = navigator.platform ?? '';
  const ua = navigator.userAgent;
  if (/Win/i.test(p) || /Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(p) || /Macintosh|MacIntel/i.test(ua)) return 'macos';
  if (/Linux/i.test(p) || /Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

function openOSBluetooth() {
  const os = detectOS();
  try {
    const eApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (os === 'windows') {
      // window.location.href would navigate the Electron window — use shell.openExternal or window.open instead.
      if (eApi && typeof eApi.openExternal === 'function') {
        eApi.openExternal('ms-settings:bluetooth');
      } else {
        window.open('ms-settings:bluetooth');
      }
    } else if (os === 'macos') {
      window.open('x-apple.systempreferences:com.apple.preferences.Bluetooth', '_blank');
    }
  } catch { /* OS may not support this URL scheme */ }
}

/** Open the OS network/Wi-Fi settings so the user can confirm the device and
 *  this computer are on the SAME Wi-Fi (the #1 reason a Cast device won't show). */
function openOSWifi() {
  const os = detectOS();
  try {
    const eApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    if (os === 'windows') {
      if (eApi && typeof eApi.openExternal === 'function') {
        eApi.openExternal('ms-settings:network-wifi');
      } else {
        window.open('ms-settings:network-wifi');
      }
    } else if (os === 'macos') {
      window.open('x-apple.systempreferences:com.apple.preference.network', '_blank');
    }
  } catch { /* OS may not support this URL scheme */ }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SPIN_MS = 900;

const ICON: Record<string, any> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor, speaker: Speaker, earbuds: Headphones,
  web: Globe2, google_home: MonitorSpeaker, alexa: Speaker,
};

// LAN device kinds discovered by the desktop app (mDNS / SSDP).
const LAN_KIND: Record<string, { icon: any; label: string }> = {
  chromecast: { icon: Cast,           label: 'Chromecast / Google Home' },
  dlna:       { icon: MonitorSpeaker, label: 'DLNA speaker / TV' },
  airplay:    { icon: MonitorSpeaker, label: 'AirPlay (Apple)' },
  alexa:      { icon: Speaker,        label: 'Amazon Alexa' },
};

// ── Linked-device helpers (GET /devices) ───────────────────────────────────────

const PLATFORM_LABEL: Record<BackendDevice['platform'], string> = {
  android: 'Android', ios: 'iOS', web: 'Web browser', windows: 'Windows',
  macos: 'macOS', linux: 'Linux', alexa: 'Amazon Alexa', google_home: 'Google Home',
};

/** Pick an icon for a backend device from its type, then platform. */
function deviceIcon(d: BackendDevice) {
  if (d.device_type === 'speaker') return d.platform === 'google_home' ? MonitorSpeaker : Speaker;
  return ICON[d.device_type] ?? ICON[d.platform] ?? Radio;
}

/** Best-effort identity of the current browser/desktop session, for "Link this device". */
function currentSessionDevice(): { device_type: BackendDevice['device_type']; platform: BackendDevice['platform']; name: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isElectron = /Electron/i.test(ua) || (typeof window !== 'undefined' && !!(window as any).electronAPI);
  const os = detectOS();
  const platform: BackendDevice['platform'] =
    os === 'windows' ? 'windows' : os === 'macos' ? 'macos' : os === 'linux' ? 'linux' : 'web';
  const device_type: BackendDevice['device_type'] = isElectron ? 'desktop' : 'web';
  const browser =
    /Edg/i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Browser';
  const osName = os === 'windows' ? 'Windows' : os === 'macos' ? 'macOS' : os === 'linux' ? 'Linux' : '';
  const name = isElectron ? `Desktop App${osName ? ` · ${osName}` : ''}` : `${browser}${osName ? ` · ${osName}` : ''}`;
  return { device_type, platform: isElectron ? platform : 'web', name };
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'unknown';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const QUICK_ACTIONS = [
  { Icon: Bell,       title: 'Daily Reminder',     sub: 'Never miss a recitation',  tint: 'bg-emerald-50 text-emerald-600', href: '/dashboard/recitation' },
  { Icon: Users,      title: 'Multiple Reciters',  sub: 'Voices you love',          tint: 'bg-violet-50 text-violet-600',   href: '/dashboard/azan-voices' },
  { Icon: Headphones, title: 'Background Play',    sub: 'Listen while you do more', tint: 'bg-amber-50 text-amber-600',     href: '/dashboard/azan-voices' },
  { Icon: Download,   title: 'Offline Listening',  sub: 'Download & listen',        tint: 'bg-sky-50 text-sky-600',         href: '/dashboard/azan-voices' },
  { Icon: Compass,    title: 'Qibla Direction',    sub: 'Stay connected',           tint: 'bg-rose-50 text-rose-500',       href: '/dashboard/qibla' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function beepDataUri(freq = 660, ms = 400, sampleRate = 44100): string {
  const samples = Math.floor((sampleRate * ms) / 1000);
  const dataSize = samples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const wr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  wr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); wr(8, 'WAVE');
  wr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  wr(36, 'data'); view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 1000, (samples - i) / 1000);
    const v = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.3 * fade;
    view.setInt16(44 + i * 2, v * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

// ── Animation sub-components ──────────────────────────────────────────────────

function FlowWave({ color, className = '' }: { color: string; className?: string }) {
  const pts = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const y =
        20 +
        Math.sin(i * 0.8) * 11 * Math.abs(Math.sin(i * 0.33 + 1)) +
        Math.sin(i * 1.9) * 3;
      arr.push(`${(i * 100) / 60},${y.toFixed(1)}`);
    }
    return arr.join(' ');
  }, []);
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-[200%] animate-marquee" style={{ animationDuration: '6s' }}>
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 100 40" preserveAspectRatio="none" className="w-1/2 h-full shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </div>
    </div>
  );
}

function HealthBars() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-8 rounded-full bg-emerald-500"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

function SignalBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-6">
      {[0.45, 0.65, 0.82, 1].map((h, i) => (
        <motion.span
          key={i}
          className="w-[3.5px] rounded-full bg-emerald-500"
          style={{ height: `${h * 100}%` }}
          animate={active ? { scaleY: [0.6, 1, 0.7, 1] } : { scaleY: 1 }}
          transition={active ? { duration: 1.1 + i * 0.15, repeat: Infinity, ease: 'easeInOut' } : {}}
        />
      ))}
    </div>
  );
}

function MiniEq() {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full bg-current"
          animate={{ height: ['35%', '100%', '50%'] }}
          transition={{ duration: 0.7 + i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ height: '40%' }}
        />
      ))}
    </div>
  );
}

function RadialGoal({ value, target, isDark }: { value: number; target: number; isDark: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <span
        className="absolute inset-2 rounded-full animate-pulse-soft"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)' }}
      />
      <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(6,95,70,0.12)'} strokeWidth="9" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-display font-bold text-2xl ${isDark ? 'text-white' : 'text-emerald-900'}`}>{value}</span>
        <span className={`text-[10px] mt-0.5 ${isDark ? 'text-white/50' : 'text-emerald-900/50'}`}>/ {target}</span>
      </div>
    </div>
  );
}

// ── Mic permission modal ──────────────────────────────────────────────────────

function MicPermModal({
  permState,
  onRequest,
  onDismiss,
  isDark,
}: {
  permState: 'prompt' | 'denied';
  onRequest: () => void;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const bg = isDark ? 'bg-[#0b1a12] border border-emerald-500/25' : 'bg-white';
  const heading = isDark ? 'text-parchment' : 'text-emerald-950';
  const sub = isDark ? 'text-parchment/60' : 'text-emerald-900/55';
  const inner = isDark ? 'bg-white/5 text-parchment/70' : 'bg-slate-50 text-slate-700';
  const dismiss = isDark ? 'text-parchment/40 hover:text-parchment/70' : 'text-emerald-900/40 hover:text-emerald-900/70';
  const closeBtn = isDark ? 'bg-white/8 text-parchment/50 hover:bg-white/15' : 'bg-slate-100 text-slate-400 hover:bg-slate-200';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 14 }}
        className={`relative w-full max-w-sm rounded-3xl p-7 shadow-2xl ${bg}`}
      >
        <button
          onClick={onDismiss}
          className={`absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full transition ${closeBtn}`}
        >
          <X size={15} />
        </button>
        <div className="flex flex-col items-center text-center gap-5">
          <span className={`w-16 h-16 text-3xl flex items-center justify-center rounded-2xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            {permState === 'denied' ? '🔒' : '🎤'}
          </span>
          {permState === 'prompt' ? (
            <>
              <div>
                <h2 className={`font-bold text-xl ${heading}`}>Allow Microphone Access</h2>
                <p className={`text-sm mt-2 leading-relaxed ${sub}`}>
                  To show real device names like <strong>&quot;G04 pro&quot;</strong>, we need mic access
                  once. The microphone closes immediately  -  no audio is ever captured or stored.
                </p>
              </div>
              <button
                onClick={onRequest}
                className="w-full rounded-2xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Mic size={18} /> Allow Access
              </button>
            </>
          ) : (
            <>
              <div>
                <h2 className={`font-bold text-xl ${heading}`}>Permission Blocked</h2>
                <p className={`text-sm mt-2 leading-relaxed ${sub}`}>
                  Microphone access was denied. Unblock it in one step:
                </p>
                <div className={`mt-3 text-left rounded-xl p-4 text-sm leading-loose ${inner}`}>
                  1. Click the <strong>🔒 lock icon</strong> in Chrome&apos;s address bar<br />
                  2. Set <strong>Microphone</strong> → <strong>Allow</strong><br />
                  3. Click <strong>Rescan</strong> on this page
                </div>
              </div>
            </>
          )}
          <button onClick={onDismiss} className={`text-sm transition ${dismiss}`}>
            {permState === 'denied' ? 'Close' : 'Skip for now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Add / connect device modal ────────────────────────────────────────────────

const OS_BT_LABEL: Record<OS, string> = {
  windows: 'Open Bluetooth Settings',
  macos:   'Open System Settings → Bluetooth',
  linux:   'Open Bluetooth Manager',
  unknown: 'Open Bluetooth Settings',
};

const LINUX_BT_STEPS = [
  { de: 'GNOME',  cmd: 'Settings → Bluetooth' },
  { de: 'KDE',    cmd: 'System Settings → Bluetooth' },
  { de: 'XFCE',   cmd: 'Run: blueman-manager' },
  { de: 'Ubuntu', cmd: 'Settings → Bluetooth' },
];

function AddDeviceModal({
  onClose,
  onPickAudio,
  pickerSupported,
  onRescan,
  isDark,
}: {
  onClose: () => void;
  onPickAudio: () => void;
  pickerSupported: boolean | null;
  onRescan: () => void;
  isDark: boolean;
}) {
  const os = detectOS();
  const bg = isDark ? 'bg-[#0b1a12] border border-emerald-500/25' : 'bg-white';
  const heading = isDark ? 'text-parchment' : 'text-emerald-950';
  const sub = isDark ? 'text-parchment/55' : 'text-emerald-900/55';
  const row = isDark ? 'border-emerald-500/15 hover:bg-emerald-500/5' : 'border-emerald-100 hover:bg-emerald-50';
  const closeBtn = isDark ? 'bg-white/8 text-parchment/50 hover:bg-white/15' : 'bg-slate-100 text-slate-400 hover:bg-slate-200';
  const innerBox = isDark ? 'bg-white/5 text-parchment/65' : 'bg-slate-50 text-slate-600';

  const alreadyPairedNote =
    os === 'windows' ? 'Already paired in Windows?'
    : os === 'macos' ? 'Already paired in macOS?'
    : 'Already paired in your system?';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 14 }}
        className={`relative w-full max-w-md rounded-3xl p-7 shadow-2xl ${bg}`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full transition ${closeBtn}`}
        >
          <X size={15} />
        </button>
        <h2 className={`font-bold text-xl mb-5 ${heading}`}>Connect an Audio Device</h2>
        <div className="space-y-3">

          {/* Browser native picker  -  Chrome 105+ */}
          {pickerSupported && (
            <button
              onClick={() => { onPickAudio(); onClose(); }}
              className={`w-full text-left rounded-2xl p-4 flex items-center gap-3 border transition ${row}`}
            >
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0">
                <Volume2 size={18} />
              </span>
              <div className="flex-1">
                <p className={`font-semibold ${heading}`}>Pick from device list</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Browser&apos;s built-in picker  -  shows all connected audio devices</p>
              </div>
              <ChevronRight size={18} className="text-emerald-500 shrink-0" />
            </button>
          )}

          {/* Bluetooth */}
          <div className={`rounded-2xl p-4 border ${isDark ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-100 bg-blue-50/50'}`}>
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-blue-600 text-white grid place-items-center shrink-0">
                <Bluetooth size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${heading}`}>Bluetooth Headset / Speaker</p>
                <p className={`text-xs mt-1 ${sub}`}>
                  {alreadyPairedNote} Make sure it&apos;s connected, then rescan.
                </p>
                <button
                  onClick={() => { onRescan(); onClose(); }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold px-3 py-2 hover:bg-emerald-700 transition"
                >
                  <RefreshCw size={13} /> Rescan now
                </button>

                {/* New device  -  OS-specific pairing */}
                <p className={`text-xs mt-3 ${sub}`}>New device? Pair it first:</p>

                {os === 'linux' ? (
                  /* Linux has no URL scheme  -  show inline steps */
                  <div className={`mt-2 rounded-xl p-3 text-xs leading-relaxed ${innerBox}`}>
                    <p className="font-semibold mb-1">Open your desktop&apos;s Bluetooth manager:</p>
                    {LINUX_BT_STEPS.map((s) => (
                      <p key={s.de} className="leading-loose">
                        <span className="font-semibold">{s.de}:</span> {s.cmd}
                      </p>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => { openOSBluetooth(); }}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold px-3 py-2 hover:bg-blue-700 transition"
                  >
                    <Bluetooth size={13} /> {OS_BT_LABEL[os]}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Wired / USB */}
          <div className={`rounded-2xl p-4 border ${isDark ? 'border-white/8 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${isDark ? 'bg-white/8 text-parchment/60' : 'bg-slate-200 text-slate-500'}`}>
                <Speaker size={18} />
              </span>
              <div>
                <p className={`font-semibold ${heading}`}>Wired / USB Device</p>
                <p className={`text-xs mt-0.5 ${sub}`}>Plug it in, then click Rescan  -  it appears automatically.</p>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const { isDark } = useTheme();

  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [pickerSupported, setPickerSupported] = useState<boolean | null>(null);
  const [enumPermission, setEnumPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [selectedOutputId, setSelectedOutputId] = useLocalStorage<string>('isa:audioOutput', '');
  const [selectedOutputLabel, setSelectedOutputLabel] = useLocalStorage<string>('isa:audioOutputLabel', 'System Default');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<DiagInfo | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [ayahFav, setAyahFav] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permModalState, setPermModalState] = useState<'prompt' | 'denied'>('prompt');
  const [showAddModal, setShowAddModal] = useState(false);

  const [listenLog] = useLocalStorage<{ ymd: string; seconds: number }>(
    'isa:listenLog',
    { ymd: '', seconds: 0 },
  );
  const minutesListened =
    listenLog.ymd === todayYMD() ? Math.floor(listenLog.seconds / 60) : 0;

  // ── Error toast (replaces silent errors and prevents the app from crashing) ──
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const showToast = (msg: string) => setToast({ msg, id: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast?.id]);

  const cast = useGoogleCast();
  const [castBusy, setCastBusy] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const [castNote, setCastNote] = useState<string | null>(null);
  const [showCastHelp, setShowCastHelp] = useState(false);
  const [selectedAzanVoice] = useLocalStorage<string>('isa:azanVoice', 'hafiz-ahmed-raza-qadri');

  // ── Desktop-only: real LAN devices (Chromecast / DLNA / AirPlay / Alexa) ──
  const lan = useDesktopDevices();
  const [castDeviceId, setCastDeviceId] = useLocalStorage<string>('isa:castDeviceId', '');
  const [, setCastDeviceName] = useLocalStorage<string>('isa:castDeviceName', '');
  const [lanVol, setLanVol] = useState(0.6);
  const [lanScanning, setLanScanning] = useState(false);

  // Bundled file path for the selected azan (served to the device over the LAN),
  // with a public stream as fallback if the device can't reach our LAN server.
  const azanLanSource = useMemo(() => {
    const path = azanLocalPath(selectedAzanVoice) ?? '/audio/azan/makkah.mp3';
    const name = azanVoiceName(selectedAzanVoice) ?? 'Makkah  -  Haramain';
    return { kind: 'lan' as const, path, title: `Adhan  -  ${name}`, fallbackUrl: resolveAzanCastUrl(selectedAzanVoice).url };
  }, [selectedAzanVoice]);

  // Multi-select: which devices are selected per purpose.
  const [azanDeviceIds, setAzanDeviceIds] = useLocalStorage<string[]>('isa:azanDeviceIds', []);
  const [recitationDeviceIds, setRecitationDeviceIds] = useLocalStorage<string[]>('isa:recitationDeviceIds', []);
  const [defaultDeviceIds, setDefaultDeviceIds] = useLocalStorage<string[]>('isa:defaultDeviceIds', []);

  const rescanLan = async () => {
    setLanScanning(true);
    const startedAt = Date.now();
    try {
      await lan.rescan();
    } catch (e: any) {
      showToast(`Rescan failed: ${e?.message ?? e}`);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      setLanScanning(false);
    }
  };

  const playAzanOnLan = (id: string) =>
    lan.play(id, azanLanSource).catch((e: any) => showToast(`Couldn't play Adhan: ${e?.message ?? e}`));
  const playRecitationOnLan = (id: string) =>
    lan.play(id, { kind: 'url', url: RECITATION_CAST_TEST_URL, title: 'Surah Al-Fatihah  -  Mishary Alafasy' })
      .catch((e: any) => showToast(`Couldn't play recitation: ${e?.message ?? e}`));
  const testSoundOnLan = (id: string) => {
    lan.play(id, { kind: 'url', url: RECITATION_CAST_TEST_URL, title: 'Test Sound' })
      .then(() => setTimeout(() => lan.stop(id).catch(() => {}), 3_000))
      .catch((e: any) => showToast(`Test sound failed: ${e?.message ?? e}`));
  };
  const setDefaultCastDevice = (d: LanDevice) => {
    if (castDeviceId === d.id) { setCastDeviceId(''); setCastDeviceName(''); }
    else { setCastDeviceId(d.id); setCastDeviceName(d.name); }
  };
  const toggleAzanDevice = (d: LanDevice) => {
    const next = azanDeviceIds.includes(d.id)
      ? azanDeviceIds.filter((x) => x !== d.id)
      : [...azanDeviceIds, d.id];
    setAzanDeviceIds(next);
    // Keep the primary single-device key in sync with the first selected device.
    const primary = next[0] ?? '';
    setCastDeviceId(primary);
    setCastDeviceName(primary ? (lan.devices.find((x) => x.id === primary)?.name ?? '') : '');
  };
  const toggleRecitationDevice = (id: string) => {
    setRecitationDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleDefaultDevice = (d: LanDevice) => {
    const isNowDefault = defaultDeviceIds.includes(d.id);
    if (isNowDefault) {
      setDefaultDeviceIds((prev) => prev.filter((x) => x !== d.id));
    } else {
      setDefaultDeviceIds((prev) => [...prev, d.id]);
      // Auto-select for both azan and recitation when set as default
      if (!azanDeviceIds.includes(d.id)) {
        const nextAzan = [...azanDeviceIds, d.id];
        setAzanDeviceIds(nextAzan);
        const primary = nextAzan[0] ?? '';
        setCastDeviceId(primary);
        setCastDeviceName(primary ? (lan.devices.find((x) => x.id === primary)?.name ?? '') : '');
      }
      if (!recitationDeviceIds.includes(d.id)) {
        setRecitationDeviceIds((prev) => [...prev, d.id]);
      }
    }
  };

  // ── Linked devices on the account (real, from the backend) ──
  const [linked, setLinked] = useState<BackendDevice[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(true);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  // Whether the last fetch was rejected for missing/invalid auth (vs a real error).
  const [needsAuth, setNeedsAuth] = useState(false);
  const [linking, setLinking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setPickerSupported(
      typeof navigator !== 'undefined' &&
        typeof (navigator.mediaDevices as any)?.selectAudioOutput === 'function',
    );
    refreshList();
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (md && typeof md.addEventListener === 'function') {
      const onChange = () => refreshList();
      md.addEventListener('devicechange', onChange);
      return () => md.removeEventListener('devicechange', onChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the account's linked devices from the backend on mount.
  useEffect(() => {
    fetchLinked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLinked = async () => {
    setLinkedError(null);
    setLinkedLoading(true);
    try {
      const list = await Devices.list();
      setLinked(Array.isArray(list) ? list : []);
      setNeedsAuth(false);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        // Not signed in  -  fold into the "No devices found" empty state (no scary error).
        setNeedsAuth(true);
        setLinked([]);
      } else {
        setLinkedError(
          e?.code === 'ERR_NETWORK'
            ? 'Could not reach the server to load your devices. Check your connection (or that the backend is running) and try again.'
            : `Couldn't load your devices: ${e?.response?.data?.message ?? e?.message ?? e}`,
        );
      }
    } finally {
      setLinkedLoading(false);
    }
  };

  const linkThisDevice = async () => {
    const me = currentSessionDevice();
    // The backend register endpoint always INSERTs (no upsert / unique constraint),
    // so guard against creating duplicate rows for a device that's already linked.
    const already = linked.some(
      (d) => d.device_type === me.device_type && d.platform === me.platform && (d.name ?? '') === me.name,
    );
    if (already) { setLinkedError('This device is already linked to your account.'); return; }
    setLinking(true);
    setLinkedError(null);
    try {
      await Devices.register(me);
      await fetchLinked();
    } catch (e: any) {
      const status = e?.response?.status;
      setLinkedError(
        status === 401 || status === 403
          ? 'Sign in to link this device to your account.'
          : `Couldn't link this device: ${e?.response?.data?.message ?? e?.message ?? e}`,
      );
    } finally {
      setLinking(false);
    }
  };

  const removeLinked = async (id: string) => {
    setRemovingId(id);
    setLinkedError(null);
    try {
      await Devices.remove(id);
      setLinked((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setLinkedError(`Couldn't remove that device: ${e?.response?.data?.message ?? e?.message ?? e}`);
    } finally {
      setRemovingId(null);
    }
  };

  const captureDiag = async () => {
    if (typeof navigator === 'undefined') return;
    const md = navigator.mediaDevices;
    const all =
      md && typeof md.enumerateDevices === 'function'
        ? await md.enumerateDevices().catch(() => [] as MediaDeviceInfo[])
        : ([] as MediaDeviceInfo[]);
    const byKind: Record<string, number> = {};
    all.forEach((d) => { byKind[d.kind] = (byKind[d.kind] ?? 0) + 1; });
    setDiag({
      ua: navigator.userAgent,
      hasMediaDevices: !!md,
      hasEnumerate: !!md && typeof md.enumerateDevices === 'function',
      hasSelectOutput: !!md && typeof (md as any).selectAudioOutput === 'function',
      hasSetSinkId: typeof (HTMLMediaElement.prototype as any).setSinkId === 'function',
      totalDevices: all.length,
      byKind,
      rawOutputs: all
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({ id: d.deviceId.slice(0, 12) + '…', label: d.label || '(label hidden)' })),
    });
  };

  const refreshList = async () => {
    setError(null);
    setScanning(true);
    const startedAt = Date.now();
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        setError("This browser doesn't support audio-device enumeration. Open the site in Chrome or Edge.");
        await captureDiag();
        return;
      }
      let devs = await navigator.mediaDevices.enumerateDevices();
      let outs = devs.filter((d) => d.kind === 'audiooutput');

      if (outs.length === 0 || outs.every((d) => !d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          devs = await navigator.mediaDevices.enumerateDevices();
          outs = devs.filter((d) => d.kind === 'audiooutput');
          setEnumPermission('granted');
        } catch {
          setEnumPermission('denied');
        }
      } else {
        setEnumPermission('granted');
      }

      let unlabeledIdx = 0;
      const labelled = outs.map((d) => {
        let label = d.label;
        if (!label) {
          if (d.deviceId === 'default') label = 'Default System Output';
          else if (d.deviceId === 'communications') label = 'Communications Device';
          else { unlabeledIdx++; label = `Audio Output ${unlabeledIdx}`; }
        }
        return { deviceId: d.deviceId, groupId: d.groupId, label };
      });

      setDeviceGroups(buildDeviceGroups(labelled));
      await captureDiag();
    } catch (e: any) {
      setError(`Couldn't list audio devices: ${e?.message ?? e}`);
      await captureDiag();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      setScanning(false);
    }
  };

  const openPermModal = async () => {
    if (typeof navigator === 'undefined') return;
    try {
      const status = await (navigator.permissions as any).query({ name: 'microphone' });
      setPermModalState(status.state === 'denied' ? 'denied' : 'prompt');
    } catch {
      setPermModalState('prompt');
    }
    setShowPermModal(true);
  };

  const requestMicPermission = async () => {
    setShowPermModal(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setEnumPermission('granted');
      refreshList();
    } catch {
      setEnumPermission('denied');
      setPermModalState('denied');
      setShowPermModal(true);
    }
  };

  const testOutput = async () => {
    setError(null);
    try {
      const audio = new Audio(beepDataUri());
      if (selectedOutputId && typeof (audio as any).setSinkId === 'function') {
        await (audio as any).setSinkId(selectedOutputId);
      }
      await audio.play();
    } catch (e: any) {
      const msg =
        `Couldn't play the test on "${selectedOutputLabel}": ${e?.message ?? e}. ` +
        `If this is your earbuds, make sure they're Connected in Windows.`;
      setError(msg);
      showToast(msg);
    }
  };

  const castRecitation = async () => {
    setCastError(null);
    setCastNote(null);
    setCastBusy(true);
    try {
      await cast.castAudio(RECITATION_CAST_TEST_URL, 'Surah Al-Fatihah  -  Mishary Alafasy');
    } catch (e: any) {
      const msg = e?.message ?? 'Casting failed.';
      setCastError(msg);
      showToast(msg);
    } finally {
      setCastBusy(false);
    }
  };

  const castAzan = async () => {
    setCastError(null);
    setCastNote(null);
    setCastBusy(true);
    try {
      const r = resolveAzanCastUrl(selectedAzanVoice);
      if (r.note) setCastNote(r.note);
      await cast.castAudio(r.url, r.title);
    } catch (e: any) {
      const msg = e?.message ?? 'Casting failed.';
      setCastError(msg);
      showToast(msg);
    } finally {
      setCastBusy(false);
    }
  };

  const safeStopCasting = () => {
    try { cast.stopCasting(); } catch (e: any) { showToast(`Stop failed: ${e?.message ?? e}`); }
  };

  const safePauseResume = () => {
    try { cast.pauseResume(); } catch (e: any) { showToast(`Pause/resume failed: ${e?.message ?? e}`); }
  };

  const safeSetVolume = (v: number) => {
    try { cast.setVolume(v); } catch (e: any) { showToast(`Volume change failed: ${e?.message ?? e}`); }
  };

  const pickWithBrowserUI = async () => {
    setError(null);
    try {
      const info = await (navigator.mediaDevices as any).selectAudioOutput();
      setSelectedOutputId(info.deviceId);
      setSelectedOutputLabel(info.label || 'Picked device');
      refreshList();
    } catch (e: any) {
      if (e?.name !== 'NotAllowedError') setError(`Picker failed: ${e?.message ?? e}`);
    }
  };

  const selectMode = (group: DeviceGroup, mode: DeviceMode) => {
    setSelectedOutputId(mode.deviceId);
    setSelectedOutputLabel(
      group.modes.length > 1 ? `${group.name} (${mode.modeLabel})` : group.name,
    );
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = isDark
    ? {
        card: 'rounded-3xl border border-emerald-500/15 bg-[#0b1a12]/80 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]',
        heading: 'text-parchment',
        sub: 'text-parchment/55',
        faint: 'text-parchment/40',
        ghost: 'border border-white/12 bg-white/[0.04] text-parchment hover:bg-white/[0.08]',
        tile: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
        deviceCard: 'border border-white/8 bg-white/[0.03] hover:bg-white/[0.06]',
        deviceSel: 'border border-emerald-400/60 bg-emerald-500/[0.08] shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]',
        deviceDefault: 'border border-amber-400/60 bg-amber-500/[0.06] shadow-[0_0_24px_-6px_rgba(245,158,11,0.35)]',
        innerNote: 'bg-emerald-500/[0.06] border border-emerald-500/15',
        divider: 'border-white/8',
        primary: 'bg-gold-gradient text-midnight-900',
        modePill: 'bg-white/8 text-parchment/60 hover:bg-white/15',
        modeActive: 'bg-emerald-500 text-white',
      }
    : {
        card: 'rounded-3xl border border-emerald-900/8 bg-white shadow-card-soft',
        heading: 'text-emerald-950',
        sub: 'text-emerald-900/55',
        faint: 'text-emerald-900/45',
        ghost: 'border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50',
        tile: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        deviceCard: 'border border-emerald-900/10 bg-white hover:shadow-lg hover:shadow-emerald-900/10',
        deviceSel: 'border border-emerald-500 bg-emerald-50/70',
        deviceDefault: 'border border-amber-400 bg-amber-50/60 shadow-[0_0_18px_-6px_rgba(245,158,11,0.3)]',
        innerNote: 'bg-emerald-50/60 border border-emerald-100',
        divider: 'border-emerald-900/8',
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
        modePill: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        modeActive: 'bg-emerald-500 text-white',
      };

  const castPill =
    cast.state === 'connected'       ? 'bg-emerald-100 text-emerald-800'
    : cast.state === 'not_connected' ? 'bg-cyan-50 text-cyan-700'
    : cast.state === 'connecting'    ? 'bg-amber-50 text-amber-700'
    : cast.state === 'loading'       ? 'bg-amber-50 text-amber-700'
    : isDark                         ? 'bg-white/8 text-parchment/60'
    :                                  'bg-slate-100 text-slate-600';

  const castStatusLabel =
    cast.state === 'connected'       ? 'Connected'
    : cast.state === 'not_connected' ? 'Devices available'
    : cast.state === 'connecting'    ? 'Connecting'
    : cast.state === 'loading'       ? 'Looking for devices…'
    : cast.state === 'no_devices'    ? 'No devices found'
    :                                  'Not supported here';

  // Resolve whether the user's selected azan voice is castable from here (for a
  // pre-emptive heads-up rather than a failed cast attempt).
  const azanCastable = useMemo(() => resolveAzanCastUrl(selectedAzanVoice), [selectedAzanVoice]);

  return (
    <div
      className={`-m-5 sm:-m-8 min-h-full ${isDark ? 'text-parchment' : 'text-ink'}`}
      style={
        isDark
          ? {
              background:
                'radial-gradient(900px 500px at 80% -5%, rgba(16,185,129,0.10), transparent 60%), linear-gradient(165deg,#08160f 0%,#05100a 55%,#020705 100%)',
            }
          : undefined
      }
    >
      {/* ── Modals ── */}
      <AnimatePresence>
        {showPermModal && (
          <MicPermModal
            permState={permModalState}
            onRequest={requestMicPermission}
            onDismiss={() => setShowPermModal(false)}
            isDark={isDark}
          />
        )}
        {showAddModal && (
          <AddDeviceModal
            onClose={() => setShowAddModal(false)}
            onPickAudio={pickWithBrowserUI}
            pickerSupported={pickerSupported}
            onRescan={refreshList}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* ── Error toast popup ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-start gap-3 max-w-sm w-[calc(100%-2rem)] rounded-2xl bg-rose-600 text-white px-4 py-3.5 shadow-2xl"
          >
            <AlertTriangle size={17} className="shrink-0 mt-0.5" />
            <p className="flex-1 text-sm leading-snug">{toast.msg}</p>
            <button onClick={() => setToast(null)} className="shrink-0 opacity-70 hover:opacity-100 transition" aria-label="Dismiss">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero section — same visual treatment as Prayer Times page ── */}
      <div className="relative overflow-hidden">
        {/* Devices-specific hero background shown TWICE side by side. Each half
            uses object-fill so the whole picture shows (full height, no crop);
            the narrower half-width box means far less vertical compression. */}
        <div className="absolute inset-0 flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Devices and output first section background image.png" alt="" className="w-1/2 h-full select-none object-fill" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Devices and output first section background image.png" alt="" className="w-1/2 h-full select-none object-fill" />
        </div>

        <div className="relative px-6 sm:px-10 pt-5 pb-8 flex flex-wrap items-start justify-between gap-4">

          {/* left: badge + heading + subtitle */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
              <Volume2 size={12} /> Devices &amp; Outputs
            </span>
            <div className="mt-4 block w-fit max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <h1 className="font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] text-black">
                Choose where Azan &amp; Quran audio plays
              </h1>
            </div>
            <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-base sm:text-lg leading-relaxed text-black/85">
                Every call to prayer — on the best speaker in the room, at perfect quality.
              </p>
            </div>
          </div>

          {/* right: ayah glass card — same glass treatment as Prayer Times hero */}
          <div className="hidden md:block" style={{ maxWidth: '360px' }}>
            <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                  ٢٠٤
                </span>
                <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                  وَإِذَا قُرِئَ ٱلْقُرْآنُ فَٱسْتَمِعُوا۟ لَهُۥ وَأَنصِتُوا۟ لَعَلَّكُمْ تُرْحَمُونَ
                </p>
              </div>
              <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                And when the Qur&apos;an is recited, then listen to it and pay attention that you may receive mercy.
              </p>
              <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-A&apos;raf (7:204)</p>
            </div>
          </div>

        </div>
      </div>
      {/* ── end hero section ── */}

      {/* ── page content below hero ── */}
      <ContentBackdrop isDark={isDark}>
      <div className="relative px-5 sm:px-8 pb-8">

        {/* dark ambient decor (dark mode only) */}
        {isDark && (
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 pattern-bg opacity-[0.05]" />
            <div
              className="absolute -top-24 right-1/4 w-80 h-80 rounded-full animate-aurora"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }}
            />
            <div
              className="absolute top-1/3 -left-20 w-72 h-72 rounded-full animate-float-y"
              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)' }}
            />
          </div>
        )}

        <div className="relative max-w-[1500px] mx-auto space-y-5 pt-5">

        {/* ════════ MAIN + SIDEBAR ════════ */}
        <div className={`grid gap-5 items-start ${isDark ? 'grid-cols-1' : 'xl:grid-cols-[1fr_330px]'}`}>
          <div className="space-y-5 min-w-0">

            {/* ── Audio Output header card ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className={`relative overflow-hidden p-5 sm:p-6 ${T.card}`}
            >
              {isDark && <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />}
              <div className="flex flex-col xl:flex-row xl:items-center gap-5">

                {/* identity */}
                <div className="flex items-start gap-4 xl:w-72 shrink-0">
                  <span className={`inline-flex w-14 h-14 shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-glow-emerald'}`}>
                    <Volume2 size={26} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[11px] uppercase tracking-widest ${T.faint}`}>Audio Output</p>
                    <p className={`font-bold text-lg ${T.heading}`}>{selectedOutputLabel}</p>
                    <p className={`text-xs ${T.sub} mt-0.5`}>Used for Azan auto-playback, Quran tilawat, and previews.</p>
                    <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 size={14} /> Recommended
                    </span>
                    {pickerSupported && (
                      <button onClick={pickWithBrowserUI} className="ml-3 text-xs font-semibold text-emerald-500 hover:underline">
                        Choose output…
                      </button>
                    )}
                  </div>
                </div>

{/* actions */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={testOutput}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${T.ghost}`}>
                    <Volume2 size={16} /> Test Sound
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={refreshList} disabled={scanning}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-70 ${T.ghost}`}>
                    <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
                    {scanning ? 'Scanning…' : 'Rescan'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAddModal(true)}
                    className={`relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-md ${T.primary}`}
                  >
                    {isDark && <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 skew-x-12 animate-sheen" />}
                    <Plus size={16} /> Add Device
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-500 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {/* Mic permission banner */}
            {enumPermission === 'denied' && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 text-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Device names are hidden.</p>
                    Chrome hides real names (like &quot;G04 pro&quot;) until you grant microphone access once.
                  </div>
                </div>
                <button
                  onClick={openPermModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold px-3 py-2 hover:bg-amber-600 transition shrink-0"
                >
                  <Mic size={13} /> Grant mic access
                </button>
              </div>
            )}

            {/* ── Detected on this PC ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className={`p-5 sm:p-6 ${T.card}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Monitor size={18} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} />
                  <div>
                    <h3 className={`font-bold ${T.heading}`}>Detected on this PC</h3>
                    <p className={`text-xs ${T.sub}`}>
                      {deviceGroups.length} audio device{deviceGroups.length === 1 ? '' : 's'} detected  -  select your preferred device.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiag((s) => !s)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:underline shrink-0"
                >
                  <Activity size={13} /> {showDiag ? 'Hide diagnostics' : 'Show diagnostics'}
                </button>
              </div>

              {deviceGroups.length === 0 ? (
                <div className={`rounded-2xl p-5 text-sm ${T.innerNote} ${T.sub}`}>
                  <p className={`font-semibold ${T.heading} mb-1`}>No outputs detected yet.</p>
                  Bluetooth earbuds must be <strong>Connected</strong> (not just Paired) in Windows, then
                  click <strong>Rescan</strong>. Use <strong>Show diagnostics</strong> to see exactly what
                  the browser detects.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deviceGroups.map((group) => {
                    const isGroupActive = group.modes.some((m) => m.deviceId === selectedOutputId);
                    const selectedMode =
                      group.modes.find((m) => m.deviceId === selectedOutputId) ?? group.modes[0];
                    const isHeadphones = /headphone|earbud|airpod|g\d+\s*pro/i.test(group.name);
                    const Icon = isHeadphones
                      ? Headphones
                      : group.isBluetooth
                      ? Bluetooth
                      : group.isDefault
                      ? Volume2
                      : Speaker;

                    return (
                      <motion.div
                        key={group.id}
                        whileHover={{ y: -3 }}
                        className={`rounded-2xl p-4 transition flex flex-col gap-3 ${isGroupActive ? T.deviceSel : T.deviceCard}`}
                      >
                        {/* Click header to select best/current mode */}
                        <button
                          className="flex items-center gap-3 w-full text-left"
                          onClick={() => selectMode(group, selectedMode)}
                        >
                          <span className={`w-11 h-11 shrink-0 grid place-items-center rounded-xl ${isGroupActive ? 'bg-emerald-500 text-white' : T.tile}`}>
                            <Icon size={18} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block font-semibold truncate ${T.heading}`}>{group.name}</span>
                            <span className={`text-xs ${T.sub} flex items-center gap-1.5`}>
                              {group.isBluetooth ? 'Bluetooth' : group.isDefault ? 'System Default' : 'Wired / System'}
                              {isGroupActive && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-500 font-semibold">Connected</span>
                                </>
                              )}
                            </span>
                          </span>
                          {isGroupActive ? <SignalBars active /> : <ChevronRight size={18} className={T.faint} />}
                        </button>

                        {/* Mode pills  -  only for multi-mode devices (e.g. Stereo | Hands-Free) */}
                        {group.modes.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 pl-14">
                            {group.modes.map((mode) => (
                              <button
                                key={mode.deviceId}
                                onClick={() => selectMode(group, mode)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                                  mode.deviceId === selectedOutputId ? T.modeActive : T.modePill
                                }`}
                              >
                                {mode.modeLabel}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {showDiag && diag && (
                <pre className={`mt-4 rounded-xl p-4 text-[11px] leading-relaxed overflow-x-auto ${isDark ? 'bg-black/40 border border-white/10 text-parchment/70' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
{`Browser:        ${diag.ua}
mediaDevices:   ${diag.hasMediaDevices}    enumerate: ${diag.hasEnumerate}
selectAudioOut: ${diag.hasSelectOutput}    setSinkId: ${diag.hasSetSinkId}
mic permission: ${enumPermission}
Total devices:  ${diag.totalDevices}  |  By kind: ${JSON.stringify(diag.byKind)}
Outputs raw:
${diag.rawOutputs.length === 0 ? '  (none)' : diag.rawOutputs.map((d) => `  - ${d.id}  ${d.label}`).join('\n')}`}
                </pre>
              )}
            </motion.div>

            {/* ── Devices on your network (DESKTOP ONLY  -  real LAN scan) ── */}
            {lan.supported && (
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className={`relative overflow-hidden p-5 sm:p-6 ${T.card}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <Wifi size={20} />
                    </span>
                    <div>
                      <h3 className={`font-bold ${T.heading}`}>Devices on your network</h3>
                      <p className={`text-sm ${T.sub}`}>Found on your Wi-Fi by the desktop app  -  connect and play Azan or tilawat directly.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${T.faint}`}>{lan.devices.length} found</span>
                    <button onClick={rescanLan} disabled={lanScanning} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${T.ghost} disabled:opacity-60`}>
                      <RefreshCw size={13} className={lanScanning ? 'animate-spin' : ''} /> {lanScanning ? 'Scanning…' : 'Rescan'}
                    </button>
                  </div>
                </div>

                {lan.error && (
                  <div className="mb-3 flex items-start justify-between gap-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-500 text-sm px-4 py-3">
                    <span className="flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /> {lan.error}</span>
                    <button onClick={lan.clearError} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss"><X size={15} /></button>
                  </div>
                )}

                {lan.devices.length === 0 ? (
                  <div className={`rounded-2xl border border-dashed px-5 py-8 text-center ${isDark ? 'border-white/12 bg-white/[0.02]' : 'border-emerald-900/12 bg-emerald-50/30'}`}>
                    <span className={`mx-auto w-12 h-12 grid place-items-center rounded-2xl ${isDark ? 'bg-white/5 text-parchment/60' : 'bg-white text-emerald-600 shadow-sm'}`}>
                      <Loader2 size={22} className="animate-spin" />
                    </span>
                    <p className={`font-bold mt-3 ${T.heading}`}>Looking for devices…</p>
                    <p className={`text-sm ${T.sub} mt-1 max-w-md mx-auto`}>
                      Power on your Chromecast / Google Home / Nest / smart speaker on the <strong>same Wi-Fi</strong> as this computer. They appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {lan.devices.map((d) => {
                      const meta = LAN_KIND[d.kind] ?? { icon: Radio, label: d.kind };
                      const Icon = meta.icon;
                      const castable = d.capabilities?.cast;
                      const active = lan.activeId === d.id;
                      const busy = lan.busyId === d.id;
                      const isAzanDevice = azanDeviceIds.includes(d.id);
                      const isRecitationDevice = recitationDeviceIds.includes(d.id);
                      const isDefaultDevice = defaultDeviceIds.includes(d.id);
                      return (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                          className={`rounded-2xl p-4 flex flex-col gap-3 ${active ? T.deviceSel : isDefaultDevice ? T.deviceDefault : T.deviceCard}`}
                        >
                          {/* Now-Playing banner  -  persists across navigation via sessionStorage */}
                          {active && (
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
                              <MiniEq />
                              <p className="flex-1 text-xs font-bold text-emerald-600 truncate">
                                Now Playing{lan.activeLabel ? ` - ${lan.activeLabel}` : ''}
                              </p>
                              <button onClick={() => lan.stop(d.id).catch((e: any) => showToast(`Stop failed: ${e?.message ?? e}`))}
                                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition">
                                <X size={12} /> Stop
                              </button>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className={`w-11 h-11 shrink-0 grid place-items-center rounded-xl ${castable ? (isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md') : (isDark ? 'bg-white/5 text-parchment/50' : 'bg-slate-100 text-slate-500')}`}>
                                <Icon size={20} />
                              </span>
                              <div className="min-w-0">
                                <p className={`font-bold ${T.heading} leading-tight truncate`}>{d.name}</p>
                                <p className={`text-xs ${T.sub} truncate`}>{meta.label}{d.model ? ` · ${d.model}` : ''}</p>
                              </div>
                            </div>
                            {castable ? (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                                active ? 'bg-emerald-100 text-emerald-700'
                                : isDefaultDevice ? 'bg-amber-100 text-amber-700'
                                : (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                              }`}>
                                {active ? <MiniEq /> : isDefaultDevice ? <Star size={10} fill="currentColor" /> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />}
                                {active ? 'Playing' : isDefaultDevice ? 'Default' : 'Ready'}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${isDark ? 'bg-white/5 text-parchment/50' : 'bg-slate-100 text-slate-500'}`}>
                                Discovered
                              </span>
                            )}
                          </div>

                          {castable ? (
                            <>
                              {/* Select as Default — plays both azan & recitation automatically */}
                              <button
                                onClick={() => toggleDefaultDevice(d)}
                                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                                  isDefaultDevice
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : (isDark ? 'border border-amber-400/30 bg-amber-400/[0.06] text-amber-300 hover:bg-amber-400/[0.12]' : 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100')
                                }`}
                              >
                                <Star size={14} fill={isDefaultDevice ? 'currentColor' : 'none'} />
                                {isDefaultDevice ? 'Default Device (tap to remove)' : 'Select as Default'}
                              </button>

                              {/* Play controls */}
                              <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => testSoundOnLan(d.id)} disabled={busy}
                                  title="Plays a short beep to confirm the device is working"
                                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${T.primary} disabled:opacity-70`}>
                                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Test device
                                </button>
                                <button onClick={() => playRecitationOnLan(d.id)} disabled={busy}
                                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ${T.ghost} disabled:opacity-70`}>
                                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />} Recitation
                                </button>
                              </div>

                              {/* Volume slider (shown when playing) */}
                              {active && (
                                <div className="flex items-center gap-2 max-w-xs">
                                  <Volume2 size={14} className={T.faint} />
                                  <input
                                    type="range" min={0} max={1} step={0.05} value={lanVol}
                                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) { setLanVol(v); lan.setVolume(d.id, v).catch(() => {}); } }}
                                    className="flex-1 accent-emerald-500 cursor-pointer" aria-label="Device volume"
                                  />
                                  <span className={`text-xs tabular-nums ${T.faint}`}>{Math.round(lanVol * 100)}%</span>
                                </div>
                              )}

                              {/* Individual purpose toggles */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-900/[0.07]">
                                <button
                                  onClick={() => toggleAzanDevice(d)}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 transition ${isAzanDevice ? 'bg-emerald-600 text-white' : (isDark ? 'bg-white/5 text-parchment/55 hover:bg-white/10' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}`}
                                >
                                  <Bell size={11} /> Auto-Azan{isAzanDevice ? ' ✓' : ''}
                                </button>
                                <button
                                  onClick={() => toggleRecitationDevice(d.id)}
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 transition ${isRecitationDevice ? 'bg-violet-600 text-white' : (isDark ? 'bg-white/5 text-parchment/55 hover:bg-white/10' : 'bg-violet-50 text-violet-700 hover:bg-violet-100')}`}
                                >
                                  <Volume2 size={11} /> Recitation{isRecitationDevice ? ' ✓' : ''}
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className={`text-xs ${T.faint} leading-relaxed`}>
                              {d.kind === 'airplay'
                                ? 'AirPlay device detected. Direct casting needs AirPlay 2 pairing (not supported yet)  -  use a Chromecast/Google Home, a DLNA speaker, or Bluetooth.'
                                : d.kind === 'alexa'
                                ? 'Amazon Echo detected. Playing to Alexa needs a published Alexa Skill (cloud), not a local connection.'
                                : 'This device was found but can\'t be controlled directly.'}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Cast ── (only shown when no LAN devices are detected) */}
            {(!lan.supported || lan.devices.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className={`relative overflow-hidden p-5 sm:p-6 ${T.card}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white">
                    <Cast size={20} />
                  </span>
                  <div>
                    <h3 className={`font-bold ${T.heading}`}>Cast to Chromecast, Google Home &amp; Nest</h3>
                    <p className={`text-sm ${T.sub}`}>{lan.supported ? "Or use your browser's built-in casting (Chrome picker)." : 'Stream Azan & Quran audio to your smart devices on the same Wi-Fi.'}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${castPill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    cast.state === 'connected' || cast.state === 'not_connected' ? 'bg-emerald-500 animate-pulse-soft'
                    : cast.state === 'connecting' || cast.state === 'loading' ? 'bg-amber-500 animate-pulse-soft'
                    : 'bg-slate-400'}`} />
                  {castStatusLabel}
                </span>
              </div>

              <div className={`relative overflow-hidden rounded-2xl p-4 ${T.innerNote}`}>
                <div aria-hidden className="absolute right-4 bottom-0 hidden md:flex items-end gap-3 opacity-90 pointer-events-none">
                  <motion.span
                    className="absolute -bottom-2 right-6 w-40 h-16 rounded-full"
                    style={{ background: isDark ? 'radial-gradient(circle, rgba(16,185,129,0.45) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className={`relative w-10 h-12 rounded-b-full rounded-t-2xl ${isDark ? 'bg-emerald-900/60 border border-emerald-500/30' : 'bg-emerald-100 border border-emerald-200'}`} />
                  <MonitorSpeaker size={48} className={isDark ? 'relative text-emerald-300/80' : 'relative text-emerald-500/70'} />
                </div>

                <div className="relative flex items-start gap-2 max-w-xl">
                  <motion.span animate={cast.state === 'connected' ? { scale: [1, 1.15, 1] } : undefined} transition={{ duration: 2.4, repeat: Infinity }}>
                    {cast.state === 'no_sdk' ? <WifiOff size={16} className="shrink-0 mt-0.5 text-slate-400" /> : <Wifi size={16} className="shrink-0 mt-0.5 text-emerald-500" />}
                  </motion.span>
                  <div className="min-w-0">
                    {/* Headline + helper text per state */}
                    <p className={`font-semibold text-sm ${cast.state === 'no_sdk' ? (isDark ? 'text-parchment/80' : 'text-slate-600') : 'text-emerald-600'}`}>
                      {cast.state === 'loading'        ? 'Looking for Cast devices on your network…'
                        : cast.state === 'no_sdk'      ? 'Casting needs desktop Chrome, Edge or Brave.'
                        : cast.state === 'no_devices'  ? 'No Cast devices found yet.'
                        : cast.state === 'connecting'  ? 'Connecting to the device…'
                        : cast.state === 'connected'   ? `Casting to ${cast.deviceName || 'your device'}`
                        :                                'Cast devices are available.'}
                    </p>

                    {cast.state === 'no_sdk' ? (
                      <p className={`text-xs ${T.sub} mt-0.5 leading-relaxed`}>
                        Your current browser can&apos;t reach Cast devices. Open this page in
                        desktop <strong>Chrome</strong>, <strong>Edge</strong> or <strong>Brave</strong>  -  Safari, Firefox and phone
                        browsers don&apos;t support Google Cast.
                      </p>
                    ) : cast.state === 'no_devices' ? (
                      <p className={`text-xs ${T.sub} mt-0.5 leading-relaxed`}>
                        Power on your Chromecast / Google Home / Nest on the <strong>same Wi-Fi</strong> as this computer  -  devices appear on their own, no rescan needed. The steps below help if yours doesn&apos;t show up.
                      </p>
                    ) : cast.state === 'connected' ? (
                      <p className={`text-xs ${T.sub} mt-0.5 leading-relaxed`}>
                        {cast.mediaTitle ? <>Now playing: <strong>{cast.mediaTitle}</strong>. </> : null}
                        Azan &amp; recitations you start will stream straight to this device.
                      </p>
                    ) : (
                      <p className={`text-xs ${T.sub} mt-0.5 leading-relaxed`}>
                        Connect, then send the adhan or a recitation. Make sure the device is on the same Wi-Fi as this computer.
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {(cast.state === 'not_connected' || cast.state === 'connecting') && (
                        <button
                          onClick={cast.selectDevice} disabled={cast.state === 'connecting'}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${T.primary} disabled:opacity-70`}
                        >
                          {cast.state === 'connecting' ? <Loader2 size={15} className="animate-spin" /> : <Cast size={15} />}
                          {cast.state === 'connecting' ? 'Connecting…' : 'Connect a device'}
                        </button>
                      )}
                      {cast.state === 'connecting' && (
                        <button
                          onClick={() => { safeStopCasting(); cast.clearError(); }}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${T.ghost}`}
                        >
                          <X size={15} /> Cancel
                        </button>
                      )}
                      {(cast.state === 'not_connected' || cast.state === 'connected') && (
                        <>
                          <button
                            onClick={castAzan} disabled={castBusy}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${T.primary} disabled:opacity-70`}
                          >
                            {castBusy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
                            Cast Adhan
                          </button>
                          <button
                            onClick={castRecitation} disabled={castBusy}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${T.ghost} disabled:opacity-70`}
                          >
                            {castBusy ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
                            Cast recitation
                          </button>
                        </>
                      )}
                      {cast.state === 'connected' && cast.mediaState !== 'idle' && (
                        <button
                          onClick={safePauseResume}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${T.ghost}`}
                          aria-label={cast.mediaState === 'playing' ? 'Pause' : 'Resume'}
                        >
                          {cast.mediaState === 'playing' ? <Pause size={15} /> : <Play size={15} />}
                          {cast.mediaState === 'buffering' ? 'Buffering…' : cast.mediaState === 'playing' ? 'Pause' : 'Resume'}
                        </button>
                      )}
                      {cast.state === 'connected' && (
                        <button
                          onClick={safeStopCasting}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${T.ghost}`}
                        >
                          <X size={15} /> Stop casting
                        </button>
                      )}
                    </div>

                    {/* Volume control while connected */}
                    {cast.state === 'connected' && (
                      <div className="flex items-center gap-2 mt-3 max-w-xs">
                        <button onClick={() => safeSetVolume(cast.volume > 0 ? 0 : 0.5)} className={T.sub} aria-label="Toggle mute">
                          {cast.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <input
                          type="range" min={0} max={1} step={0.05} value={cast.volume}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) safeSetVolume(v); }}
                          className="flex-1 accent-emerald-500 cursor-pointer"
                          aria-label="Cast device volume"
                        />
                        <span className={`text-xs tabular-nums ${T.faint}`}>{Math.round(cast.volume * 100)}%</span>
                      </div>
                    )}

                    {/* How-to-connect toggle (hidden once actively casting) */}
                    {cast.state !== 'connected' && (
                      <button
                        onClick={() => setShowCastHelp((v) => !v)}
                        className={`inline-flex items-center gap-1.5 mt-3 text-xs font-semibold ${isDark ? 'text-parchment/70 hover:text-parchment' : 'text-emerald-700 hover:text-emerald-900'}`}
                        aria-expanded={showCastHelp}
                      >
                        <HelpCircle size={13} /> How to connect a device
                        <ChevronDown size={13} className={`transition-transform ${showCastHelp ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Guided steps + system-settings shortcuts (auto-opens when no devices found) */}
              {(showCastHelp || cast.state === 'no_devices') && (
                <div className={`mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed ${isDark ? 'bg-white/[0.03] border border-white/10 text-parchment/75' : 'bg-slate-50 border border-slate-200 text-emerald-900/70'}`}>
                  <p className={`font-semibold mb-2 ${T.heading}`}>How to connect Chromecast / Google Home / Nest</p>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>Power on the device and put it on the <strong>same Wi-Fi</strong> as this computer (not a Guest network; turn off any VPN).</li>
                    <li>Use <strong>desktop Chrome, Edge or Brave</strong>  -  Safari, Firefox and phone browsers can&apos;t cast.</li>
                    <li>Click <strong>“Connect a device”</strong> above. Chrome opens its own picker and <em>lists your devices there</em>  -  for privacy the browser, not this page, shows them.</li>
                    <li>Choose your device in that picker to approve the connection, then press <strong>Cast Adhan</strong> or <strong>Cast recitation</strong>.</li>
                  </ol>
                  <p className={`mt-2 ${T.faint}`}>
                    Still not showing? Some routers block discovery  -  turn off <em>AP/client isolation</em> in your router, or the device may be in use by another app/phone. Casting needs no in-browser permission to grant; it&apos;s purely a network/Wi-Fi matter.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {detectOS() === 'linux' ? (
                      <span className={T.faint}>On Linux, open your system network settings to confirm the Wi-Fi.</span>
                    ) : (
                      <button onClick={openOSWifi} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold ${T.ghost}`}>
                        <Settings size={13} /> Open Wi-Fi settings
                      </button>
                    )}
                    <a
                      href="https://support.google.com/chromecast/answer/3212934"
                      target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold ${T.ghost}`}
                    >
                      <ExternalLink size={13} /> Google Cast help
                    </a>
                  </div>
                </div>
              )}

              {/* Pre-emptive heads-up: selected azan voice can't be reached from here */}
              {(cast.state === 'not_connected' || cast.state === 'connected') && !azanCastable.exact && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-700 text-xs px-4 py-3">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p>{azanCastable.note}</p>
                </div>
              )}

              {/* Runtime substitution note (set when a cast actually fell back) */}
              {castNote && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-700 text-xs px-4 py-3">
                  <Info size={14} className="shrink-0 mt-0.5" /> <p>{castNote}</p>
                </div>
              )}

              {/* Errors (from the SDK or a cast attempt) */}
              {(cast.error || castError) && (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-500 text-sm px-4 py-3">
                  <span className="flex items-start gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /> {cast.error || castError}</span>
                  <button onClick={() => { cast.clearError(); setCastError(null); }} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
                    <X size={15} />
                  </button>
                </div>
              )}

              {!isDark && (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5 text-slate-500" />
                    <p className="text-xs text-emerald-900/55">
                      <strong>Other device types:</strong> Bluetooth speakers &amp; earbuds work through
                      the list above  -  pair them in Windows first, then pick them. Amazon Alexa/Echo needs
                      a published Alexa Skill, and some devices need a companion app.
                    </p>
                  </div>
                  <a
                    href="https://support.google.com/chromecast"
                    target="_blank" rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 hover:bg-emerald-50 transition"
                  >
                    Learn more <ChevronRight size={12} />
                  </a>
                </div>
              )}
            </motion.div>
            )}

            {/* ── Other devices on your account ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className={`p-5 sm:p-6 ${T.card}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className={`flex items-center gap-2 font-bold ${T.heading}`}>
                  <MonitorSpeaker size={18} className="text-emerald-500" /> Other devices on your account
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={linkThisDevice} disabled={linking}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${T.ghost} disabled:opacity-70`}
                  >
                    {linking ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                    Link this device
                  </button>
                  <button
                    onClick={fetchLinked} disabled={linkedLoading}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${T.ghost} disabled:opacity-70`}
                    aria-label="Refresh devices"
                  >
                    <RefreshCw size={13} className={linkedLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
              </div>

              {linkedError && (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-500 text-sm px-4 py-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {linkedError}
                </div>
              )}

              {linkedLoading ? (
                /* Loading skeletons */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`rounded-2xl p-4 h-[124px] animate-pulse ${isDark ? 'bg-white/5' : 'bg-emerald-50/60'}`} />
                  ))}
                </div>
              ) : linked.length === 0 ? (
                /* No devices  -  the requested empty state (covers both "none linked" and "not signed in") */
                <div className={`rounded-2xl border border-dashed px-5 py-8 text-center ${isDark ? 'border-white/12 bg-white/[0.02]' : 'border-emerald-900/12 bg-emerald-50/30'}`}>
                  <span className={`mx-auto w-12 h-12 grid place-items-center rounded-2xl ${isDark ? 'bg-white/5 text-parchment/60' : 'bg-white text-emerald-600 shadow-sm'}`}>
                    {needsAuth ? <LogIn size={22} /> : <MonitorSmartphone size={22} />}
                  </span>
                  <p className={`font-bold mt-3 ${T.heading}`}>No devices found</p>
                  <p className={`text-sm ${T.sub} mt-1 max-w-md mx-auto`}>
                    {needsAuth
                      ? 'Sign in to sync your devices  -  your phone, tablet and desktop apps will appear here so azan & recitations stay in step across all of them.'
                      : "You haven't linked any devices yet. Link this one to get started - your phone and tablet apps will appear here too."}
                  </p>
                  <button onClick={linkThisDevice} disabled={linking} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 mt-4 text-sm font-semibold ${T.primary} disabled:opacity-70`}>
                    {linking ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                    Link this device
                  </button>
                </div>
              ) : (
                /* Real linked devices */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {linked.map((d, i) => {
                    const Icon = deviceIcon(d);
                    const online = !!d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 5 * 60_000;
                    const title = d.name || PLATFORM_LABEL[d.platform] || d.device_type;
                    return (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }}
                        className={`group relative rounded-2xl p-4 flex flex-col gap-3 ${T.deviceCard}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`w-11 h-11 grid place-items-center rounded-xl ${isDark ? 'bg-white/5 text-gold-300 border border-gold-400/30' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md'}`}>
                            <Icon size={20} />
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${online ? 'bg-emerald-100 text-emerald-700' : isDark ? 'bg-white/5 text-parchment/50' : 'bg-slate-100 text-slate-500'}`}>
                            {online ? <MiniEq /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`font-bold ${T.heading} leading-tight truncate`}>{title}</p>
                            <p className={`text-sm ${T.sub}`}>{PLATFORM_LABEL[d.platform] ?? d.platform}</p>
                            <div className={`mt-1.5 flex items-center gap-3 text-xs ${T.faint}`}>
                              <span className="inline-flex items-center gap-1"><Wifi size={12} /> {d.sync_group}</span>
                              <span className="inline-flex items-center gap-1"><Globe2 size={12} /> {relativeTime(d.last_seen_at)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeLinked(d.id)} disabled={removingId === d.id}
                            className={`shrink-0 p-2 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${isDark ? 'hover:bg-rose-500/15 text-rose-300' : 'hover:bg-rose-50 text-rose-500'} disabled:opacity-50`}
                            aria-label={`Remove ${title}`}
                          >
                            {removingId === d.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* ── Bottom feature strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { Icon: Activity,  title: isDark ? 'Best Audio Quality' : 'Crystal Clear Sound', sub: isDark ? "Crystal clear sound for deeper khushu'" : 'High-quality audio for a deeper, clearer tilawat', tint: 'text-emerald-500' },
                { Icon: Zap,       title: 'Low Latency',         sub: 'Minimal delay for perfect sync',                   tint: 'text-sky-500'     },
                { Icon: Music2,    title: 'Background Playback', sub: 'Azan & Quran continue even when screen is off.',   tint: 'text-violet-500'  },
                { Icon: Bluetooth, title: 'Bluetooth Tips',      sub: 'Keep devices close for stable connection',         tint: 'text-cyan-500'    },
              ].map(({ Icon, title, sub, tint }, i) => (
                <div key={title} className={`flex items-start gap-3 rounded-2xl p-4 ${T.card}`}>
                  <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-xl ${isDark ? 'bg-white/5' : 'bg-emerald-50'} ${tint} animate-float`} style={{ animationDelay: `${i * 0.4}s` }}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${T.heading} leading-tight`}>{title}</p>
                    <p className={`text-[11px] ${T.sub} mt-0.5 leading-snug`}>{sub}</p>
                  </div>
                </div>
              ))}
              <div className={`flex items-center justify-between gap-2 rounded-2xl p-4 ${isDark ? 'border border-gold-400/40 bg-gold-400/5' : 'border border-gold-300/50 bg-gold-50'}`}>
                <div className="flex items-start gap-3">
                  <span className={`w-9 h-9 shrink-0 grid place-items-center rounded-xl ${isDark ? 'text-gold-300 bg-gold-400/10' : 'text-gold-600 bg-gold-100'} animate-pulse-soft`}>
                    <Headphones size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${isDark ? 'text-gold-300' : 'text-gold-700'} leading-tight`}>Need Help?</p>
                    <p className={`text-[11px] ${T.sub} mt-0.5 leading-snug`}>Audio issues or setup help? We&apos;re here for you!</p>
                  </div>
                </div>
                <ChevronRight size={16} className={isDark ? 'text-gold-300' : 'text-gold-600'} />
              </div>
            </div>
          </div>

          {/* ════════ RIGHT SIDEBAR  -  LIGHT ONLY ════════ */}
          {!isDark && (
            <aside className="space-y-5">
              {/* Quick Actions */}
              <div className={`p-5 ${T.card}`}>
                <h3 className={`font-bold ${T.heading} mb-3`}>Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {QUICK_ACTIONS.slice(0, 4).map(({ Icon, title, sub, tint, href }) => (
                    <Link key={title} href={href}
                      className="rounded-2xl border border-emerald-900/8 bg-white p-3 hover:shadow-md hover:shadow-emerald-900/10 transition">
                      <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg ${tint} animate-float`}><Icon size={16} /></span>
                      <p className="text-xs font-bold text-emerald-950 mt-2 leading-tight">{title}</p>
                      <p className="text-[10px] text-emerald-900/50 leading-tight mt-0.5">{sub}</p>
                    </Link>
                  ))}
                </div>
                <Link href="/dashboard/qibla"
                  className="mt-2.5 flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/60 px-3 py-2.5 hover:shadow-md transition">
                  <span className="flex items-center gap-2.5">
                    <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 animate-float"><Compass size={16} /></span>
                    <span>
                      <span className="block text-xs font-bold text-emerald-950">Qibla Direction</span>
                      <span className="block text-[10px] text-emerald-900/50">Stay connected</span>
                    </span>
                  </span>
                  <ChevronRight size={15} className="text-emerald-900/30" />
                </Link>
              </div>

              {/* Today's Listening Goal */}
              <div className={`relative overflow-hidden p-5 ${T.card}`}>
                <div aria-hidden className="absolute right-0 bottom-0 w-40 h-24 opacity-60">
                  <svg viewBox="0 0 160 90" className="w-full h-full">
                    <polygon points="0,90 50,35 90,90" fill="rgba(16,185,129,0.10)" />
                    <polygon points="60,90 110,20 160,90" fill="rgba(16,185,129,0.07)" />
                  </svg>
                </div>
                <h3 className={`font-bold ${T.heading} mb-3`}>Today&apos;s Listening Goal</h3>
                <div className="relative flex items-center gap-4">
                  <RadialGoal value={minutesListened} target={30} isDark={isDark} />
                  <div>
                    <p className="font-display font-bold text-emerald-950">Minutes</p>
                    <p className="text-sm text-emerald-900/55">listened</p>
                    <p className="text-xs text-emerald-900/50 mt-2 max-w-[10rem] leading-snug">Keep it up! Consistency brings barakah.</p>
                  </div>
                </div>
              </div>

              {/* Inspiring Hadees */}
              <div className={`relative overflow-hidden p-5 ${T.card}`}>
                <h3 className={`font-bold ${T.heading} mb-3`}>Inspiring Hadees</h3>
                <p className="font-arabic text-lg text-emerald-900 leading-[2] mb-2" dir="rtl">
                  مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا
                </p>
                <p className="text-xs text-emerald-900/65 leading-relaxed">
                  &ldquo;Whoever reads a letter from the Book of Allah will get a reward for it, and the reward is multiplied tenfold.&rdquo;
                </p>
                <p className="text-[11px] text-emerald-900/40 mt-1">(Tirmidhi 2910)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/recitation/rehal.svg" alt="" className="absolute -right-2 -bottom-2 w-20 opacity-90 animate-float" />
              </div>
            </aside>
          )}
        </div>
        </div>
      </div>
      </ContentBackdrop>
    </div>
  );
}
