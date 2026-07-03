// Single source of truth for the desktop app installer download link.
//
// Served from the PUBLIC assets repo (Islamic_Assistant_Audio) so the code
// repo can be private. The `releases/latest/download/...` form always resolves
// to the newest published release, and electron-builder now emits a
// version-less artifact name (Islamic-Assistant-Setup-x64.exe) — so shipping a
// new installer never requires touching this constant or redeploying the web.
// See desktop/RELEASING.md for the publish steps.
export const DESKTOP_DOWNLOAD_URL =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases/latest/download/Islamic-Assistant-Setup-x64.exe';
