'use client';

// Browser audio-output enumeration for the Quran player's device menu.
//
// This is a standalone copy of the same grouping approach used on the Devices
// page (web/src/app/dashboard/devices/page.tsx) — duplicated on purpose rather
// than imported, so this feature can never change that page's behaviour.

import { useCallback, useEffect, useState } from 'react';

export type AudioOutputDevice = {
  /** setSinkId()-compatible id of the best mode for this physical device. */
  id: string;
  name: string;
  isBluetooth: boolean;
  isDefault: boolean;
};

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
    ).join(' ').trim();
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
): AudioOutputDevice[] {
  const real = labelled.filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications');
  const realKeys = new Set(
    real.map((d) => {
      const { name, modeLabel } = extractDeviceName(d.label);
      return `${name.toLowerCase()}::${modeLabel.toLowerCase()}`;
    }),
  );
  // The browser's "default" pseudo-device carries the OS's currently selected
  // output as its own label, so its (name, mode) key tells us which REAL
  // device is the default — capture that here, before the dedup filter below
  // discards the pseudo-device (it duplicates a real entry in the common case,
  // so it shouldn't also render as its own row, but its default-ness still
  // needs to land on the real device's group).
  const defaultKeys = new Set(
    labelled
      .filter((d) => d.deviceId === 'default')
      .map((d) => {
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

  const nameMap = new Map<string, typeof toProcess>();
  toProcess.forEach((d) => {
    const { name } = extractDeviceName(d.label);
    const key = name.toLowerCase().trim();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(d);
  });

  return [...nameMap.entries()].map(([, devices]) => {
    const modes = devices
      .map((d) => {
        const { name, modeLabel } = extractDeviceName(d.label);
        return { deviceId: d.deviceId, label: d.label, name, modeLabel, quality: modePriority(modeLabel) };
      })
      .sort((a, b) => a.quality - b.quality);
    const best = modes[0];
    const isBT =
      /bluetooth/i.test(best.label) ||
      /airpod|g\d+\s*pro|jabra|jbl|bose|sony|beats|havit|edifier|anker|soundcore|skullcandy|sennheiser/i.test(
        best.name,
      );
    const isDefault =
      devices.some((d) => d.deviceId === 'default') ||
      modes.some((m) => defaultKeys.has(`${m.name.toLowerCase()}::${m.modeLabel.toLowerCase()}`));
    return {
      id: best.deviceId,
      name: best.name || 'Audio Device',
      isBluetooth: isBT,
      isDefault,
    };
  });
}

/** Browser-only audio output devices (system speakers + Bluetooth-named outputs). */
export function useAudioOutputDevices() {
  const [supported, setSupported] = useState(false);
  const [devices, setDevices] = useState<AudioOutputDevice[]>([]);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      let devs = await navigator.mediaDevices.enumerateDevices();
      let outs = devs.filter((d) => d.kind === 'audiooutput');

      if (outs.length === 0 || outs.every((d) => !d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          devs = await navigator.mediaDevices.enumerateDevices();
          outs = devs.filter((d) => d.kind === 'audiooutput');
        } catch { /* permission denied — fall back to unlabeled entries */ }
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

      setDevices(buildDeviceGroups(labelled));
    } catch { /* leave devices as-is */ }
  }, []);

  useEffect(() => {
    const hasEnumerate = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.enumerateDevices;
    setSupported(hasEnumerate);
    if (!hasEnumerate) return;
    refresh();
    const md = navigator.mediaDevices;
    if (typeof md.addEventListener === 'function') {
      md.addEventListener('devicechange', refresh);
      return () => md.removeEventListener('devicechange', refresh);
    }
  }, [refresh]);

  return { supported, devices, refresh };
}
