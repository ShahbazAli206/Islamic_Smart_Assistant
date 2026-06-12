'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone, Tablet, Monitor, Speaker, Headphones, Sparkles, Radio, Wifi, Globe2,
  Bluetooth, RefreshCw, Volume2, CheckCircle2, AlertTriangle, Info, Cast, Tv, Loader2,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useGoogleCast } from '@/lib/useGoogleCast';

type AudioOut = { deviceId: string; label: string };

// Keep the Rescan spinner visible long enough to read as "scanning" — device
// enumeration itself resolves in milliseconds, so without this the icon just blinks.
const MIN_SPIN_MS = 900;

// A public, CORS-friendly MP3 the Cast device can fetch directly (Surah Al-Fatihah,
// ayah 1, Mishary Alafasy) — used to prove casting works end-to-end. A localhost
// dev URL wouldn't be reachable by the device; this CDN URL always is.
const CAST_TEST_URL = 'https://cdn.islamic.network/quran/audio/192/ar.alafasy/1.mp3';

const FALLBACK_LINKED = [
  { id: '1', user_name: 'Aisha Khan',   platform: 'iPhone 15',     sync_group: 'Home',   kind: 'mobile',  status: 'playing' },
  { id: '2', user_name: 'Aisha Khan',   platform: 'iPad Pro',      sync_group: 'Home',   kind: 'tablet',  status: 'online' },
  { id: '3', user_name: 'Yusuf Rahman', platform: 'Macbook Pro',   sync_group: 'Office', kind: 'desktop', status: 'online' },
];

const ICON: Record<string, any> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor, speaker: Speaker, earbuds: Headphones,
};

