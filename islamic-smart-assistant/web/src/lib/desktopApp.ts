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

const LATEST_RELEASE_API =
  'https://api.github.com/repos/ShahbazAli206/Islamic_Assistant_Audio/releases/latest';

// Fallback while the API resolves (or if it's rate-limited/unreachable):
// the GitHub "latest release" page, where the exe is one click away.
export const DESKTOP_RELEASES_PAGE =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases/latest';

// Module-level cache: one API call per page load, shared by all buttons.
let resolved: string | null = null;
let pending: Promise<string> | null = null;

export function fetchDesktopDownloadUrl(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (!pending) {
    pending = fetch(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((release) => {
        const exe = (release.assets ?? []).find((a: { name: string }) => a.name.endsWith('.exe'));
        if (exe?.browser_download_url) resolved = exe.browser_download_url as string;
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
