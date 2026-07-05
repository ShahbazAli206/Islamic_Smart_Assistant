// Single source of truth for the desktop app installer download link.
// (no-op comment: verifying Vercel auto-deploy on push — safe to remove)
//
// The installer is served from the PUBLIC assets repo (Islamic_Assistant_Audio)
// so the code repo can be private. Artifact names carry the version
// (Islamic-Assistant-Setup-<version>.exe), so instead of a hardcoded URL we ask
// the GitHub API which exe the latest release contains — shipping a new
// installer never requires touching this file or redeploying the web.
// See desktop/RELEASING.md for the publish steps.

import { useEffect, useState } from 'react';

// The assets repo also hosts non-installer releases (e.g. tafsir book PDFs
// under the "books-v1" tag), so "latest release" can't be trusted — it may
// point at a release with no .exe. List releases instead and pick the most
// recent one that actually has an installer asset.
const RELEASES_API =
  'https://api.github.com/repos/ShahbazAli206/Islamic_Assistant_Audio/releases';

// Fallback while the API resolves (or if it's rate-limited/unreachable):
// the full releases list, where the installer release is one click away.
export const DESKTOP_RELEASES_PAGE =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases';

// Module-level cache: one API call per page load, shared by all buttons.
let resolved: string | null = null;
let pending: Promise<string> | null = null;

export function fetchDesktopDownloadUrl(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (!pending) {
    pending = fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((releases) => {
        for (const release of releases ?? []) {
          const exe = (release.assets ?? []).find((a: { name: string }) => a.name.endsWith('.exe'));
          if (exe?.browser_download_url) {
            resolved = exe.browser_download_url as string;
            break;
          }
        }
        return resolved ?? DESKTOP_RELEASES_PAGE;
      })
      .catch(() => DESKTOP_RELEASES_PAGE);
  }
  return pending;
}

/** Direct download URL of the newest desktop installer (versioned filename). */
export function useDesktopDownloadUrl(): string {
  const [url, setUrl] = useState<string>(resolved ?? DESKTOP_RELEASES_PAGE);
  useEffect(() => {
    let alive = true;
    fetchDesktopDownloadUrl().then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, []);
  return url;
}
