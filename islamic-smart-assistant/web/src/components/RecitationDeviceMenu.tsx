'use client';

// ── "Play on devices" menu for the Quran recitation player ──────────────────
// Lets the listener select/deselect ANY number of audio outputs at once —
// system speakers, Bluetooth-named outputs, and (on the desktop app) real
// network cast devices (Chromecast / Nest / DLNA) discovered over the LAN, or
// (on plain web, no desktop app) a single browser Google Cast device.
//
// Reuses the existing device hooks untouched:
//   • useDesktopDevices() — desktop's real mDNS/SSDP LAN discovery + castv2/DLNA
//     playback (same hook the Devices page's LAN section already uses).
//   • useGoogleCast()     — browser Cast SDK sender (web fallback only; the
//     desktop app reaches Chromecast/Nest directly over the LAN instead, which
//     supports true simultaneous multi-device casting the browser SDK cannot).
// Browser audio-output enumeration is a standalone copy (see
// lib/audioOutputDevices.ts) so this feature can never affect the Devices page.
//
// The panel is rendered through a portal into document.body, positioned from
// the trigger button's live bounding rect. The player card that hosts the
// trigger has `overflow-hidden` (for its rounded photographic background), so
// an ordinary CSS-absolute panel gets clipped whenever it grows past the
// card's edge — a portal escapes that ancestor entirely. The panel is always
// styled as dark glass (not toggled by the app-wide light/dark setting): the
// player card itself is a permanently dark, photographic surface in both
// modes, so a panel that switched to a plain white background looked out of
// place sitting on top of it.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Cast, Speaker, Bluetooth, Tv, CheckCircle2, Loader2 } from 'lucide-react';
import { useAudioOutputDevices } from '@/lib/audioOutputDevices';
import { useDesktopDevices } from '@/lib/useDesktopDevices';
import { useGoogleCast } from '@/lib/useGoogleCast';
import { useLocalStorage } from '@/lib/useLocalStorage';

type Props = {
  /** Current ayah/translation audio URL (null while nothing castable is loaded). */
  url: string | null;
  playing: boolean;
  title: string;
  /** The main player's active <audio> element — muted (not paused) while this
   *  menu is driving one or more local outputs, so it keeps firing its own
   *  `ended` events (ayah advance keeps working) without also being audible. */
  mainAudioRef: React.RefObject<HTMLAudioElement | null>;
};

const PANEL_W = 300;
const PANEL_MAX_H = 380;
const GAP = 12;

type Anchor = { left: number; openUp: boolean; edgeTop: number; edgeBottom: number };

