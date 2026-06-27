'use strict';
/**
 * Islamic Assistant — Universal Windows Installer Build Script
 *
 * Produces ONE installer that works on 32-bit, 64-bit, and ARM64 Windows.
 *
 * Steps:
 *   1. Builds the Next.js web app once.
 *   2. Packages Electron for x64  → dist/Islamic Assistant Setup x.x.x x64.exe
 *      (web assets are injected via the afterPack hook — see scripts/after-pack.js)
 *   3. Packages Electron for ia32 → dist/Islamic Assistant Setup x.x.x ia32.exe
 *   4. Compiles installer-universal.nsi  → dist/Islamic Assistant Setup x.x.x.exe
 *
 * Usage:  npm run build:win:universal
 *
 * Windows Defender & EBUSY:
 *   electron-builder's CopyFileEx holds source+dest open simultaneously.
 *   Defender locks the source while scanning the newly-created destination,
 *   causing EBUSY on large PNG / MP3 assets in extraResources.
 *   This script bypasses extraResources entirely.  The afterPack hook
 *   (scripts/after-pack.js) copies web assets using separate readFileSync +
 *   writeFileSync calls so Defender never holds both handles at once.
 *   A per-file retry loop in the hook handles any residual EBUSY.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT    = path.resolve(__dirname, '..');
const WEB_DIR = path.resolve(ROOT, '..', 'web');
const DIST    = path.join(ROOT, 'dist');
const NSI     = path.join(ROOT, 'installer-universal.nsi');

const PKG     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = PKG.version;
const NAME    = (PKG.build && PKG.build.productName) || 'Islamic Assistant';

const X64_INSTALLER  = path.join(DIST, `${NAME} Setup ${VERSION} x64.exe`);
const IA32_INSTALLER = path.join(DIST, `${NAME} Setup ${VERSION} ia32.exe`);
const OUT_INSTALLER  = path.join(DIST, `${NAME} Setup ${VERSION}.exe`);

// ── Helpers ────────────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  console.log(`\n  > ${cmd.length > 120 ? cmd.slice(0, 117) + '...' : cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function sizeMB(p) {
  try { return (fs.statSync(p).size / 1024 / 1024).toFixed(1); } catch { return '?'; }
}

function assert(p, label) {
  if (!fs.existsSync(p)) throw new Error(`Expected output not found — ${label}\n  Path: ${p}`);
}

function syncSleep(ms) {
  const secs = Math.max(1, Math.ceil(ms / 1000));
  spawnSync('cmd', ['/c', 'timeout', '/t', String(secs), '/nobreak'], { stdio: 'ignore' });
}

// ── Locate electron-builder's bundled makensis ─────────────────────────────
function findMakensis() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'nsis');
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter(d => /^nsis-\d/.test(d)).sort((a, b) => b.localeCompare(a));
  for (const dir of dirs) {
    const bin = path.join(base, dir, 'Bin', 'makensis.exe');
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

// ── Write a modified electron-builder config that uses afterPack ───────────
// Removes extraResources (the source of EBUSY errors) and delegates web-asset
// copying to scripts/after-pack.js which uses read→write pairs instead of
// CopyFileEx, breaking the Defender deadlock.
function writeBuildConfig() {
  const cfg = JSON.parse(JSON.stringify(PKG.build)); // deep clone

  // Remove extraResources — afterPack handles this instead
  delete cfg.extraResources;

  // Point to the afterPack hook (path relative to projectDir = ROOT)
  cfg.afterPack = './scripts/after-pack.js';

  const out = path.join(DIST, 'eb-config.json');
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(cfg, null, 2));
  return out;
}

// ── Spawn an isolated process for each arch build ─────────────────────────
// Runs in its own subprocess so ALL file handles are released when it exits.
// The afterPack hook retries individual files if EBUSY — no need to retry
// the entire electron-builder invocation here.
function ebBuild(arch, configFile) {
  const helper = path.join(ROOT, 'scripts', '_pack-arch.js');
  const result = spawnSync(process.execPath, [helper, arch, configFile], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  if (result.status !== 0) {
    throw new Error(`electron-builder failed for arch=${arch} (exit ${result.status})`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  Islamic Assistant v${VERSION} — Universal Windows Build  `.padEnd(59) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // ── 1. Verify Next.js build exists (or build it) ──────────────────────
  const standalonePath = path.join(WEB_DIR, '.next', 'standalone');
  if (!fs.existsSync(standalonePath)) {
    console.log('\n[1/4]  Building Next.js web app...');
    run('npm run build', { cwd: WEB_DIR });
  } else {
    console.log('\n[1/4]  Next.js build found — skipping rebuild.');
    console.log('       (Delete web/.next to force a fresh build.)');
  }

  // ── 2. Write the modified build config ────────────────────────────────
  const cfgFile = writeBuildConfig();
  console.log(`\n       Build config: ${cfgFile}`);

  // ── 3. Package for x64 ────────────────────────────────────────────────
  console.log('\n[2/4]  Packaging Electron for x64 (+ afterPack web assets)...');
  ebBuild('x64', cfgFile);
  assert(X64_INSTALLER, 'x64 installer');
  console.log(`\n       ✓  ${path.basename(X64_INSTALLER)}  (${sizeMB(X64_INSTALLER)} MB)`);

  // ── 4. Package for ia32 ───────────────────────────────────────────────
  console.log('\n[3/4]  Packaging Electron for ia32 (+ afterPack web assets)...');
  ebBuild('ia32', cfgFile);
  assert(IA32_INSTALLER, 'ia32 installer');
  console.log(`\n       ✓  ${path.basename(IA32_INSTALLER)}  (${sizeMB(IA32_INSTALLER)} MB)`);

  // ── 5. Compile universal NSIS wrapper ─────────────────────────────────
  console.log('\n[4/4]  Compiling universal installer with NSIS...');
  const makensis = findMakensis();
  if (!makensis) {
    console.error('\n  ⚠  electron-builder NSIS bundle not found.');
    console.error('     Run npm run build:win:x64 once to download it, then retry.');
    process.exit(1);
  }
  console.log(`       NSIS: ${makensis}`);
  run(`"${makensis}" /DPRODUCT_VERSION="${VERSION}" "${NSI}"`);
  assert(OUT_INSTALLER, 'universal installer');

  // ── Summary ───────────────────────────────────────────────────────────
  const mins = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`\n✅  Done in ${mins} min\n`);
  console.log('   dist/\n');
  const exes = fs.readdirSync(DIST)
    .filter(f => f.endsWith('.exe') && !f.includes('__uninstaller') && !f.endsWith('.blockmap'))
    .sort();
  for (const f of exes) {
    const isUniversal = !f.includes('x64') && !f.includes('ia32');
    const tag = isUniversal ? '  ← SHARE THIS ONE' : `  (${f.includes('x64') ? 'x64' : 'ia32'} sub-installer)`;
    console.log(`   ${sizeMB(path.join(DIST, f)).padStart(6)} MB   ${f}${tag}`);
  }
  console.log(`\n   Full path:\n   ${OUT_INSTALLER}\n`);
}

main().catch(e => { console.error('\n  ✗ Build failed:', e.message); process.exit(1); });
