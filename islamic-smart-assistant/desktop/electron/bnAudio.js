// Bengali translation audio — local filesystem cache.
// Files live at: userData/audio/bn/{globalAyahNumber}.mp3
// Served to the renderer via the isa-audio:// custom Electron protocol.

const fs   = require('fs');
const path = require('path');
const { app, net } = require('electron');

function getAudioDir() {
  return path.join(app.getPath('userData'), 'audio', 'bn');
}

function getFilePath(ayahNumber) {
  return path.join(getAudioDir(), `${ayahNumber}.mp3`);
}

function ensureDir() {
  const dir = getAudioDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Returns sorted array of global ayah numbers that are saved on disk. */
function list() {
  try {
    const dir = getAudioDir();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mp3'))
      .map(f => parseInt(f, 10))
      .filter(n => !isNaN(n) && n > 0 && n <= 6236)
      .sort((a, b) => a - b);
  } catch { return []; }
}

/** Returns { count, bytes } for the local cache. */
function stats() {
  try {
    const dir = getAudioDir();
    if (!fs.existsSync(dir)) return { count: 0, bytes: 0 };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
    let bytes = 0;
    for (const f of files) {
      try { bytes += fs.statSync(path.join(dir, f)).size; } catch {}
    }
    return { count: files.length, bytes };
  } catch { return { count: 0, bytes: 0 }; }
}

/**
 * Downloads a batch of Bengali ayah audio files.
 * @param {Array<{ayah: number, url: string}>} items
 * @param {(done: number, total: number, failed: number) => void} onProgress
 */
async function download(items, onProgress) {
  ensureDir();
  let done = 0;
  let failed = 0;

  for (const { ayah, url } of items) {
    const filePath = getFilePath(ayah);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      done++;
      onProgress(done, items.length, failed);
      continue;
    }
    try {
      const res = await net.fetch(url, { bypassCustomProtocolHandlers: false });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
    } catch (e) {
      console.warn(`[bnAudio] Failed to download ayah ${ayah}:`, e.message);
      failed++;
    }
    done++;
    onProgress(done, items.length, failed);
  }
  return { done, failed };
}

/** Deletes all locally cached Bengali audio files. */
function clear() {
  try {
    const dir = getAudioDir();
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

/** Returns the absolute path for a given ayah (may not exist yet). */
function pathFor(ayahNumber) {
  return getFilePath(ayahNumber);
}

module.exports = { list, stats, download, clear, pathFor, getAudioDir };
