'use client';

// ── Google Cast Web Sender ──────────────────────────────────────────────────
// Discover + play to Chromecast, Google Home, and Nest speakers from the browser.
//
// What's actually possible here (and why this is the ONLY way to reach those
// devices from a website): browsers cannot scan the Wi-Fi/LAN themselves, but
// Chrome/Edge ship a Cast stack that discovers Cast-enabled devices via mDNS on
// our behalf. This SDK surfaces that as a live "are devices available?" signal
// plus a native picker. We then hand the device a PUBLIC media URL and it streams
// the audio itself — so the URL must be reachable by the device (a localhost dev
// URL won't be; a public CDN/HTTPS URL will).
//
// Caveats:
//   • Only Chromium browsers with Cast support load the SDK (state === 'no_sdk'
//     elsewhere — Safari/Firefox have no Cast).
//   • Discovery is automatic and live; there is no JS "rescan" call. Powering a
//     device on flips state from 'no_devices' → 'not_connected' on its own.
import { useCallback, useEffect, useRef, useState } from 'react';

const CAST_SDK_SRC =
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

export type CastState =
  | 'no_sdk'        // SDK didn't load (non-Chromium browser, blocked, etc.)
  | 'no_devices'    // SDK ready, but no Cast device found on the network
  | 'not_connected' // device(s) available, not currently casting
  | 'connecting'
  | 'connected';

export type UseGoogleCast = {
  state: CastState;
  deviceName: string;
  /** Open Chrome's native picker to choose a Cast device (also triggers discovery). */
  selectDevice: () => Promise<void>;
  /** Load an audio URL onto the connected device (prompts for a device if none). */
  castAudio: (url: string, title?: string) => Promise<void>;
  /** Stop the current Cast session. */
  stopCasting: () => void;
};

export function useGoogleCast(): UseGoogleCast {
  const [state, setState] = useState<CastState>('no_sdk');
  const [deviceName, setDeviceName] = useState('');
  const ctxRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as any;
    let cancelled = false;

    const mapState = (s: string): CastState => {
      switch (s) {
        case 'NO_DEVICES_AVAILABLE': return 'no_devices';
        case 'NOT_CONNECTED':        return 'not_connected';
        case 'CONNECTING':           return 'connecting';
        case 'CONNECTED':            return 'connected';
        default:                     return 'no_devices';
      }
    };

    const init = () => {
      const cast = w.cast;
      const chrome = w.chrome;
      if (!cast?.framework || !chrome?.cast) { setState('no_sdk'); return; }

      const context = cast.framework.CastContext.getInstance();
      context.setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });
      ctxRef.current = context;

      const sync = () => {
        if (cancelled) return;
        setState(mapState(context.getCastState()));
        const session = context.getCurrentSession?.();
        setDeviceName(session?.getCastDevice?.()?.friendlyName ?? '');
      };
      context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, sync);
      context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, sync);
      sync();
    };

    // The SDK invokes this global once it has loaded.
    w.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (!cancelled && isAvailable) init();
    };

    if (w.cast?.framework) {
      init(); // SDK already present (e.g. re-mount) — init directly.
    } else if (!document.querySelector(`script[src="${CAST_SDK_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = CAST_SDK_SRC;
      s.async = true;
      document.head.appendChild(s);
    }

    return () => { cancelled = true; };
  }, []);

  const selectDevice = useCallback(async () => {
    try { await ctxRef.current?.requestSession(); } catch { /* user dismissed picker */ }
  }, []);

  const stopCasting = useCallback(() => {
    ctxRef.current?.endCurrentSession?.(true);
  }, []);

  const castAudio = useCallback(async (url: string, title = 'Noor — Islamic Assistant') => {
    const w = window as any;
    const cast = w.cast, chrome = w.chrome, ctx = ctxRef.current;
    if (!cast || !chrome || !ctx) throw new Error('Casting is not available in this browser.');

    let session = ctx.getCurrentSession();
    if (!session) {
      await ctx.requestSession();      // shows the picker
      session = ctx.getCurrentSession();
    }
    if (!session) throw new Error('No Cast device was selected.');

    const mediaInfo = new chrome.cast.media.MediaInfo(url, 'audio/mpeg');
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = title;
    await session.loadMedia(new chrome.cast.media.LoadRequest(mediaInfo));
  }, []);

  return { state, deviceName, selectDevice, castAudio, stopCasting };
}
