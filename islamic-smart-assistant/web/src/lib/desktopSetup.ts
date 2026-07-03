'use client';

// Bridges the Electron setup wizard's choices into the web app's localStorage.
//
// The desktop wizard (desktop/electron/setup.html) collects location, language,
// school of thought, azan/notification toggles and offline-audio languages, and
// saves them to setup-complete.json. The web app — which runs inside the same
// Electron window — reads them here on launch and applies them to the exact
// localStorage keys the rest of the app uses, then marks the web onboarding as
// done so the user is never asked the same questions twice.
//
// Applied once per wizard run: the wizard stamps `completedAt`, and we remember
// the last applied stamp in `isa:desktopSetupApplied`.

import { methodByCountry } from './sect';
import { setLocationByCoords, setLocationByCity } from './location';

type SetupSettings = {
  completedAt?: number;
  location?: { city?: string; country?: string; lat?: number | null; lng?: number | null };
  language?: string;
  school?: string;          // hanafi | shafii | maliki | hanbali | shia
  azanAutoplay?: boolean;
  notifications?: boolean;
};

// Same school → sect/fiqh/method mapping as the web onboarding (OnboardingSetup).
const SCHOOL_METHOD: Record<string, number> = {
  hanafi: 1, shafii: 3, maliki: 3, hanbali: 4, shia: 7,
};
const SCHOOL_FIQH: Record<string, string> = {
  hanafi: 'hanafi', shafii: 'shafi', maliki: 'maliki', hanbali: 'hanbali', shia: 'jafari',
};

function persist(key: string, val: unknown) {
  const json = JSON.stringify(val);
  localStorage.setItem(key, json);
  // Notify same-tab useLocalStorage subscribers immediately.
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: json }));
}

/**
 * Apply the desktop setup wizard's choices to localStorage (desktop app only).
 * Safe to call on every launch and on the web — it is a no-op unless running
 * in Electron with a wizard run that has not been applied yet.
 *
 * Returns true when settings were applied this call.
 */
export async function applyDesktopSetupSettings(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const api = (window as any).desktop?.getSetupSettings as (() => Promise<SetupSettings | null>) | undefined;
  if (!api) return false;

  let s: SetupSettings | null = null;
  try { s = await api(); } catch { return false; }
  if (!s || !s.completedAt) return false;

  // Already applied this wizard run?
  try {
    if (localStorage.getItem('isa:desktopSetupApplied') === String(s.completedAt)) return false;
  } catch {}

  // ── Language ──
  if (typeof s.language === 'string' && s.language) persist('isa:language', s.language);

  // ── School of thought → sect / fiqh / calculation method ──
  if (typeof s.school === 'string' && s.school in SCHOOL_FIQH) {
    const country = s.location?.country ?? '';
    persist('isa:sect',   s.school === 'shia' ? 'shia' : 'sunni');
    persist('isa:fiqh',   SCHOOL_FIQH[s.school]);
    persist('isa:method', methodByCountry(country) ?? SCHOOL_METHOD[s.school] ?? 1);
  }

  // ── Location ──
  const { city = '', country = '', lat, lng } = s.location ?? {};
  try {
    if (typeof lat === 'number' && typeof lng === 'number') {
      setLocationByCoords(lat, lng, city || undefined, country || undefined, { clearMosque: true });
    } else if (city && country) {
      await setLocationByCity(city, country);   // geocodes to coordinates
    }
  } catch { /* offline — city/country still usable next launch */ }

  // ── Azan autoplay (wizard default: enabled) ──
  if (typeof s.azanAutoplay === 'boolean') persist('isa:azanAutoplay', s.azanAutoplay);

  // The wizard covered everything the web onboarding asks — don't ask twice.
  persist('isa:setupDone', true);
  // Raw (non-JSON) value — compared with getItem() above.
  try { localStorage.setItem('isa:desktopSetupApplied', String(s.completedAt)); } catch {}
  return true;
}
