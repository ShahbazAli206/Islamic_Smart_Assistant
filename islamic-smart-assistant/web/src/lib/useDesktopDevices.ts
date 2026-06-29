'use client';

// Bridge to the Electron desktop app's LAN device layer (see
// desktop/electron/devices/*). On the plain web build `window.desktop.devices`
// is undefined, so `supported` stays false and the UI hides this section.
//
// Unlike the browser Cast SDK (which can only surface an availability signal +
// Chrome's native picker), the desktop process scans the LAN itself and gives us
// a real, named device list we can render and control directly.

import { useCallback, useEffect, useRef, useState } from 'react';

export type LanDeviceKind = 'chromecast' | 'airplay' | 'alexa' | 'dlna';

export interface LanDevice {
  id: string;
  name: string;
  kind: LanDeviceKind;
  host: string | null;
  port: number | null;
  model: string;
  capabilities: { cast: boolean };
}

export type PlaySource =
  // bundled file served over the LAN media server; fallbackUrl is a public stream
  // the device retries if it can't reach the LAN server (firewall / wrong subnet).
  | { kind: 'lan'; path: string; title?: string; fallbackUrl?: string }
  | { kind: 'url'; url: string; title?: string };    // already-public URL (CDN) the device fetches directly

interface DesktopDevicesApi {
  list: () => Promise<LanDevice[]>;
  rescan: () => Promise<LanDevice[]>;
  mediaBase: () => Promise<string | null>;
  play: (args: { deviceId: string; source: PlaySource; title?: string }) => Promise<{ ok: boolean }>;
  stop: (args: { deviceId: string }) => Promise<{ ok: boolean }>;
  setVolume: (args: { deviceId: string; level: number }) => Promise<{ ok: boolean }>;
  onChanged: (cb: (list: LanDevice[]) => void) => () => void;
}

/** Strip Electron's "Error invoking remote method 'x': Error: " wrapper. */
function cleanErr(e: any): string {
  const m = e?.message ?? String(e);
  const i = m.lastIndexOf('Error: ');
  return i >= 0 ? m.slice(i + 7) : m;
}

function getApi(): DesktopDevicesApi | null {
  if (typeof window === 'undefined') return null;
  return (window as any).desktop?.devices ?? null;
}

const SESSION_ACTIVE_KEY = 'isa:lanActiveId';
const SESSION_ACTIVE_LABEL_KEY = 'isa:lanActiveLabel';

function readSession(): { id: string | null; label: string | null } {
  try {
    return {
      id: sessionStorage.getItem(SESSION_ACTIVE_KEY),
      label: sessionStorage.getItem(SESSION_ACTIVE_LABEL_KEY),
    };
  } catch { return { id: null, label: null }; }
}
function writeSession(id: string | null, label?: string) {
  try {
    if (id) { sessionStorage.setItem(SESSION_ACTIVE_KEY, id); sessionStorage.setItem(SESSION_ACTIVE_LABEL_KEY, label ?? id); }
    else { sessionStorage.removeItem(SESSION_ACTIVE_KEY); sessionStorage.removeItem(SESSION_ACTIVE_LABEL_KEY); }
  } catch { /* ignore */ }
}

export function useDesktopDevices() {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<LanDevice[]>([]);
  // activeId is persisted in sessionStorage so it survives page navigation.
  const [activeId, setActiveIdState] = useState<string | null>(() => readSession().id);
  const [activeLabel, setActiveLabelState] = useState<string | null>(() => readSession().label);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<DesktopDevicesApi | null>(null);

  const setActiveId = (id: string | null, label?: string) => {
    setActiveIdState(id);
    setActiveLabelState(id ? (label ?? id) : null);
    writeSession(id, label);
  };

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    apiRef.current = api;
    setSupported(true);
    let unsub = () => {};
    api.list().then((l) => setDevices(l || [])).catch(() => {});
    try { unsub = api.onChanged((l) => setDevices(l || [])); } catch { /* ignore */ }
    return () => { try { unsub(); } catch { /* ignore */ } };
  }, []);

  const rescan = useCallback((): Promise<void> => {
    if (!apiRef.current) return Promise.resolve();
    return apiRef.current.rescan().then((l) => { if (l) setDevices(l); }).catch(() => {});
  }, []);

  const play = useCallback(async (deviceId: string, source: PlaySource) => {
    setError(null);
    setBusyId(deviceId);
    try {
      await apiRef.current!.play({ deviceId, source, title: source.title });
      setActiveId(deviceId, source.title);
    } catch (e) {
      setError(cleanErr(e));
      throw e;
    } finally {
      setBusyId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(async (deviceId: string) => {
    setError(null);
    try {
      await apiRef.current!.stop({ deviceId });
    } catch (e) {
      setError(cleanErr(e));
    } finally {
      // Clear only if this device was the active one.
      setActiveIdState((cur) => {
        if (cur === deviceId) { writeSession(null); return null; }
        return cur;
      });
      setActiveLabelState((cur) => (cur != null && readSession().id == null ? null : cur));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVolume = useCallback(async (deviceId: string, level: number) => {
    try {
      await apiRef.current!.setVolume({ deviceId, level });
    } catch (e) {
      setError(cleanErr(e));
    }
  }, []);

  return {
    supported, devices, activeId, activeLabel, busyId, error,
    play, stop, setVolume, rescan,
    clearError: () => setError(null),
  };
}
