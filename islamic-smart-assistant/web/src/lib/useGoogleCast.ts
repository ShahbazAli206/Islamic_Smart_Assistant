'use client';

// ── Google Cast Web Sender ──────────────────────────────────────────────────
// Discover + play to Chromecast, Google Home, and Nest speakers from the browser.
//
// What's actually possible here (and why this is the ONLY way to reach those
// devices from a website): browsers cannot scan the Wi-Fi/LAN themselves, but
// Chrome/Edge ship a Cast stack that discovers Cast-enabled devices via mDNS on
// our behalf. This SDK surfaces that as a live "are devices available?" signal
// plus a native picker. We then hand the device a PUBLIC media URL and it streams
// the audio itself — so the URL must be reachable BY THE DEVICE (a localhost dev
// URL won't be; a public CDN/HTTPS URL or a same-LAN address will).
//
// Caveats:
//   • Only Chromium browsers with Cast support load the SDK (state === 'no_sdk'
//     elsewhere — Safari/Firefox/iOS have no Cast).
//   • Discovery is automatic and live; there is no JS "rescan" call. Powering a
//     device on flips state from 'no_devices' → 'not_connected' on its own.
//   • The receiver streams the media itself; we can observe play/pause/volume
//     through a RemotePlayer, surface load errors, and stop the session.
import { useCallback, useEffect, useRef, useState } from 'react';

const CAST_SDK_SRC =
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
// If the SDK never calls back (offline, blocked, non-Chromium) we give up and
// fall back to 'no_sdk' so the UI can explain what to do instead of spinning.
const SDK_LOAD_TIMEOUT_MS = 10_000;
// A device that's busy / controlled by another app can leave requestSession()
// pending forever (it never resolves OR rejects). Bound the wait so the UI can
// recover with an actionable "device in use" message instead of hanging. Kept
// generous because the picker-open time counts here too (the user may still be
// choosing); a Cancel button gives immediate manual recovery in the meantime.
const CONNECT_TIMEOUT_MS = 30_000;

