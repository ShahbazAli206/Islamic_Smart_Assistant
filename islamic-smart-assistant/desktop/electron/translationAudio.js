// Per-ayah translation audio — local filesystem cache, any language.
// Files live at: userData/audio/{lang}/{globalAyahNumber}.mp3
// Served to the renderer via the isa-audio://{lang}/{N}.mp3 custom protocol.
//
// These languages have no free per-ayah CDN audio, so the desktop app downloads
// them on demand (from a configurable host) into local storage.

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { app, net } = require('electron');
const AdmZip = require('adm-zip');

// Language codes are used to build filesystem paths and come from the renderer,
// so validate strictly to prevent path traversal (e.g. "../../..").
const LANG_RE = /^[a-z]{2,3}$/;

function safeLang(lang) {
  if (typeof lang !== 'string' || !LANG_RE.test(lang)) {
    throw new Error(`Invalid language code: ${lang}`);
  }
  return lang;
}

function audioRoot() {
  return path.join(app.getPath('userData'), 'audio');
}

function getAudioDir(lang) {
  return path.join(audioRoot(), safeLang(lang));
}

function getFilePath(lang, ayahNumber) {
  const n = parseInt(ayahNumber, 10);
  if (!Number.isInteger(n) || n < 1 || n > 6236) {
    throw new Error(`Invalid ayah number: ${ayahNumber}`);
  }
  return path.join(getAudioDir(lang), `${n}.mp3`);
}

function ensureDir(lang) {
  const dir = getAudioDir(lang);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Sorted array of global ayah numbers saved on disk for a language. */
function list(lang) {
  try {
    const dir = getAudioDir(lang);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mp3'))
      .map(f => parseInt(f, 10))
      .filter(n => !isNaN(n) && n > 0 && n <= 6236)
      .sort((a, b) => a - b);
  } catch { return []; }
}

/** { count, bytes } for one language's cache. */
function stats(lang) {
  try {
    const dir = getAudioDir(lang);
    if (!fs.existsSync(dir)) return { count: 0, bytes: 0 };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
    let bytes = 0;
    for (const f of files) {
      try { bytes += fs.statSync(path.join(dir, f)).size; } catch {}
    }
    return { count: files.length, bytes };
  } catch { return { count: 0, bytes: 0 }; }
}

/** { totalBytes, byLang: {lang: {count, bytes}} } across every downloaded language. */
function statsAll() {
  const out = { totalBytes: 0, byLang: {} };
  try {
    const root = audioRoot();
    if (!fs.existsSync(root)) return out;
    for (const lang of fs.readdirSync(root)) {
      if (!LANG_RE.test(lang)) continue;
      const s = stats(lang);
      if (s.count > 0) { out.byLang[lang] = s; out.totalBytes += s.bytes; }
    }
  } catch {}
  return out;
}

/**
 * Download a language's audio archive (.zip of {N}.mp3 files) and extract it
 * into userData/audio/{lang}/. Streams the download for progress, extracts
 * entry-by-entry (yielding to keep the process responsive).
 *
 * @param {string} lang
 * @param {string} archiveUrl                 URL of the language .zip
 * @param {(e: {phase:'download'|'extract', received?:number, totalBytes?:number, done?:number, total?:number}) => void} onProgress
 * @returns {Promise<{ok:boolean, extracted:number, error?:string}>}
 */
async function downloadAndExtract(lang, archiveUrl, onProgress) {
  safeLang(lang);
  const dir = ensureDir(lang);
  const tmpPath = path.join(os.tmpdir(), `isa-audio-${lang}-${process.pid}-${Date.now()}.zip`);

  // ── 1. Stream download to a temp file ──
  let fd = null;
  try {
    const res = await net.fetch(archiveUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const totalBytes = Number(res.headers.get('content-length')) || 0;

    fd = fs.openSync(tmpPath, 'w');
    const reader = res.body.getReader();
    let received = 0;
    let lastEmit = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      fs.writeSync(fd, chunk);
      received += chunk.length;
      if (received - lastEmit >= 1024 * 1024) {   // emit ~every 1 MB
        lastEmit = received;
        onProgress({ phase: 'download', received, totalBytes });
      }
    }
    onProgress({ phase: 'download', received, totalBytes });
    fs.closeSync(fd); fd = null;

    // ── 2. Extract entry-by-entry ──
    const zip = new AdmZip(tmpPath);
    const entries = zip.getEntries().filter((e) => !e.isDirectory && /(^|\/)\d+\.mp3$/.test(e.entryName));
    const total = entries.length;
    let extracted = 0;
    for (const e of entries) {
      const base = path.basename(e.entryName);           // "de/1.mp3" -> "1.mp3"
      if (!/^\d+\.mp3$/.test(base)) continue;
      const n = parseInt(base, 10);
      if (!Number.isInteger(n) || n < 1 || n > 6236) continue;
      try {
        fs.writeFileSync(path.join(dir, base), e.getData());
        extracted++;
      } catch (err) {
        console.warn(`[translationAudio] ${lang} extract ${base} failed:`, err.message);
      }
      if (extracted % 200 === 0 || extracted === total) {
        onProgress({ phase: 'extract', done: extracted, total });
        await new Promise((r) => setImmediate(r));        // yield to event loop
      }
    }
    onProgress({ phase: 'extract', done: extracted, total });
    return { ok: true, extracted };
  } catch (err) {
    console.warn(`[translationAudio] ${lang} download/extract failed:`, err.message);
    return { ok: false, extracted: 0, error: err.message };
  } finally {
    try { if (fd !== null) fs.closeSync(fd); } catch {}
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
  }
}

/** Delete one language's cached files. */
function clear(lang) {
  try {
    const dir = getAudioDir(lang);
    if (!fs.existsSync(dir)) return { deleted: 0 };
    let deleted = 0;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.mp3')) {
        try { fs.unlinkSync(path.join(dir, f)); deleted++; } catch {}
      }
    }
    return { deleted };
  } catch { return { deleted: 0 }; }
}

module.exports = { list, stats, statsAll, downloadAndExtract, clear, getAudioDir, safeLang };
