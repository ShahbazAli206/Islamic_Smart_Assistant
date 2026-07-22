// Sequential recitation playback engine, driving a single <audio> element through
// a queue of surahs. Imperative (not React-effect-driven) because a scheduled
// "alarm" plays a fixed, ordered queue — far simpler to reason about than the
// effect choreography in QuranPlayer.
//
// Arabic-only  → one whole-surah MP3 per surah (surahAudioUrl); on CDN failure it
//                falls back to ayah-by-ayah Arabic.
// With audio   → ayah-by-ayah: each Arabic ayah, then its spoken translation
// translation    (translationAudioUrl), skipping the translation leg silently when
//                no audio exists — the same graceful fallback QuranPlayer uses.
//
// Volume is applied via the standard HTMLMediaElement.volume (0..1) before every
// clip, so the user's chosen level always takes effect (and updates live via
// setVolume while previewing).

import {
  surahAudioUrl, ayahAudioUrl, translationAudioUrl, hasTranslationAudio,
  hasLocalAudio, localAudioLangOf,
  fetchSurah, fetchSurahMulti, type ReciterId, type TranslationId,
} from './quran';
import { isLocalAudioSupported, localAudioUrl } from './translationAudioLocal';

/**
 * Resolve the spoken-translation URL for one ayah — prefers the desktop app's
 * downloaded local audio (if this edition has any and it's actually running
 * there), falling back to CDN/TTS-bucket audio otherwise. A local file that
 * hasn't been downloaded yet simply 404s and playClip() skips it gracefully,
 * same as any other missing translation clip.
 */
function resolveTranslationUrl(translation: TranslationId, globalAyahNumber: number): string | null {
  if (isLocalAudioSupported()) {
    const lang = localAudioLangOf(translation);
    if (lang) return localAudioUrl(lang, globalAyahNumber);
  }
  return translationAudioUrl(translation, globalAyahNumber);
}

export type PlayRequest = {
  surahs: number[];
  reciter: ReciterId;
  withTranslation: boolean;
  translation: TranslationId;
  volume: number; // 0..1
};

export type PlayHooks = {
  /** Fired as each surah in the queue starts. */
  onProgress?: (info: { surah: number; index: number; total: number }) => void;
  /** The whole queue finished naturally. */
  onDone?: () => void;
  /** The browser blocked autoplay (no user gesture yet) — show a one-tap prompt. */
  onBlocked?: () => void;
};

export type RecitationController = {
  play: (req: PlayRequest, hooks?: PlayHooks) => Promise<void>;
  stop: () => void;
  setVolume: (v: number) => void;
  isPlaying: () => boolean;
};

type ClipResult = { ok: boolean; blocked: boolean };

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);

export function createRecitationController(el: HTMLAudioElement): RecitationController {
  // Every play() bumps the token; any in-flight loop/clip whose token no longer
  // matches bails out — this is how stop() and a new play() cancel the old queue.
  let token = 0;
  let playing = false;
  let volume = 1;
  // Resolves the currently-awaited clip immediately (used by stop()).
  let abortClip: (() => void) | null = null;

  /** Play one media URL to completion. Never rejects — reports via ClipResult. */
  function playClip(url: string, myToken: number): Promise<ClipResult> {
    return new Promise((resolve) => {
      if (myToken !== token) { resolve({ ok: false, blocked: false }); return; }
      let settled = false;
      const finish = (r: ClipResult) => {
        if (settled) return;
        settled = true;
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        if (abortClip === abort) abortClip = null;
        resolve(r);
      };
      const onEnded = () => finish({ ok: true, blocked: false });
      const onError = () => finish({ ok: false, blocked: false });
      const abort = () => finish({ ok: false, blocked: false });
      abortClip = abort;
      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);
      try {
        el.muted = false;
        el.src = url;
        el.volume = volume;
        el.currentTime = 0;
      } catch { /* setting currentTime before load can throw — harmless */ }
      el.play().then(undefined, (err: unknown) => {
        const blocked = !!err && (err as { name?: string }).name === 'NotAllowedError';
        finish({ ok: false, blocked });
      });
    });
  }

  async function playArabicAyahByAyah(n: number, req: PlayRequest, myToken: number): Promise<boolean> {
    let surah;
    try { surah = await fetchSurah(n); } catch { return false; }
    if (myToken !== token) return false;
    for (const ayah of surah.ayahs) {
      if (myToken !== token) return false;
      const r = await playClip(ayahAudioUrl(ayah.number, req.reciter), myToken);
      if (r.blocked) return true;
      // Non-block clip error → skip this ayah, keep going.
    }
    return false;
  }

  async function playArabicOnly(n: number, req: PlayRequest, myToken: number): Promise<boolean> {
    const r = await playClip(surahAudioUrl(n, req.reciter), myToken);
    if (r.blocked) return true;
    if (r.ok || myToken !== token) return false;
    // Whole-surah MP3 unavailable for this reciter/surah → ayah-by-ayah fallback.
    return playArabicAyahByAyah(n, req, myToken);
  }

  async function playWithTranslation(n: number, req: PlayRequest, myToken: number): Promise<boolean> {
    let data;
    try { data = await fetchSurahMulti(n, ['quran-uthmani', req.translation]); }
    catch { return playArabicOnly(n, req, myToken); }
    if (myToken !== token) return false;
    const arabic = data[0];
    for (const ayah of arabic.ayahs) {
      if (myToken !== token) return false;
      const ra = await playClip(ayahAudioUrl(ayah.number, req.reciter), myToken);
      if (ra.blocked) return true;
      if (myToken !== token) return false;
      const turl = resolveTranslationUrl(req.translation, ayah.number);
      if (turl) {
        const rt = await playClip(turl, myToken);
        if (rt.blocked) return true;
        // Translation clip failed → skip it, continue to the next ayah.
      }
    }
    return false;
  }

  function playOneSurah(n: number, req: PlayRequest, myToken: number): Promise<boolean> {
    const wantsTranslation =
      req.withTranslation && req.translation !== 'none' &&
      (hasTranslationAudio(req.translation) || (hasLocalAudio(req.translation) && isLocalAudioSupported()));
    return wantsTranslation
      ? playWithTranslation(n, req, myToken)
      : playArabicOnly(n, req, myToken);
  }

  async function play(req: PlayRequest, hooks?: PlayHooks): Promise<void> {
    const myToken = ++token;
    playing = true;
    volume = clamp01(req.volume);
    el.volume = volume;
    el.muted = false;

    for (let i = 0; i < req.surahs.length; i++) {
      if (myToken !== token) return; // superseded by a newer play()/stop()
      hooks?.onProgress?.({ surah: req.surahs[i], index: i, total: req.surahs.length });
      const blocked = await playOneSurah(req.surahs[i], req, myToken);
      if (myToken !== token) return;
      if (blocked) { playing = false; hooks?.onBlocked?.(); return; }
    }

    if (myToken === token) { playing = false; hooks?.onDone?.(); }
  }

  function stop(): void {
    token++;            // cancel any in-flight loop
    abortClip?.();      // resolve the awaited clip so the loop unwinds
    playing = false;
    try { el.pause(); el.currentTime = 0; } catch { /* no media loaded */ }
  }

  function setVolume(v: number): void {
    volume = clamp01(v);
    try { el.volume = volume; } catch { /* ignore */ }
  }

  return { play, stop, setVolume, isPlaying: () => playing };
}
