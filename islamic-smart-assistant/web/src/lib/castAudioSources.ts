'use client';

// ── Castable audio sources ──────────────────────────────────────────────────
// A Cast device (Chromecast / Google Home / Nest) fetches and streams the media
// itself, so any URL we hand it must be reachable BY THE DEVICE — not by this
// browser. Two hard requirements:
//   1. Not localhost/127.0.0.1 (to the device, those point at itself).
//   2. HTTPS. The Default Media Receiver is itself an HTTPS web app, and browser
//      mixed-content rules stop it fetching plain http:// media — so even a
//      same-LAN http://192.168.x address is refused. Only https:// URLs work.
// In practice that means: a public HTTPS deployment (or an HTTPS LAN address)
// can cast its own bundled files; a localhost/http dev server cannot, and falls
// back to a public HTTPS stream. These helpers encode that and tell the caller why.

/** A public-CDN recitation that is always castable (used for the "Test" button). */
export const RECITATION_CAST_TEST_URL =
  'https://cdn.islamic.network/quran/audio/192/ar.alafasy/1.mp3';

/** Public adhan stream used when the user's selected voice has no public URL
 *  AND the app is running on localhost (so its bundled file isn't reachable). */
const PUBLIC_ADHAN_FALLBACK = 'https://www.islamcan.com/audio/adhan/azan2.mp3'; // Makkah

