// Electron main process.
// Wraps the Next.js web app in a desktop shell with native audio + tray icon.

const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const APP_URL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../../web/.next/standalone/server.js')}`;

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#F7F5EE',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(APP_URL);

  // The wrapped web app uses browser geolocation to detect the user's city for
  // prayer times. Electron denies geolocation by default, so navigator.geolocation
  // never resolves until we approve the permission request here (this is what
  // surfaces the "first time" allow flow). Notifications are also granted for Azan.
  // NOTE: packaged builds may additionally need a Chromium geolocation key set at
  // build time (GOOGLE_API_KEY); if location is unavailable the web app falls back
  // to manual city entry.
  const ses = mainWindow.webContents.session;
  const allowed = new Set(['geolocation', 'notifications']);
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Islamic Assistant');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open',  click: () => { mainWindow?.show(); } },
    { label: 'Quit',  click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // keep alive in tray for Azan playback
});

ipcMain.on('azan:notify', (_event, { title, body }) => {
  new Notification({ title, body }).show();
});