export function RecitationDeviceMenu({ url, playing, title, mainAudioRef }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const output = useAudioOutputDevices();
  const lan = useDesktopDevices();
  const gcast = useGoogleCast();

  const [outputIds, setOutputIds] = useLocalStorage<string[]>('isa:quranOutputIds', []);
  const [lanIds, setLanIds] = useLocalStorage<string[]>('isa:quranLanDeviceIds', []);
  const [gcastOn, setGcastOn] = useLocalStorage<boolean>('isa:quranGcastOn', false);

  const measure = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceAbove > PANEL_MAX_H || spaceAbove > spaceBelow;
    const left = Math.min(Math.max(8, r.right - PANEL_W), window.innerWidth - PANEL_W - 8);
    setAnchor({ left, openUp, edgeTop: r.top - GAP, edgeBottom: r.bottom + GAP });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    // `true` (capture) so scrolling any ancestor — not just the window — re-anchors the panel.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Only http(s) URLs are reachable by LAN/Cast devices; local/TTS audio just
  // pauses on the network targets (nothing to send them) but still plays on
  // the main output as normal.
  const castableUrl = url && /^https?:\/\//i.test(url) ? url : null;

  // ── Local output clones — real simultaneous playback across N sinks ────────
  const clonesRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  useEffect(() => {
    const clones = clonesRef.current;
    for (const [id, el] of clones) {
      if (!outputIds.includes(id)) { el.pause(); el.src = ''; clones.delete(id); }
    }
    for (const id of outputIds) {
      if (clones.has(id)) continue;
      const el = new Audio();
      el.preload = 'auto';
      if (typeof (el as any).setSinkId === 'function') (el as any).setSinkId(id).catch(() => {});
      clones.set(id, el);
    }
    // Silence the main element while one or more local outputs are selected —
    // it keeps playing (so ayah-advance/onended logic is untouched) just muted.
    if (mainAudioRef.current) mainAudioRef.current.muted = outputIds.length > 0;
  }, [outputIds, mainAudioRef]);

  // Keep local clones (and the main element's mute state) mirroring the
  // player's current url/playing state as ayahs advance.
  useEffect(() => {
    if (mainAudioRef.current) mainAudioRef.current.muted = outputIds.length > 0;
    clonesRef.current.forEach((el) => {
      if (!castableUrl) { el.pause(); return; }
      if (el.src !== castableUrl) { el.src = castableUrl; el.currentTime = 0; }
      if (playing) el.play().catch(() => {}); else el.pause();
    });
  }, [castableUrl, playing, outputIds.length, mainAudioRef]);

  useEffect(() => () => {
    clonesRef.current.forEach((el) => { el.pause(); el.src = ''; });
    clonesRef.current.clear();
    if (mainAudioRef.current) mainAudioRef.current.muted = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── LAN cast devices (desktop only) — real simultaneous multi-device casting ──
  const lanUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lan.supported) return;
    if (!castableUrl || !playing) {
      if (lanUrlRef.current !== null) {
        lanUrlRef.current = null;
        lanIds.forEach((id) => lan.stop(id).catch(() => {}));
      }
      return;
    }
    if (lanUrlRef.current === castableUrl) return; // already pushed this ayah
    lanUrlRef.current = castableUrl;
    lanIds.forEach((id) => lan.play(id, { kind: 'url', url: castableUrl, title }).catch(() => {}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castableUrl, playing, lan.supported]);

  // ── Google Cast (web fallback only — one active receiver session) ──────────
  const gcastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gcastOn || lan.supported) return; // desktop already covers this via LAN above
    if (!castableUrl || !playing) {
      if (gcast.mediaState === 'playing') gcast.pauseResume();
      return;
    }
    if (gcastUrlRef.current === castableUrl) {
      if (gcast.mediaState === 'paused') gcast.pauseResume();
      return;
    }
    gcastUrlRef.current = castableUrl;
    gcast.castAudio(castableUrl, title).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castableUrl, playing, gcastOn, lan.supported]);

  const toggleOutput = (id: string) => {
    setOutputIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleLan = (id: string) => {
    const willBeOn = !lanIds.includes(id);
    setLanIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (!willBeOn) lan.stop(id).catch(() => {});
    else if (castableUrl && playing) lan.play(id, { kind: 'url', url: castableUrl, title }).catch(() => {});
  };

  const toggleGcast = () => {
    if (gcastOn) {
      setGcastOn(false);
      gcastUrlRef.current = null;
      gcast.stopCasting();
      return;
    }
    setGcastOn(true);
    if (castableUrl && playing) {
      gcastUrlRef.current = castableUrl;
      gcast.castAudio(castableUrl, title).catch(() => {});
    } else {
      gcast.selectDevice(); // just connect — nothing to load yet
    }
  };

  // Only devices cast.js can actually play to (matches the Devices page's own
  // behaviour — AirPlay/Alexa are discovered but not controllable there either).
  const castableLan = lan.devices.filter((d) => d.capabilities.cast);

  const totalSelectable = output.devices.length + (lan.supported ? castableLan.length : (gcast.browserSupported ? 1 : 0));
  const totalSelected = outputIds.length + (lan.supported ? lanIds.length : (gcastOn ? 1 : 0));
  const allSelected = totalSelectable > 0 && totalSelected >= totalSelectable;

  const selectAll = () => {
    setOutputIds(output.devices.map((d) => d.id));
    if (lan.supported) setLanIds(castableLan.map((d) => d.id));
    else if (gcast.browserSupported && !gcastOn) toggleGcast();
  };
  const deselectAll = () => {
    setOutputIds([]);
    if (lan.supported) { lanIds.forEach((id) => lan.stop(id).catch(() => {})); setLanIds([]); }
    else if (gcastOn) toggleGcast();
  };

  return (
    <div className="relative">
      <motion.button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        title="Play on devices"
        className={`relative p-2.5 rounded-full transition-colors ${
          totalSelected > 0 ? 'text-gold-300 bg-gold-400/10' : 'text-white/80 hover:bg-white/10'
        }`}
      >
        <Cast size={18} />
        {totalSelected > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold bg-gold-400 text-[#0c2018]">
            {totalSelected}
          </span>
        )}
      </motion.button>

      {anchor && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.88, y: anchor.openUp ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: anchor.openUp ? 10 : -10 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[999] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
              style={{
                left: anchor.left,
                width: PANEL_W,
                background: 'rgba(4,12,8,0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderColor: 'rgba(255,255,255,0.10)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(233,207,122,0.08)',
                ...(anchor.openUp
                  ? { bottom: window.innerHeight - anchor.edgeTop, maxHeight: anchor.edgeTop - 8 }
                  : { top: anchor.edgeBottom, maxHeight: window.innerHeight - anchor.edgeBottom - 8 }),
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wide text-parchment/60">
                  Play on devices
                </span>
                {totalSelectable > 0 && (
                  <button
                    onClick={allSelected ? deselectAll : selectAll}
                    className="text-xs font-semibold text-gold-300 hover:text-gold-200"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              <div className="overflow-y-auto py-1.5">
                {output.devices.length > 0 && (
                  <div className="px-2 pb-1.5">
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-parchment/40">
                      This device
                    </p>
                    {output.devices.map((d) => {
                      const on = outputIds.includes(d.id);
                      return (
                        <DeviceRow
                          key={d.id}
                          icon={d.isBluetooth ? <Bluetooth size={15} /> : <Speaker size={15} />}
                          name={d.name}
                          status={on ? (playing ? 'Playing' : 'Selected') : 'Not playing'}
                          on={on}
                          onClick={() => toggleOutput(d.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {lan.supported && (
                  <div className="px-2 pb-1.5">
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-parchment/40">
                      Cast to network devices
                    </p>
                    {castableLan.length === 0 ? (
                      <p className="px-2.5 py-1.5 text-xs text-parchment/45">
                        Searching your Wi-Fi network…
                      </p>
                    ) : castableLan.map((d) => {
                      const on = lanIds.includes(d.id);
                      return (
                        <DeviceRow
                          key={d.id}
                          icon={<Tv size={15} />}
                          name={d.name}
                          status={on ? (playing ? 'Playing' : 'Selected') : 'Not playing'}
                          busy={lan.busyId === d.id}
                          on={on}
                          onClick={() => toggleLan(d.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {!lan.supported && gcast.browserSupported && (
                  <div className="px-2 pb-1.5">
                    <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-parchment/40">
                      Google Cast
                    </p>
                    <DeviceRow
                      icon={<Tv size={15} />}
                      name={gcastOn ? (gcast.deviceName || 'Cast device') : 'Chromecast / Nest speaker'}
                      status={gcastOn ? (gcast.mediaState === 'playing' ? 'Playing' : 'Selected') : 'Not playing'}
                      on={gcastOn}
                      onClick={toggleGcast}
                    />
                    <p className="px-2.5 pt-1 text-[10px] text-parchment/40">
                      Only one Cast device can play at a time from a browser tab. Use the desktop app to cast to several at once.
                    </p>
                  </div>
                )}

                {output.devices.length === 0 && !lan.supported && !gcast.browserSupported && (
                  <p className="px-4 py-4 text-sm text-center text-parchment/50">
                    No devices found.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function DeviceRow({
  icon, name, status, on, busy, onClick,
}: {
  icon: ReactNode; name: string; status: string; on: boolean; busy?: boolean;
  onClick: () => void;
}) {
  const playingNow = status === 'Playing';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
        on ? 'bg-gold-400/12' : 'hover:bg-white/5'
      }`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
        on ? 'bg-gold-400/20 text-gold-300' : 'bg-white/[0.06] text-parchment/60'
      }`}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-parchment">{name}</p>
        <p className={`text-[11px] ${playingNow ? 'text-gold-300' : 'text-parchment/40'}`}>
          {status}
        </p>
      </span>
      {on && <CheckCircle2 size={15} className="shrink-0 text-gold-300" />}
    </button>
  );
}
