'use strict';
/**
 * electron-builder afterPack hook.
 *
 * Copies web assets (Next.js standalone + static + public) into the
 * platform-specific output directory AFTER app-builder has written the
 * Electron binary and app.asar but BEFORE NSIS runs.
 *
 * WHY this exists instead of using `extraResources`:
 *   electron-builder uses the Win32 CopyFileEx API which holds the source
 *   and destination handles open simultaneously.  Windows Defender hooks into
 *   CopyFileEx and can lock the source while scanning the destination, causing
 *   EBUSY errors on large PNG/MP3 files.
 *
 *   Copying here with readFileSync → writeFileSync separates the two
 *   operations in time so Defender never holds both at once.
 *   A per-file retry loop resolves any residual EBUSY in ~2 s.
 */

const fs   = require('fs');
const path = require('path');

const WEB_DIR = path.resolve(__dirname, '..', '..', 'web');

const wait = ms => new Promise(r => setTimeout(r, ms));

async function copyFileWithRetry(src, dest, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      const buf = fs.readFileSync(src);          // read fully into memory
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);               // write in a separate call
      return;
    } catch (e) {
      if ((e.code === 'EBUSY' || e.code === 'EACCES') && i < retries - 1) {
        await wait(2000); // give Defender 2 s to finish its scan
      } else {
        throw new Error(`afterPack copy failed:\n  src:  ${src}\n  dest: ${dest}\n  ${e.message}`);
      }
    }
  }
}

async function copyDirRecursive(srcDir, destDir, retries) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(srcDir,  entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) await copyDirRecursive(s, d, retries);
    else                     await copyFileWithRetry(s, d, retries);
  }
}

exports.default = async function afterPack(context) {
  const { appOutDir } = context;
  const resourcesDir  = path.join(appOutDir, 'resources');
  const webBase       = path.join(resourcesDir, 'web', '.next', 'standalone');
  const RETRIES       = 15; // 15 × 2 s = 30 s max per file

  console.log('\n  [afterPack] Copying web assets...');
  console.log(`    appOutDir: ${appOutDir}`);

  await copyDirRecursive(
    path.join(WEB_DIR, '.next', 'standalone'),
    webBase,
    RETRIES,
  );
  await copyDirRecursive(
    path.join(WEB_DIR, '.next', 'static'),
    path.join(webBase, '.next', 'static'),
    RETRIES,
  );
  await copyDirRecursive(
    path.join(WEB_DIR, 'public'),
    path.join(webBase, 'public'),
    RETRIES,
  );

  console.log('  [afterPack] Web assets copied successfully.\n');
};
