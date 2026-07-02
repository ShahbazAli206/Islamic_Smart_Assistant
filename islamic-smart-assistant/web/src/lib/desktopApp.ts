// Single source of truth for the desktop app installer download link.
//
// Served from the PUBLIC assets repo (Islamic_Assistant_Audio) so the code
// repo can be private. When shipping a new installer: upload the exe to a
// release on the assets repo, then update ONLY this constant.
export const DESKTOP_DOWNLOAD_URL =
  'https://github.com/ShahbazAli206/Islamic_Assistant_Audio/releases/download/v1.0.0/Islamic.Assistant.Setup.1.0.0.exe';
