// Electron main process.
// Wraps the Next.js web app in a desktop shell with native audio + tray icon.

const {
  app, BrowserWindow, Tray, Menu, nativeImage,
  ipcMain, Notification, dialog, shell, net, utilityProcess, protocol,
} = require('electron');
const path = require('path');
const fs   = require('fs');

const { DeviceManager } = require('./devices');
const transAudio = require('./translationAudio');

// ── Translation audio protocol (isa-audio://{lang}/{N}.mp3 → userData/audio/{lang}/{N}.mp3) ──
// Must be registered before app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'isa-audio', privileges: { secure: true, standard: true, supportFetchAPI: false } },
]);

const isDev = !app.isPackaged;

// ── Single-instance lock ──────────────────────────────────────────────────────
// Prevents a second copy of the app from opening (and the infinite-spawn loop
// that would occur if the packaged exe were mistakenly used as a Node runtime).
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow  = null;
let setupWindow = null;
let tray        = null;
let serverProc  = null;   // UtilityProcess running the Next.js standalone server
let deviceManager = null; // LAN device discovery + cast
let devicesInited = false;

const PROD_PORT = 3001;
const DEV_URL   = 'http://localhost:3000';
const PROD_URL  = `http://localhost:${PROD_PORT}`;

// In packaged builds electron-builder places extraResources at process.resourcesPath.
const WEB_STANDALONE = isDev
  ? path.join(__dirname, '../../web/.next/standalone')
  : path.join(process.resourcesPath, 'web/.next/standalone');

// ── Setup-complete flag ───────────────────────────────────────────────────────
function isFirstLaunch() {
  return !fs.existsSync(path.join(app.getPath('userData'), 'setup-complete.json'));
}

// ── Main app window ───────────────────────────────────────────────────────────
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

  // Prevent window.open() calls in the web app from spawning new BrowserWindows.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const ses = mainWindow.webContents.session;
  const allowed = new Set(['geolocation', 'notifications', 'media']);
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });

  // Start LAN device discovery + media server (independent of dev/prod load path).
  initDevices();

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    return;
  }

  // Production: start the Next.js standalone server via utilityProcess.fork()
  // which runs server.js in a sandboxed Node.js child — NOT another Electron app.
  let loaded = false;
  const loadOnce = () => {
    if (loaded || !mainWindow) return;
    loaded = true;
    mainWindow.loadURL(PROD_URL);
  };

  // On a slow/cold first launch the server may not have bound the port yet, so the
  // first load gets ERR_CONNECTION_REFUSED. Retry a few times instead of leaving
  // the user stuck on a Chromium error page.
  let loadRetries = 0;
  mainWindow.webContents.on('did-fail-load', (_e, _code, _desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || !mainWindow || !String(validatedURL).startsWith(PROD_URL)) return;
    if (loadRetries >= 15) return;
    loadRetries += 1;
    setTimeout(() => { if (mainWindow) mainWindow.loadURL(PROD_URL); }, 700);
  });

  if (!serverProc) {
    const serverScript = path.join(WEB_STANDALONE, 'server.js');
    serverProc = utilityProcess.fork(serverScript, [], {
      env: { ...process.env, PORT: String(PROD_PORT), HOSTNAME: '127.0.0.1' },
      stdio: 'ignore',
    });
    // Wait 2 s after the process spawns before loading (gives Next.js time to bind).
    serverProc.on('spawn', () => setTimeout(loadOnce, 2000));
  } else {
    // Server already running from a previous call; short delay is enough.
    setTimeout(loadOnce, 500);
  }
  // Hard fallback: load after 10 s regardless (shows error page if server died).
  setTimeout(loadOnce, 10000);
}

