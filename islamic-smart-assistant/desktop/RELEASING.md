# Releasing a Desktop App Update

The desktop app auto-updates from **GitHub Releases on the PUBLIC assets repo**
(`ShahbazAli206/Islamic_Assistant_Audio`) using `electron-updater` — the code
repo is private, so it cannot serve updates. Installed apps (v1.2.0+) check for
a newer release on every launch and every 20 minutes (plus tray → "Check for
Updates…"). When one is found, the user sees an **Update available**
notification + dialog; one click downloads it and a restart installs it.

The web "Download Desktop App" button (`web/src/lib/desktopApp.ts`) points at
`releases/latest/download/Islamic-Assistant-Setup-x64.exe`, which always serves
the newest release — neither the website nor the constant needs changing.

## How to publish an update

1. Bump `"version"` in `desktop/package.json` (e.g. `1.2.0` → `1.3.0`).
   The updater only offers versions **higher** than the installed one.
2. Build: from `desktop/` run `npm run build:win`.
3. Create a new GitHub Release on **Islamic_Assistant_Audio**, tagged
   `v<version>` (e.g. `v1.3.0`), and upload **all three** files from
   `desktop/dist/`:
   - `Islamic-Assistant-Setup-x64.exe`
   - `Islamic-Assistant-Setup-x64.exe.blockmap`
   - `latest.yml`  ← required — this is what installed apps read to detect the update
4. Publish the release (not a draft, not a pre-release). Done — installed
   apps pick it up on their next check, and the website button serves it.

### Scripted alternative (no token setup needed)

Steps 3–4 are automated by `scripts/publish-release.sh` (Git Bash) — it reads
the version from `dist/latest.yml`, creates the release on the assets repo,
and uploads all three files using the Git Credential Manager token:

```bash
sh desktop/scripts/publish-release.sh "release notes here"
```

### One-command alternative

With a GitHub personal access token (repo scope) in the `GH_TOKEN` env var:

```powershell
$env:GH_TOKEN = "<token>"; npm run release
```

This builds and uploads the exe, blockmap and `latest.yml` to a draft release
on the assets repo automatically — you just publish the draft on GitHub.

## Rules that keep updates working

- **Desktop releases must always be the "latest" release** on the assets repo.
  When publishing audio/asset releases (like `audio-v1`), mark them as
  **pre-release** — otherwise `releases/latest` (both the website link and the
  updater) would point at a release with no installer.
- Keep the artifact name `Islamic-Assistant-Setup-x64.exe` (set in
  `package.json` → `build.win.artifactName`) — the website link depends on it.
- **Installs older than 1.2.0 cannot auto-update** — they were built without
  the updater (v1.0.0 and v1.1.0). Those users must manually download once
  from the website; every version from 1.2.0 onward auto-updates.
- The tag must match the version in `latest.yml` (electron-builder handles
  this when you upload the files it generated together).
