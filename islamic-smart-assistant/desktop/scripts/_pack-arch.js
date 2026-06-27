'use strict';
// Internal helper: runs a single electron-builder NSIS build for one arch.
// Called as a subprocess by build-universal-win.js so that all file handles
// are guaranteed to be released when this process exits.
//
// Usage:  node scripts/_pack-arch.js x64|ia32 [path/to/eb-config.json]

const { build, Platform, Arch } = require('electron-builder');
const path = require('path');
const fs   = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PKG  = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const arch       = process.argv[2];
const configFile = process.argv[3]; // optional: path to a generated config JSON

if (!arch || Arch[arch] === undefined) {
  console.error('Usage: node _pack-arch.js x64|ia32 [config.json]');
  process.exit(1);
}

// Use the generated staged config if provided, otherwise fall back to pkg.build
const config = configFile && fs.existsSync(configFile)
  ? JSON.parse(fs.readFileSync(configFile, 'utf8'))
  : PKG.build;

process.chdir(ROOT);

build({
  targets: Platform.WINDOWS.createTarget('nsis', Arch[arch]),
  projectDir: ROOT,
  config,
}).catch(e => {
  process.stderr.write('\n  ✗ ' + e.message + '\n');
  process.exit(1);
});