// Generate a short 0.4s sine-wave beep as a WAV data URI (no asset needed),
// used to test-route audio to a chosen output device via setSinkId.
function beepDataUri(freq = 660, ms = 400, sampleRate = 44100): string {
  const samples = Math.floor((sampleRate * ms) / 1000);
  const dataSize = samples * 2; // 16-bit mono
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const wr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); wr(8, 'WAVE');
  wr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  wr(36, 'data'); view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 1000, (samples - i) / 1000); // soft attack/release
    const v = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.3 * fade;
    view.setInt16(44 + i * 2, v * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

type DiagInfo = {
  ua: string;
  hasMediaDevices: boolean;
  hasEnumerate: boolean;
  hasSelectOutput: boolean;
  hasSetSinkId: boolean;
  totalDevices: number;
  byKind: Record<string, number>;
  rawOutputs: Array<{ id: string; label: string }>;
};

export default function DevicesPage() {
  const [outputs, setOutputs] = useState<AudioOut[]>([]);
  const [pickerSupported, setPickerSupported] = useState<boolean | null>(null);
  const [enumPermission, setEnumPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [selectedOutputId, setSelectedOutputId] = useLocalStorage<string>('isa:audioOutput', '');
  const [selectedOutputLabel, setSelectedOutputLabel] = useLocalStorage<string>('isa:audioOutputLabel', 'System default');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<DiagInfo | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  // Google Cast (Chromecast / Google Home / Nest) — live device availability.
  const cast = useGoogleCast();
  const [castBusy, setCastBusy] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  // Detect picker support on mount + auto-refresh when devices connect/disconnect.
  useEffect(() => {
    setPickerSupported(
      typeof navigator !== 'undefined' &&
      typeof (navigator.mediaDevices as any)?.selectAudioOutput === 'function',
    );
    refreshList();

    // When you connect your airbuds (or any output) at the OS level, the browser
    // fires `devicechange`. Re-enumerate automatically so the list stays live —
    // this is the usual reason a "connected in Windows" device wasn't showing here.
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (md && typeof md.addEventListener === 'function') {
      const onChange = () => refreshList();
      md.addEventListener('devicechange', onChange);
      return () => md.removeEventListener('devicechange', onChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play a short beep on the currently selected output to confirm routing works.
  const testOutput = async () => {
    setError(null);
    try {
      const audio = new Audio(beepDataUri());
      if (selectedOutputId && typeof (audio as any).setSinkId === 'function') {
        await (audio as any).setSinkId(selectedOutputId);
      }
      await audio.play();
    } catch (e: any) {
      setError(
        `Couldn't play the test on "${selectedOutputLabel}": ${e?.message ?? e}. ` +
        `If this is your earbuds, make sure they're Connected (not just Paired) in Windows.`,
      );
    }
  };

  const captureDiag = async () => {
    if (typeof navigator === 'undefined') return;
    const md = navigator.mediaDevices;
    const all = md && typeof md.enumerateDevices === 'function'
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

      // First try without permission — labels may be empty but IDs present.
      let devs = await navigator.mediaDevices.enumerateDevices();
      let outs = devs.filter((d) => d.kind === 'audiooutput');

      if (outs.length === 0 || outs.every((d) => !d.label)) {
        // Either no outputs at all, or labels hidden — ask mic permission so
        // labels become readable AND so the OS surfaces every output it knows about.
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

      // Filter out Windows virtual role endpoints ("default" and "communications") —
      // they duplicate the physical device entry and "System default" is already shown above.
      setOutputs(
        outs
          .filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Output device' })),
      );
      await captureDiag();
    } catch (e: any) {
      setError(`Couldn't list audio devices: ${e?.message ?? e}`);
      await captureDiag();
    } finally {
      // Hold the spinner for a beat so the rescan reads as deliberate, not a blink.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      setScanning(false);
    }
  };

  // Cast a short test recitation to the connected (or just-picked) Cast device.
  const testCast = async () => {
    setCastError(null);
    setCastBusy(true);
    try {
      await cast.castAudio(CAST_TEST_URL, 'Test — Surah Al-Fatihah');
    } catch (e: any) {
      setCastError(e?.message ?? 'Casting failed.');
    } finally {
      setCastBusy(false);
    }
  };

  const pickWithBrowserUI = async () => {
    setError(null);
    try {
      const info = await (navigator.mediaDevices as any).selectAudioOutput();
      setSelectedOutputId(info.deviceId);
      setSelectedOutputLabel(info.label || 'Picked device');
      refreshList();
    } catch (e: any) {
      if (e?.name !== 'NotAllowedError') {
        setError(`Picker failed: ${e?.message ?? e}`);
      }
    }
  };

  const setOutput = (d: AudioOut) => {
    setSelectedOutputId(d.deviceId);
    setSelectedOutputLabel(d.label);
  };

  const openWindowsBluetooth = () => {
    window.location.href = 'ms-settings:bluetooth';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip-gold mb-2"><Sparkles size={12}/> Real-time</p>
          <h1 className="h-display text-4xl font-bold">Devices &amp; outputs</h1>
          <p className="text-ink/60 mt-1">
            Pick where Azan and Quran audio plays — your earbuds, a Bluetooth speaker, the system speakers, anything paired with this PC.
          </p>
        </div>
      </div>

      {/* Currently selected output */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="card card-pad flex flex-wrap items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-glow-emerald pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <span className="w-12 h-12 rounded-xl bg-mosque-gradient text-gold-300 flex items-center justify-center shadow-glow-emerald">
            <Volume2 size={22} />
          </span>
          <div>
            <p className="text-xs text-ink/55 uppercase tracking-widest">Audio output</p>
            <p className="font-bold text-lg">{selectedOutputLabel}</p>
            <p className="text-xs text-ink/55">Used for Azan auto-playback, Quran tilawat, and previews.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 relative">
          {pickerSupported && (
            <button onClick={pickWithBrowserUI} className="btn-primary text-sm py-2 px-4">
              <Volume2 size={16}/> Choose output…
            </button>
          )}
          <button onClick={testOutput} className="btn-ghost text-sm py-2 px-4" title="Play a test beep on the selected output">
            <Volume2 size={16}/> Test sound
          </button>
          <button onClick={refreshList} disabled={scanning} className="btn-ghost text-sm py-2 px-4 disabled:opacity-70">
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''}/> {scanning ? 'Scanning…' : 'Rescan'}
          </button>
          <button onClick={openWindowsBluetooth} className="btn-ghost text-sm py-2 px-4">
            <Bluetooth size={16}/> Pair Bluetooth…
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">{error}</div>
      )}

      {enumPermission === 'denied' && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 flex gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">Device names are hidden.</p>
            Chrome only reveals real audio-device names after you grant microphone permission once. Click "Rescan" and allow the mic prompt — we close it right away, we just need the labels.
          </div>
        </div>
      )}

      {/* Detected outputs */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-emerald-900/5 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Detected on this PC</h3>
            <p className="text-xs text-ink/55">
              {outputs.length} physical audio output{outputs.length === 1 ? '' : 's'} detected
              {outputs.length > 0 && ' — Bluetooth speakers/earbuds appear here once Connected (not just Paired)'}
            </p>
          </div>
          <button
            onClick={() => setShowDiag((s) => !s)}
            className="text-xs text-emerald-700 hover:underline"
          >
            {showDiag ? 'Hide diagnostics' : 'Show diagnostics'}
          </button>
        </div>
        {outputs.length === 0 ? (
          <div className="p-6 space-y-3 text-sm text-ink/70">
            <p><strong>No outputs detected yet.</strong> The two most common reasons:</p>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>
                Your Bluetooth earbuds are <strong>Paired but not Connected</strong>. Windows only lists them as audio outputs when actively connected — take them out of the case, or in Windows BT Settings click the device and choose <em>Connect</em>. Then click <strong>Rescan</strong> above.
              </li>
              <li>
                You're viewing this in <strong>VS Code's Simple Browser</strong>, which doesn't expose audio devices. Open the page in <strong>Chrome or Edge</strong> at <a href="http://localhost:3000/dashboard/devices" className="text-emerald-700 underline">localhost:3000/dashboard/devices</a>.
              </li>
            </ol>
            <p className="text-xs text-ink/55">If neither helps, click <strong>Show diagnostics</strong> in the header above — it'll print exactly what the browser can see.</p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0">
            {outputs.map((d) => {
              const active = d.deviceId === selectedOutputId;
              const isBT = /bluetooth|airpod|airbud|buds|wh-|wf-|jabra|jbl|bose|sony|beats/i.test(d.label);
              const isHeadphones = /headphone|earbud|airpod|buds|wf-|wh-/i.test(d.label);
              const Icon = isHeadphones ? Headphones : isBT ? Bluetooth : Speaker;
              return (
                <li key={d.deviceId}>
                  <button
                    onClick={() => setOutput(d)}
                    className={`w-full text-left flex items-center gap-3 p-4 hover:bg-emerald-50/60 transition
                                ${active ? 'bg-emerald-50/80' : ''}`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center
                                      ${active ? 'bg-gold-gradient text-midnight-900' : 'bg-emerald-100 text-emerald-800'}`}>
                      <Icon size={18}/>
                    </span>
                    <span className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{d.label}</p>
                      <p className="text-xs text-ink/55 truncate">
                        {isBT ? 'Bluetooth' : 'Wired / system'} · {active ? 'Selected' : 'Tap to use'}
                      </p>
                    </span>
                    {active && <CheckCircle2 size={18} className="text-emerald-700 shrink-0"/>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showDiag && diag && (
        <pre className="card card-pad text-[11px] leading-relaxed overflow-x-auto bg-slate-50 border-slate-200">
{`Browser:        ${diag.ua}
mediaDevices:   ${diag.hasMediaDevices}
enumerate:      ${diag.hasEnumerate}
selectAudioOut: ${diag.hasSelectOutput}
setSinkId:      ${diag.hasSetSinkId}
mic permission: ${enumPermission}

Total devices:  ${diag.totalDevices}  |  By kind: ${JSON.stringify(diag.byKind)}

Outputs raw:
${diag.rawOutputs.length === 0 ? '  (none)' : diag.rawOutputs.map(d => `  - ${d.id}  ${d.label}`).join('\n')}`}
        </pre>
      )}

      {/* ── Cast to Chromecast / Google Home / Nest (live, browser-native) ── */}
      <div className="card card-pad space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
              <Cast size={18}/>
            </span>
            <div>
              <h3 className="font-bold">Cast to Chromecast, Google Home &amp; Nest</h3>
              <p className="text-sm text-ink/60">
                Chrome finds Cast devices on your Wi-Fi automatically — pick one and Azan/Quran audio streams straight to it.
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
            ${cast.state === 'connected'      ? 'bg-emerald-100 text-emerald-800'
            : cast.state === 'not_connected'  ? 'bg-cyan-50 text-cyan-700'
            : cast.state === 'connecting'     ? 'bg-amber-50 text-amber-700'
            :                                   'bg-slate-100 text-slate-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cast.state === 'connected' || cast.state === 'not_connected' ? 'bg-emerald-500 animate-pulse-soft' : 'bg-slate-400'}`}/>
            {cast.state === 'connected'     ? 'Connected'
            : cast.state === 'not_connected' ? 'Devices available'
            : cast.state === 'connecting'    ? 'Connecting'
            : cast.state === 'no_devices'    ? 'No devices found'
            :                                  'Not supported here'}
          </span>
        </div>

        {cast.state === 'no_sdk' && (
          <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
            <p>Casting needs <strong>Chrome</strong> or <strong>Edge</strong>. Open this page there to cast to Chromecast, Google Home, or Nest. (Safari and Firefox have no Cast support.)</p>
          </div>
        )}

        {cast.state === 'no_devices' && (
          <div className="flex items-start gap-2 text-sm text-ink/70 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
            <Wifi size={16} className="shrink-0 mt-0.5 text-emerald-700"/>
            <p>No Cast devices found yet. Power on your Chromecast / Google Home / Nest and make sure it's on the <strong>same Wi-Fi</strong> as this computer — it appears here automatically, no rescan needed.</p>
          </div>
        )}

        {(cast.state === 'not_connected' || cast.state === 'connecting') && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={cast.selectDevice} disabled={cast.state === 'connecting'} className="btn-primary text-sm py-2 px-4 disabled:opacity-70">
              {cast.state === 'connecting' ? <Loader2 size={16} className="animate-spin"/> : <Cast size={16}/>}
              {cast.state === 'connecting' ? 'Connecting…' : 'Connect a Cast device'}
            </button>
            <button onClick={testCast} disabled={castBusy} className="btn-ghost text-sm py-2 px-4 disabled:opacity-70">
              {castBusy ? <Loader2 size={16} className="animate-spin"/> : <Volume2 size={16}/>} Test recitation
            </button>
          </div>
        )}

        {cast.state === 'connected' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              <Tv size={15}/> Casting to {cast.deviceName || 'your Cast device'}
            </span>
            <button onClick={testCast} disabled={castBusy} className="btn-ghost text-sm py-2 px-4 disabled:opacity-70">
              {castBusy ? <Loader2 size={16} className="animate-spin"/> : <Volume2 size={16}/>} Play test recitation
            </button>
            <button onClick={cast.stopCasting} className="btn-ghost text-sm py-2 px-4">Stop casting</button>
          </div>
        )}

        {castError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3">{castError}</div>
        )}

        <div className="flex items-start gap-2 text-xs text-ink/55 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <Info size={14} className="shrink-0 mt-0.5 text-slate-500"/>
          <p>
            <strong>Other device types:</strong> Bluetooth speakers &amp; earbuds work through the list above — pair them in Windows first, then pick them. Amazon Alexa/Echo needs a published Alexa Skill, and finding other PCs or phones on your Wi-Fi needs our companion app running on each device — browsers aren't allowed to scan the network directly.
          </p>
        </div>
      </div>

      {/* Already linked accounts (sample placeholder) */}
      <div>
        <h3 className="font-bold mb-3">Other devices on your account</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FALLBACK_LINKED.map((d: any, i: number) => {
            const Icon = ICON[d.kind] ?? Radio;
            const accent =
              d.status === 'playing' ? 'from-emerald-500 to-emerald-700' :
              d.status === 'online'  ? 'from-cyan-500 to-emerald-600'   :
                                       'from-slate-400 to-slate-600';
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="card card-pad relative overflow-hidden"
              >
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${accent} opacity-20`} />
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-white bg-gradient-to-br ${accent} shadow-md`}>
                    <Icon size={20} />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                                    ${d.status === 'playing'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : d.status === 'online'
                                        ? 'bg-cyan-50 text-cyan-700'
                                        : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'idle' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse-soft'}`}/>
                    {d.status}
                  </span>
                </div>
                <h3 className="mt-4 font-bold">{d.platform}</h3>
                <p className="text-sm text-ink/60">{d.user_name}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1"><Wifi size={12}/> {d.sync_group}</span>
                  <span className="inline-flex items-center gap-1"><Globe2 size={12}/> linked</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