// ── Setup wizard window ───────────────────────────────────────────────────────
function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 640,
    height: 530,
    resizable: false,
    center: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'setup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const raw  = nativeImage.createFromPath(iconPath);
  const icon = raw.isEmpty() ? nativeImage.createEmpty() : raw.resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Islamic Assistant');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: () => { mainWindow?.show(); } },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show());
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  // User launched a second instance — just focus the existing window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // Serve locally cached Bengali audio files via the isa-audio:// custom protocol.
  // URL pattern: isa-audio://bn/1.mp3  →  userData/audio/bn/1.mp3
  protocol.handle('isa-audio', (request) => {
    try {
      const url = new URL(request.url);
      const filePath = path.join(
        app.getPath('userData'), 'audio',
        url.host,                    // "bn"
        url.pathname.replace(/^\//, ''), // "1.mp3"
      );
      return net.fetch('file://' + filePath);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  if (isFirstLaunch()) {
    createSetupWindow();
  } else {
    createWindow();
    createTray();
  }
});

app.on('window-all-closed', () => {
  // Intentionally stay alive in tray for Azan playback.
});

let shuttingDown = false;
app.on('before-quit', (e) => {
  serverProc?.kill();
  if (!deviceManager || shuttingDown) return;
  // Let the device layer deliver STOP frames (so a casting speaker actually stops)
  // and close the media server before we exit — but never block quit for long.
  e.preventDefault();
  shuttingDown = true;
  const finish = () => { app.isQuitting = true; app.quit(); };
  Promise.race([
    Promise.resolve(deviceManager.shutdown()).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]).then(finish, finish);
});

// ── Shell: open OS-level URLs (Bluetooth settings, Wi-Fi settings, etc.) ──────
ipcMain.handle('shell:openExternal', (_event, url) => {
  // Allowlist: only ms-settings: and apple system preference URLs are permitted.
  if (typeof url === 'string' && (url.startsWith('ms-settings:') || url.startsWith('x-apple.systempreferences:'))) {
    return shell.openExternal(url);
  }
});

// ── Azan notification ─────────────────────────────────────────────────────────
ipcMain.on('azan:notify', (_event, { title, body }) => {
  new Notification({ title, body }).show();
});

// ── LAN devices (Chromecast / DLNA / AirPlay / Alexa) ───────────────────────────
function broadcastDevices(list) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('devices:changed', list);
  }
}

async function initDevices() {
  if (devicesInited) return;
  devicesInited = true;
  deviceManager = new DeviceManager();
  deviceManager.onChange((list) => broadcastDevices(list));
  // The LAN media server needs to serve the web app's bundled audio (azan files).
  const publicDirs = [
    path.join(__dirname, '../../web/public'), // dev
    path.join(WEB_STANDALONE, 'public'),      // packaged (extraResources)
  ];
  try { await deviceManager.init({ publicDirs }); } catch (_) { /* non-fatal: CDN URLs still cast */ }
}

const ensureDevices = () => {
  if (!deviceManager) throw new Error('Device manager is not ready yet.');
  return deviceManager;
};

ipcMain.handle('devices:list',      () => (deviceManager ? deviceManager.list() : []));
ipcMain.handle('devices:rescan',    () => (deviceManager ? deviceManager.rescan() : []));
ipcMain.handle('devices:mediaBase', () => (deviceManager ? deviceManager.mediaBase() : null));
ipcMain.handle('devices:play',      (_e, args) => ensureDevices().play(args || {}));
ipcMain.handle('devices:stop',      (_e, args) => ensureDevices().stop(args || {}));
ipcMain.handle('devices:setVolume', (_e, args) => ensureDevices().setVolume(args || {}));

// ── Translation audio: per-language local file cache (isa-audio:// protocol) ──

ipcMain.handle('trans-audio:list',     (_e, lang) => { try { return transAudio.list(lang); } catch { return []; } });
ipcMain.handle('trans-audio:stats',    (_e, lang) => { try { return transAudio.stats(lang); } catch { return { count: 0, bytes: 0 }; } });
ipcMain.handle('trans-audio:statsAll', () => transAudio.statsAll());
ipcMain.handle('trans-audio:clear',    (_e, lang) => { try { return transAudio.clear(lang); } catch { return { deleted: 0 }; } });

