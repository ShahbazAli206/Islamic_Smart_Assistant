// Auto-update via GitHub Releases (electron-updater).
//
// Publish flow: bump the version in desktop/package.json, run `npm run release`
// with a GH_TOKEN env var (or `npm run build:win` and manually upload the
// generated exe, .blockmap AND latest.yml from dist/ to a new GitHub Release).
// Every installed copy checks the latest release on launch and every 4 hours;
// the user confirms one dialog to download and one to restart into the update.

const { app, dialog, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

let getWindow = () => null;
let downloading = false;
let promptedVersion = null; // don't re-nag for the same version within a session

function win() {
  const w = getWindow();
  return w && !w.isDestroyed() ? w : null;
}

function showWindow() {
  const w = win();
  if (w) { w.show(); w.focus(); }
  return w;
}

async function promptDownload(info) {
  if (downloading || promptedVersion === info.version) return;
  promptedVersion = info.version;

  new Notification({
    title: 'Islamic Assistant — Update available',
    body: `Version ${info.version} is ready to download.`,
  }).show();

  const parent = showWindow();
  const opts = {
    type: 'info',
    title: 'Update available',
    message: `A new version of Islamic Assistant is available.`,
    detail: `Version ${info.version} is available (you have ${app.getVersion()}).\n\nDownload and install it now?`,
    buttons: ['Download & Install', 'Later'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);
  if (response !== 0) return;

  downloading = true;
  autoUpdater.downloadUpdate().catch((err) => {
    downloading = false;
    win()?.setProgressBar(-1);
    dialog.showMessageBox({
      type: 'error',
      title: 'Update failed',
      message: 'The update could not be downloaded.',
      detail: `${err?.message || err}\n\nPlease check your internet connection and try again later.`,
    });
  });
}

async function promptInstall(info) {
  downloading = false;
  win()?.setProgressBar(-1);

  const parent = showWindow();
  const opts = {
    type: 'info',
    title: 'Update ready',
    message: 'The update has been downloaded.',
    detail: `Islamic Assistant will restart to finish installing version ${info.version}.`,
    buttons: ['Restart Now', 'On Next Quit'],
    defaultId: 0,
    cancelId: 1,
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, opts)
    : await dialog.showMessageBox(opts);
  if (response === 0) {
    // Bypass the hide-to-tray close handler so quit actually proceeds.
    app.isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  }
  // Otherwise autoInstallOnAppQuit installs it when the app next quits.
}

// Manual check from the tray menu — always gives the user feedback.
async function checkForUpdatesInteractive() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', message: 'Updates are only available in the installed app.' });
    return;
  }
  promptedVersion = null; // allow re-prompting on an explicit check
  try {
    const result = await autoUpdater.checkForUpdates();
    const latest = result?.updateInfo?.version;
    if (!latest || !result?.isUpdateAvailable) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No updates',
        message: `You're up to date.`,
        detail: `Islamic Assistant ${app.getVersion()} is the latest version.`,
      });
    }
    // If an update IS available the 'update-available' handler prompts.
  } catch (err) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Update check failed',
      message: 'Could not check for updates.',
      detail: String(err?.message || err),
    });
  }
}

function initUpdater(windowGetter) {
  if (!app.isPackaged) return; // dev builds have no app-update.yml
  getWindow = windowGetter;

  autoUpdater.autoDownload = false;          // ask the user first
  autoUpdater.autoInstallOnAppQuit = true;   // "On Next Quit" fallback

  autoUpdater.on('update-available', (info) => { promptDownload(info); });
  autoUpdater.on('download-progress', (p) => { win()?.setProgressBar((p.percent || 0) / 100); });
  autoUpdater.on('update-downloaded', (info) => { promptInstall(info); });
  autoUpdater.on('error', (err) => {
    // Background checks fail silently (offline etc.) — just log.
    console.error('[updater]', err?.message || err);
    win()?.setProgressBar(-1);
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 10_000);                 // let the app finish booting first
  setInterval(check, CHECK_INTERVAL_MS);
}

module.exports = { initUpdater, checkForUpdatesInteractive };
