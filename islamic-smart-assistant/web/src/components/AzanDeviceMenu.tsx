'use client';

// ── "Azan plays on devices" menu ─────────────────────────────────────────────
// Settings counterpart to RecitationDeviceMenu.tsx. That menu drives LIVE
// playback for whichever ayah is currently open; this one doesn't drive
// anything itself — the Azan is scheduled, not on-demand, so there is no
// "currently playing" audio to steer while this panel is open. It only reads
// and writes the two localStorage lists AutoAzanScheduler checks at prayer
// time, so a selection made here takes effect the next time the Adhan fires:
//   • isa:azanLocalDeviceIds — outputs on THIS device (system speakers /
//     Bluetooth), played via cloned <audio> elements + setSinkId().
//   • isa:azanDeviceIds      — LAN cast devices (Chromecast/DLNA, desktop app
//     only). Same key the Devices page's per-card "Auto-Azan" chip already
//     toggles, so both surfaces stay in sync automatically.
//
// Visually mirrors RecitationDeviceMenu's dark-glass portal panel so the two
// "pick your devices" experiences feel like the same feature.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Speaker, Bluetooth, Tv, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAudioOutputDevices } from '@/lib/audioOutputDevices';
import { useDesktopDevices } from '@/lib/useDesktopDevices';
import { useAzanDeviceStorage } from '@/lib/useAzanDeviceStorage';

const PANEL_W = 300;
const PANEL_MAX_H = 380;
const GAP = 12;

type Anchor = { left: number; openUp: boolean; edgeTop: number; edgeBottom: number };

export function AzanDeviceMenu() {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const output = useAudioOutputDevices();
  const lan = useDesktopDevices();

  const [localIds, setLocalIds] = useAzanDeviceStorage<string[]>('isa:azanLocalDeviceIds', []);
  const [lanIds, setLanIds] = useAzanDeviceStorage<string[]>('isa:azanDeviceIds', []);

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

  const toggleLocal = (id: string) => {
    setLocalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleLan = (id: string) => {
    setLanIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Only devices cast.js can actually play to (matches the Devices page's own
  // behaviour — AirPlay/Alexa are discovered but not controllable there either).
  const castableLan = lan.devices.filter((d) => d.capabilities.cast);

  const totalSelectable = output.devices.length + (lan.supported ? castableLan.length : 0);
  const totalSelected = localIds.length + (lan.supported ? lanIds.length : 0);
  const allSelected = totalSelectable > 0 && totalSelected >= totalSelectable;

  const selectAll = () => {
    setLocalIds(output.devices.map((d) => d.id));
    if (lan.supported) setLanIds(castableLan.map((d) => d.id));
  };
  const deselectAll = () => {
    setLocalIds([]);
    if (lan.supported) setLanIds([]);
  };

  const label = totalSelected === 0
    ? 'Select Azan devices'
    : `Azan on ${totalSelected} device${totalSelected === 1 ? '' : 's'}`;

  return (
    <div className="relative">
      <motion.button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        title="Choose which devices play the Azan at prayer time"
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition ${
          totalSelected > 0
            ? 'bg-emerald-600 text-white shadow-glow-emerald hover:bg-emerald-700'
            : 'bg-white/90 backdrop-blur border border-emerald-200 text-emerald-800 hover:bg-white'
        }`}
      >
        <Bell size={16} /> {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
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
                  Azan plays on
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
                      const on = localIds.includes(d.id);
                      return (
                        <DeviceRow
                          key={d.id}
                          icon={d.isBluetooth ? <Bluetooth size={15} /> : <Speaker size={15} />}
                          name={d.name}
                          status={on ? 'Selected' : d.isDefault ? 'Default (not selected)' : 'Not selected'}
                          on={on}
                          onClick={() => toggleLocal(d.id)}
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
                          status={on ? 'Selected' : 'Not selected'}
                          on={on}
                          onClick={() => toggleLan(d.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {output.devices.length === 0 && !lan.supported && (
                  <p className="px-4 py-4 text-sm text-center text-parchment/50">
                    No devices found.
                  </p>
                )}
              </div>

              <p className="px-4 py-2.5 text-[10px] text-parchment/40 border-t border-white/10 shrink-0">
                Nothing selected? The Azan plays on your system&apos;s default output instead.
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function DeviceRow({
  icon, name, status, on, onClick,
}: {
  icon: ReactNode; name: string; status: string; on: boolean;
  onClick: () => void;
}) {
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
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-parchment">{name}</p>
        <p className="text-[11px] text-parchment/40">{status}</p>
      </span>
      {on && <CheckCircle2 size={15} className="shrink-0 text-gold-300" />}
    </button>
  );
}