ipcMain.handle('trans-audio:download', async (_event, lang, archiveUrl) => {
  try { transAudio.safeLang(lang); } catch { return { ok: false, extracted: 0, error: 'invalid language' }; }
  if (typeof archiveUrl !== 'string' || !/^https?:\/\//.test(archiveUrl)) {
    return { ok: false, extracted: 0, error: 'invalid archive URL' };
  }
  const send = (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('trans-audio:progress', { lang, ...e });
    }
  };
  return transAudio.downloadAndExtract(lang, archiveUrl, send);
});

// ── Setup wizard IPC handlers ─────────────────────────────────────────────────

ipcMain.handle('setup:getAppDataPath', () => app.getPath('userData'));

ipcMain.handle('setup:detectIp', async () => {
  // Use Electron's net.fetch() (Chromium networking — no certificate issues).
  // Try three services in order; each is wrapped so a failure continues to the next.
  try {
    const r = await net.fetch('https://ipinfo.io/json');
    const j = await r.json();
    if (j.city && j.country) {
      const [lat, lng] = (j.loc || '0,0').split(',').map(Number);
      return { city: j.city, country: j.country, lat, lng };
    }
  } catch (_) { /* fall through */ }

  try {
    const r2 = await net.fetch('https://ip-api.com/json/?fields=status,city,country,lat,lon');
    const j2 = await r2.json();
    if (j2.status === 'success') {
      return { city: j2.city, country: j2.country, lat: j2.lat, lng: j2.lon };
    }
  } catch (_) { /* fall through */ }

  try {
    const r3 = await net.fetch('https://get.geojs.io/v1/ip/geo.json');
    const j3 = await r3.json();
    if (j3.city && j3.country) {
      return { city: j3.city, country: j3.country, lat: parseFloat(j3.latitude || '0'), lng: parseFloat(j3.longitude || '0') };
    }
  } catch (_) { /* fall through */ }

  throw new Error('Could not detect location. Check your internet connection or try GPS detection.');
});

ipcMain.handle('setup:openLocationSettings', async () => {
  if (process.platform === 'win32') {
    await shell.openExternal('ms-settings:privacy-location');
  } else if (process.platform === 'darwin') {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices');
  }
});

ipcMain.handle('setup:reverseGeocode', async (_event, lat, lng) => {
  const r = await net.fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
    { headers: { 'User-Agent': 'IslamicAssistant/1.0' } },
  );
  const j = await r.json();
  return {
    city:    j.address?.city || j.address?.town || j.address?.village || j.address?.county || '',
    country: j.address?.country || '',
  };
});

ipcMain.handle('setup:selectFolder', async () => {
  const result = await dialog.showOpenDialog(setupWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Folder for Islamic Assistant',
    defaultPath: app.getPath('userData'),
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('setup:complete', async (_event, settings) => {
  const flagPath = path.join(app.getPath('userData'), 'setup-complete.json');
  fs.mkdirSync(path.dirname(flagPath), { recursive: true });
  fs.writeFileSync(flagPath, JSON.stringify(settings, null, 2), 'utf-8');

  if (process.platform !== 'linux') {
    app.setLoginItemSettings({
      openAtLogin:  settings.launchAtStartup ?? false,
      openAsHidden: settings.startMinimized  ?? false,
    });
  }

  if (settings.desktopShortcut && process.platform === 'win32') {
    try {
      const linkPath = path.join(app.getPath('desktop'), 'Islamic Assistant.lnk');
      shell.writeShortcutLink(linkPath, 'create', { target: process.execPath, description: 'Islamic Assistant' });
    } catch (_) { /* non-fatal */ }
  }

  return true;
});

ipcMain.handle('setup:launch', (_event, doLaunch) => {
  setupWindow?.close();
  setupWindow = null;
  if (doLaunch) {
    createWindow();
    createTray();
  } else {
    app.quit();
  }
});

ipcMain.on('setup:cancel', () => {
  app.quit();
});