// Minimal mirror of the azan voice table (web/src/app/dashboard/azan/page.tsx).
// `remote` is a public URL when one exists; otherwise it's the bundled local
// path, which is castable only when the app is served from a public/LAN origin.
type AzanSrc = { name: string; local: string; remote: string };
const AZAN: Record<string, AzanSrc> = {
  'hafiz-ahmed-raza-qadri':     { name: 'Hafiz Ahmed Raza Qadri', local: '/audio/azan/hafiz-ahmed-raza-qadri.m4a', remote: '/audio/azan/hafiz-ahmed-raza-qadri.m4a' },
  'egzon-ibrahimi':             { name: 'Egzon Ibrahimi',         local: '/audio/azan/egzon-ibrahimi.m4a',         remote: '/audio/azan/egzon-ibrahimi.m4a' },
  'abdul-rahman-mossad':        { name: 'Abdul Rahman Mossad',    local: '/audio/azan/abdul-rahman-mossad.m4a',    remote: '/audio/azan/abdul-rahman-mossad.m4a' },
  'mevlan-kurtishi':            { name: 'Mevlan Kurtishi',        local: '/audio/azan/mevlan-kurtishi.m4a',        remote: '/audio/azan/mevlan-kurtishi.m4a' },
  'masjid-nabawi-osama-akhdar': { name: 'Masjid Nabawi — Osama Al-Akhdar', local: '/audio/azan/masjid-nabawi-osama-akhdar.m4a', remote: '/audio/azan/masjid-nabawi-osama-akhdar.m4a' },
  'pakistan':                   { name: 'Pakistan Style',         local: '/audio/azan/pakistan.mp3', remote: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  'turkey':                     { name: 'Turkish — Istanbul',     local: '/audio/azan/turkey.mp3',   remote: 'https://www.islamcan.com/audio/adhan/azan6.mp3' },
  'egypt':                      { name: 'Egyptian — Cairo',       local: '/audio/azan/egypt.mp3',    remote: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
  'madinah-adhan':              { name: 'Azan Madinah',           local: '/audio/azan/madinah-adhan.m4a',  remote: '/audio/azan/madinah-adhan.m4a' },
  'islam-sobhi':                { name: 'Islam Sobhi',            local: '/audio/azan/islam-sobhi.m4a',    remote: '/audio/azan/islam-sobhi.m4a' },
  'makkah-abdallah-ahmad':      { name: 'Makkah — Abdallah Ahmad', local: '/audio/azan/makkah-abdallah-ahmad.m4a', remote: '/audio/azan/makkah-abdallah-ahmad.m4a' },
  'masjid-al-haram':            { name: 'Masjid Al-Haram',        local: '/audio/azan/masjid-al-haram.m4a', remote: '/audio/azan/masjid-al-haram.m4a' },
  'seyyid-taleh-boradigahi':    { name: 'Seyyid Taleh Boradigahi', local: '/audio/azan/seyyid-taleh-boradigahi.m4a', remote: '/audio/azan/seyyid-taleh-boradigahi.m4a' },
  'azan-best-sound-quality':    { name: 'Azan — Best Sound Quality', local: '/audio/Azan Best Sound quality.mp3', remote: '/audio/Azan Best Sound quality.mp3' },

  'makkah':                     { name: 'Makkah — Haramain',      local: '/audio/azan/makkah.mp3',   remote: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  'madinah':                    { name: 'Madinah — Masjid Nabawi', local: '/audio/azan/madinah.mp3', remote: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
};

/** Bundled (public/) path for a built-in azan voice, e.g. '/audio/azan/makkah.mp3'.
 *  Returns null for unknown/custom voices. Used by the desktop LAN media server,
 *  which serves these files to Chromecast/DLNA devices on the network. */
export function azanLocalPath(voiceId: string): string | null {
  return AZAN[voiceId]?.local ?? null;
}

/** Display name for a built-in azan voice (or null if unknown/custom). */
export function azanVoiceName(voiceId: string): string | null {
  return AZAN[voiceId]?.name ?? null;
}


function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
}

/**
 * Resolve any audio src to a URL a Cast device can fetch.
 * Returns `{ url }` when castable, or `{ url: null, reason }` when it can't be cast.
 * A castable URL must be HTTPS and not point at localhost.
 */
export function toCastableUrl(src: string): { url: string | null; reason?: string } {
  if (!src) return { url: null, reason: 'No audio source.' };

  const classify = (u: URL): { url: string | null; reason?: string } => {
    if (isLocalHost(u.hostname)) {
      return { url: null, reason: 'The app is on localhost, which a Cast device cannot reach. Casting works once the app is served over HTTPS at an address the device can see.' };
    }
    if (u.protocol !== 'https:') {
      // The Default Media Receiver is HTTPS and won't load plain-http media —
      // even on the same LAN. So an http:// LAN/dev origin can't cast its files.
      return { url: null, reason: 'Casting requires the audio over HTTPS — a plain http:// address (including a LAN IP) is refused by the Cast receiver.' };
    }
    return { url: u.href };
  };

  // Absolute http(s) URL (e.g. a public CDN).
  if (/^https?:\/\//i.test(src)) {
    try { return classify(new URL(src)); }
    catch { return { url: null, reason: 'Invalid audio URL.' }; }
  }
  // Relative path → resolve against the page origin.
  if (typeof window === 'undefined') return { url: null, reason: 'Not available during server render.' };
  try { return classify(new URL(src, window.location.origin)); }
  catch { return { url: null, reason: 'Invalid audio path.' }; }
}

export type AzanCastResolution = {
  /** The URL to cast (always set — never null; falls back to a public adhan). */
  url: string;
  /** Display name of what will actually play. */
  title: string;
  /** True when we're casting the user's actual selected voice. */
  exact: boolean;
  /** Set when we substituted a public fallback (UI should surface this note). */
  note?: string;
};

/**
 * Resolve the user's selected azan voice into a castable URL.
 *
 * Order matters for honesty: we prefer the BUNDLED file (that's what the app
 * previews) so the cast matches what the user heard; only when the bundle isn't
 * castable from here do we fall back to a public stream — and we flag that as a
 * substitution (exact: false) so the UI can say so. An unknown voice (e.g. a
 * custom upload) has no public stream, so it's an honest substitution too.
 */
export function resolveAzanCastUrl(voiceId: string): AzanCastResolution {
  const voice = AZAN[voiceId];

  // Unknown / custom voice — we have no public stream for it.
  if (!voice) {
    return {
      url: PUBLIC_ADHAN_FALLBACK,
      title: 'Adhan — Makkah (Haramain)',
      exact: false,
      note: 'Your selected adhan isn’t available as a public stream for casting, so the Makkah adhan is cast instead. Choose one of the built-in voices to cast your exact selection.',
    };
  }

  // 1) Prefer the bundled file (matches the in-app preview) when it's castable.
  const local = toCastableUrl(voice.local);
  if (local.url) return { url: local.url, title: `Adhan — ${voice.name}`, exact: true };

  // 2) Fall back to a public stream if this voice has a genuine one.
  const remote = toCastableUrl(voice.remote);
  if (remote.url) {
    // A real public host that differs from the bundled file is a substitute,
    // not the exact recording the user previewed.
    const isSubstitute = /^https?:\/\//i.test(voice.remote) && voice.remote !== voice.local;
    return {
      url: remote.url,
      title: `Adhan — ${voice.name}`,
      exact: !isSubstitute,
      note: isSubstitute
        ? `Casting a public adhan for “${voice.name}”. It may differ from the in-app preview (which plays the bundled recording); your exact recording casts once the app is served over HTTPS.`
        : undefined,
    };
  }

  // 3) Nothing reachable — cast the public Makkah adhan and explain why.
  return {
    url: PUBLIC_ADHAN_FALLBACK,
    title: 'Adhan — Makkah (Haramain)',
    exact: false,
    note: `Your selected voice "${voice.name}" can’t be reached by the Cast device yet (${local.reason ?? remote.reason ?? 'unreachable source'}). Casting the Makkah adhan instead — your own voice casts once the app is served over HTTPS.`,
  };
}
