'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone, Tablet, Monitor, Speaker, Headphones, Sparkles, Radio, Wifi, Globe2,
  Bluetooth, RefreshCw, Volume2, CheckCircle2, AlertTriangle, ExternalLink, Info,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';

type AudioOut = { deviceId: string; label: string };

const FALLBACK_LINKED = [
  { id: '1', user_name: 'Aisha Khan',   platform: 'iPhone 15',     sync_group: 'Home',   kind: 'mobile',  status: 'playing' },
  { id: '2', user_name: 'Aisha Khan',   platform: 'iPad Pro',      sync_group: 'Home',   kind: 'tablet',  status: 'online' },
  { id: '3', user_name: 'Yusuf Rahman', platform: 'Macbook Pro',   sync_group: 'Office', kind: 'desktop', status: 'online' },
];

const ICON: Record<string, any> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor, speaker: Speaker, earbuds: Headphones,
};

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

  // Detect picker support on mount
  useEffect(() => {
    setPickerSupported(
      typeof navigator !== 'undefined' &&
      typeof (navigator.mediaDevices as any)?.selectAudioOutput === 'function',
    );
    refreshList();
  }, []);

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

      setOutputs(outs.map((d) => ({ deviceId: d.deviceId, label: d.label || 'Output device' })));
      await captureDiag();
    } catch (e: any) {
      setError(`Couldn't list audio devices: ${e?.message ?? e}`);
      await captureDiag();
    } finally {
      setScanning(false);
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
          <button onClick={refreshList} className="btn-ghost text-sm py-2 px-4">
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''}/> Rescan
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
              {outputs.length} audio output{outputs.length === 1 ? '' : 's'} known to Windows
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

      {/* Smart-speaker integrations — honest about backend dependency */}
      <div className="card card-pad space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
            <Radio size={18}/>
          </span>
          <div>
            <h3 className="font-bold">Smart-speaker integrations</h3>
            <p className="text-sm text-ink/60">
              Browsers can't discover Alexa or Google Home devices on your network — those clouds are walled off. Real integration goes through a custom Alexa Skill and a Google Smart Home Action that talk to our backend.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: 'Amazon Alexa / Echo', tag: 'Requires Alexa Skill', color: 'from-cyan-500 to-indigo-600' },
            { label: 'Google Home / Nest',  tag: 'Requires Smart Home Action', color: 'from-rose-500 to-amber-500' },
            { label: 'Google Cast / Chromecast', tag: 'Browser-native (coming soon)', color: 'from-emerald-500 to-emerald-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border border-emerald-100 bg-white p-3`}>
              <p className="font-semibold">{s.label}</p>
              <p className="text-xs text-ink/55 mt-1">{s.tag}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 text-xs text-ink/55 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
          <Info size={14} className="shrink-0 mt-0.5 text-emerald-700"/>
          <p>
            For now, the cleanest way to broadcast Azan to a smart speaker is: pair it as a regular Bluetooth speaker with this PC, then pick it as the output above. Alexa/Google Home support will arrive when the backend Skills are published.
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
