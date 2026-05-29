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