/** Reject with a sentinel { code: 'connect_timeout' } if `p` doesn't settle in time. */
function withConnectTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject({ code: 'connect_timeout' }), CONNECT_TIMEOUT_MS);
  });
  return Promise.race([p, guard]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export type CastState =
  | 'loading'       // SDK script injected, waiting for it to initialize
  | 'no_sdk'        // SDK didn't load (non-Chromium browser, blocked, offline, timed out)
  | 'no_devices'    // SDK ready, but no Cast device found on the network yet
  | 'not_connected' // device(s) available, not currently casting
  | 'connecting'
  | 'connected';

export type CastMediaState = 'idle' | 'buffering' | 'playing' | 'paused';

export type UseGoogleCast = {
  state: CastState;
  /** Playback state of the media on the connected device. */
  mediaState: CastMediaState;
  /** Friendly name of the connected Cast device (empty when not connected). */
  deviceName: string;
  /** Title of whatever is currently loaded on the device. */
  mediaTitle: string;
  /** Receiver volume, 0..1 (best-effort; only meaningful while connected). */
  volume: number;
  /** Last human-readable error, or null. Cleared by clearError(). */
  error: string | null;
  /** Whether this browser can cast at all (Chromium desktop, not iOS/Safari/Firefox). */
  browserSupported: boolean;
  /** Open Chrome's native picker to choose a Cast device (also triggers discovery). */
  selectDevice: () => Promise<void>;
  /** Load an audio URL onto the connected device (prompts for a device if none). */
  castAudio: (url: string, title?: string) => Promise<void>;
  /** Toggle play/pause on the connected device. */
  pauseResume: () => void;
  /** Set receiver volume, 0..1. */
  setVolume: (v: number) => void;
  /** Stop the current Cast session. */
  stopCasting: () => void;
  /** Clear the current error message. */
  clearError: () => void;
};

/** Best-effort content-type from a media URL's extension. */
function guessContentType(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.m4a') || clean.endsWith('.mp4') || clean.endsWith('.aac')) return 'audio/mp4';
  if (clean.endsWith('.ogg') || clean.endsWith('.oga')) return 'audio/ogg';
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.flac')) return 'audio/flac';
  if (clean.endsWith('.webm')) return 'audio/webm';
  return 'audio/mpeg';
}

/** Map a Cast SDK error code (string) to a friendly, actionable message. */
function friendlyCastError(code: unknown): string | null {
  const c = String((code as any)?.code ?? code ?? '').toLowerCase();
  switch (c) {
    case 'cancel':
      return null; // user dismissed the picker — not an error
    case 'timeout':
      return 'The Cast device took too long to respond. Make sure it is powered on and on the same Wi-Fi.';
    case 'receiver_unavailable':
      return 'No Cast device is reachable. Check that it is powered on and connected to the same Wi-Fi network as this computer.';
    case 'session_error':
      return 'Could not start the Cast session. The device may be in use by another app — stop playback there, then try again.';
    case 'channel_error':
      return 'Lost the connection to the Cast device. Move closer to your router or restart the device, then try again.';
    case 'connect_timeout':
      return 'Couldn’t connect to that device. It may be in use by another phone or app, or busy with another session — stop playback there (or restart the device), then try again.';
    case 'load_failed':       // older SDK spelling — keep as an alias
    case 'load_media_failed': // actual chrome.cast.ErrorCode.LOAD_MEDIA_FAILED
      return 'The device couldn’t load this audio. The source may be temporarily unavailable, or the link isn’t reachable by the device — it must be a public HTTPS URL (not a local/localhost address). Try again, or pick a different voice.';
    case 'invalid_parameter':
      return 'This audio could not be sent to the device (invalid media).';
    case 'extension_missing':
    case 'extension_not_compatible':
      return 'Casting support is missing in this browser. Use desktop Chrome or Microsoft Edge.';
    case 'api_not_initialized':
      return 'Casting is not ready yet — wait a moment and try again.';
    case '':
      return 'Casting failed. Please try again.';
    default:
      return `Casting failed (${c}). Please try again.`;
  }
}

export function useGoogleCast(): UseGoogleCast {
  const [state, setState] = useState<CastState>('loading');
  const [mediaState, setMediaState] = useState<CastMediaState>('idle');
  const [deviceName, setDeviceName] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [volume, setVolumeState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(false);

  const ctxRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  // True when the user deliberately ended the session, so an ensuing
  // connected→disconnected transition isn't reported as a dropped connection.
  const userStoppedRef = useRef(false);
  // Previous cast state, to detect uninitiated disconnects (device powered off / Wi-Fi drop).
  const prevStateRef = useRef<CastState>('loading');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as any;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // CastContext is a process-wide singleton, so listeners we add must be
    // removed on unmount or they accumulate across navigations.
    const removers: Array<() => void> = [];

    // Up-front capability check so we can message the user even before the SDK
    // loads. Cast works in Chromium desktop browsers (Chrome/Edge/Brave); it is
    // unavailable on iOS, Safari, and Firefox.
    const ua = navigator.userAgent;
    const isChromium = /\b(Chrome|Chromium|Edg|CriOS|Brave)\b/.test(ua) && !/\b(Firefox|FxiOS)\b/.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1 && /Safari/.test(ua) && !/Chrome/.test(ua));
    const supported = isChromium && !isIOS;
    setBrowserSupported(supported);

    if (!supported) {
      setState('no_sdk');
      return;
    }

    const mapState = (s: string): CastState => {
      switch (s) {
        case 'NO_DEVICES_AVAILABLE': return 'no_devices';
        case 'NOT_CONNECTED':        return 'not_connected';
        case 'CONNECTING':           return 'connecting';
        case 'CONNECTED':            return 'connected';
        default:                     return 'no_devices';
      }
    };

    const mapPlayerState = (s: string | undefined): CastMediaState => {
      switch (s) {
        case 'PLAYING':   return 'playing';
        case 'PAUSED':    return 'paused';
        case 'BUFFERING': return 'buffering';
        default:          return 'idle';
      }
    };

    const init = () => {
      const cast = w.cast;
      const chrome = w.chrome;
      if (!cast?.framework || !chrome?.cast) { setState('no_sdk'); return; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

      const context = cast.framework.CastContext.getInstance();
      context.setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });
      ctxRef.current = context;

      const syncSession = () => {
        if (cancelled) return;
        const cur = mapState(context.getCastState());
        // Surface an unexpected drop (device powered off / Wi-Fi blip) — but not
        // when the user pressed Stop themselves.
        if (prevStateRef.current === 'connected' && cur !== 'connected') {
          if (!userStoppedRef.current) {
            setError('Lost the connection to the Cast device. It may have powered off or dropped off Wi-Fi — reconnect to continue.');
          }
          userStoppedRef.current = false; // consume the flag
        }
        prevStateRef.current = cur;
        setState(cur);
        const session = context.getCurrentSession?.();
        setDeviceName(session?.getCastDevice?.()?.friendlyName ?? '');
      };
      const csChanged = cast.framework.CastContextEventType.CAST_STATE_CHANGED;
      const ssChanged = cast.framework.CastContextEventType.SESSION_STATE_CHANGED;
      context.addEventListener(csChanged, syncSession);
      context.addEventListener(ssChanged, syncSession);
      removers.push(() => { try { context.removeEventListener(csChanged, syncSession); context.removeEventListener(ssChanged, syncSession); } catch { /* ignore */ } });

      // RemotePlayer mirrors the receiver's playback so we can show play/pause,
      // the current title, and volume — and drive them from our own controls.
      try {
        const player = new cast.framework.RemotePlayer();
        const controller = new cast.framework.RemotePlayerController(player);
        playerRef.current = player;
        controllerRef.current = controller;

        const syncPlayer = () => {
          if (cancelled) return;
          setMediaState(player.isConnected ? mapPlayerState(player.playerState) : 'idle');
          setMediaTitle(player.mediaInfo?.metadata?.title ?? '');
          if (typeof player.volumeLevel === 'number') setVolumeState(player.volumeLevel);
        };
        const E = cast.framework.RemotePlayerEventType;
        const playerEvents = [E.IS_CONNECTED_CHANGED, E.PLAYER_STATE_CHANGED, E.IS_PAUSED_CHANGED, E.MEDIA_INFO_CHANGED, E.VOLUME_LEVEL_CHANGED];
        playerEvents.forEach((ev) => controller.addEventListener(ev, syncPlayer));
        removers.push(() => { try { playerEvents.forEach((ev) => controller.removeEventListener(ev, syncPlayer)); } catch { /* ignore */ } });
        syncPlayer();
      } catch {
        /* RemotePlayer unavailable — session state still works without it. */
      }

      syncSession();
    };

    // The SDK invokes this global once it has loaded.
    const prev = w.__onGCastApiAvailable;
    const myHandler = (isAvailable: boolean) => {
      if (typeof prev === 'function') { try { prev(isAvailable); } catch { /* ignore */ } }
      if (cancelled) return;
      if (isAvailable) init();
      else setState('no_sdk');
    };
    w.__onGCastApiAvailable = myHandler;

    if (w.cast?.framework) {
      init(); // SDK already present (e.g. re-mount) — init directly.
    } else {
      if (!document.querySelector(`script[src="${CAST_SDK_SRC}"]`)) {
        const s = document.createElement('script');
        s.src = CAST_SDK_SRC;
        s.async = true;
        s.onerror = () => { if (!cancelled) setState('no_sdk'); };
        document.head.appendChild(s);
      }
      // Guard against the callback never firing (blocked/offline).
      timeoutId = setTimeout(() => {
        if (!cancelled && !w.cast?.framework) setState('no_sdk');
      }, SDK_LOAD_TIMEOUT_MS);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      removers.forEach((r) => r());
      // Restore the previous global so the chain of dead closures can't grow.
      if (w.__onGCastApiAvailable === myHandler) w.__onGCastApiAvailable = prev;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const selectDevice = useCallback(async () => {
    setError(null);
    const ctx = ctxRef.current;
    if (!ctx) return;
    userStoppedRef.current = false;
    try {
      await withConnectTimeout(ctx.requestSession());
    } catch (e) {
      const code = String((e as any)?.code ?? e ?? '').toLowerCase();
      if (code === 'connect_timeout') { try { ctx.endCurrentSession?.(true); } catch { /* ignore */ } }
      const msg = friendlyCastError(e);
      if (msg) setError(msg);
    }
  }, []);

  const stopCasting = useCallback(() => {
    userStoppedRef.current = true; // suppress the "lost connection" warning for a user-initiated stop
    try { ctxRef.current?.endCurrentSession?.(true); } catch { /* ignore */ }
    setMediaState('idle');
    setMediaTitle('');
  }, []);

  const pauseResume = useCallback(() => {
    try { controllerRef.current?.playOrPause?.(); } catch { /* ignore */ }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    const player = playerRef.current, controller = controllerRef.current;
    if (player && controller) {
      try { player.volumeLevel = clamped; controller.setVolumeLevel(); } catch { /* ignore */ }
    }
  }, []);

  const castAudio = useCallback(async (url: string, title = 'Noor — Islamic Assistant') => {
    setError(null);
    const w = window as any;
    const cast = w.cast, chrome = w.chrome, ctx = ctxRef.current;
    if (!cast || !chrome || !ctx) {
      const msg = 'Casting is not available in this browser. Use desktop Chrome or Microsoft Edge.';
      setError(msg);
      throw new Error(msg);
    }

    let session = ctx.getCurrentSession();
    if (!session) {
      userStoppedRef.current = false;
      try {
        await withConnectTimeout(ctx.requestSession()); // shows the native picker
      } catch (e) {
        const code = String((e as any)?.code ?? e ?? '').toLowerCase();
        if (code === 'connect_timeout') { try { ctx.endCurrentSession?.(true); } catch { /* ignore */ } }
        const msg = friendlyCastError(e);
        if (msg) { setError(msg); throw new Error(msg); }
        return; // user cancelled — silent
      }
      session = ctx.getCurrentSession();
    }
    if (!session) {
      const msg = 'No Cast device was selected.';
      setError(msg);
      throw new Error(msg);
    }

    const mediaInfo = new chrome.cast.media.MediaInfo(url, guessContentType(url));
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = title;
    mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.MUSIC_TRACK;

    try {
      await session.loadMedia(new chrome.cast.media.LoadRequest(mediaInfo));
      setMediaTitle(title);
    } catch (e) {
      const msg = friendlyCastError(e) ?? 'The device could not play this audio.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  return {
    state, mediaState, deviceName, mediaTitle, volume, error, browserSupported,
    selectDevice, castAudio, pauseResume, setVolume, stopCasting, clearError,
  };
}
