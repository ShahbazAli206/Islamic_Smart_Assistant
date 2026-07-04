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
const { initUpdater, checkForUpdatesInteractive } = require('./updater');

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

// Brand logo (ismaa_logo4.png) bundled in assets/ — used for the window icon,
// tray and anywhere else the app identifies itself.
const APP_ICON = path.join(__dirname, '../assets/ismaa_logo4.png');

// In packaged builds electron-builder places extraResources at process.resourcesPath.
const WEB_STANDALONE = isDev
  ? path.join(__dirname, '../../web/.next/standalone')
  : path.join(process.resourcesPath, 'web/.next/standalone');

// ── Setup-complete flag ───────────────────────────────────────────────────────
function isFirstLaunch() {
  return !fs.existsSync(path.join(app.getPath('userData'), 'setup-complete.json'));
}

// ── Splash screen ─────────────────────────────────────────────────────────────
// The bundled Next.js server takes 2–8 s to cold-boot on first launch; without
// this the user stares at a blank white window. The splash is a local HTML file
// (instant to paint) with a rich animated loading scene; it stays up until the
// app's first page has actually finished loading in the (hidden) main window.
let splashWindow = null;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 380,
    frame: false,
    resizable: false,
    center: true,
    show: true,
    transparent: false,
    backgroundColor: '#06231A',
    skipTaskbar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

let splashDismissed = false;

function dismissSplash() {
  if (splashDismissed) return;
  splashDismissed = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = null;
}

// ── Main app window ───────────────────────────────────────────────────────────
function createWindow() {
  createSplash();

  const isMac = process.platform === 'darwin';
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    show: false,               // stays hidden behind the splash until content is ready
    backgroundColor: '#06231A',
    icon: APP_ICON,
    // Frameless everywhere so the web app can paint its own themed title bar
    // (see web/src/components/DesktopTitleBar.tsx). On macOS we keep the native
    // traffic-light buttons but hide the rest of the frame, insetting the lights
    // to line up with our custom bar.
    frame: false,
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep the renderer's custom title bar in sync with the real window state so
  // the maximize/restore icon and drag behaviour always match.
  const emitMaxState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('win:maximized-changed', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', emitMaxState);
  mainWindow.on('unmaximize', emitMaxState);

  // Swap splash → app the moment the first real page has rendered. A failed
  // load (server still booting → connection refused) also fires
  // did-finish-load for Chromium's error page, so track main-frame failures
  // and only dismiss on a genuinely successful load; the retry loop below
  // keeps re-loading until the server is up.
  let mainLoadFailed = false;
  mainWindow.webContents.on('did-start-loading', () => { mainLoadFailed = false; });
  mainWindow.webContents.on('did-fail-load', (_e, _c, _d, _u, isMainFrame) => {
    if (isMainFrame) mainLoadFailed = true;
  });
  mainWindow.webContents.on('did-finish-load', () => { if (!mainLoadFailed) dismissSplash(); });
  // Safety net: never leave the user stuck on the splash (e.g. server died —
  // the main window then shows Chromium's error page, which is at least actionable).
  setTimeout(dismissSplash, 45_000);

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
  const raw  = nativeImage.createFromPath(APP_ICON);
  const icon = raw.isEmpty() ? nativeImage.createEmpty() : raw.resize({ height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Islamic Assistant');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: () => { mainWindow?.show(); } },
    { label: 'Check for Updates…', click: () => { checkForUpdatesInteractive(); } },
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
  // Drop the default OS menu bar (File / Edit / View / Window) — the app paints
  // its own themed title bar and doesn't use native menus. Standard editing
  // shortcuts (copy/paste/select-all) still work inside web inputs.
  Menu.setApplicationMenu(null);

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
  // Auto-update: checks GitHub Releases on launch and every 20 min (packaged only).
  initUpdater(() => mainWindow);
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

// ── Custom title-bar window controls ──────────────────────────────────────────
// Driven by the renderer's DesktopTitleBar (frame: false, so no native buttons).
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
// Mirror the native close button: hide to tray (Azan keeps playing) rather than quit.
ipcMain.on('win:close', () => mainWindow?.close());
ipcMain.handle('win:isMaximized', () => !!mainWindow?.isMaximized());

// ── Azan notification ─────────────────────────────────────────────────────────
ipcMain.on('azan:notify', (_event, { title, body }) => {
  new Notification({ title, body }).show();
});

// ── Setup settings bridge ─────────────────────────────────────────────────────
// The web app reads the wizard's choices (language, school, location, azan…)
// and applies them to its own localStorage on launch. Returns null when the
// wizard has never completed.
ipcMain.handle('desktop:getSetupSettings', () => {
  try {
    const p = path.join(app.getPath('userData'), 'setup-complete.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return null; }
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

// One-time marker (set by the setup wizard) telling the app to open the
// download manager on first launch. Contains a JSON array of the language
// codes the user ticked in the wizard; those get auto-queued for download.
// Returns the array once, then clears itself. Returns null when no marker.
function audioPromptMarkerPath() {
  return path.join(app.getPath('userData'), 'audio-prompt-pending');
}
ipcMain.handle('trans-audio:consumeFirstRunPrompt', () => {
  try {
    const p = audioPromptMarkerPath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf-8');
    fs.unlinkSync(p);
    try {
      const parsed = JSON.parse(raw);
      const langs = Array.isArray(parsed) ? parsed : parsed?.langs;
      if (Array.isArray(langs)) return langs.filter((l) => typeof l === 'string');
    } catch { /* legacy "1" marker — open the manager with nothing pre-queued */ }
    return [];
  } catch { return null; }
});

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
  // completedAt lets the web app detect a fresh wizard run and re-apply the
  // choices (language/sect/location/…) to its own localStorage exactly once.
  fs.writeFileSync(flagPath, JSON.stringify({ ...settings, completedAt: Date.now() }, null, 2), 'utf-8');

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

  // If the user picked languages during setup, drop a marker listing them so
  // the app opens the download manager on first launch with those pre-queued.
  try {
    const marker = path.join(app.getPath('userData'), 'audio-prompt-pending');
    const langs = Array.isArray(settings.downloadAudioLangs)
      ? settings.downloadAudioLangs.filter((l) => typeof l === 'string' && /^[a-z]{2,3}$/.test(l))
      : [];
    if (langs.length) fs.writeFileSync(marker, JSON.stringify({ langs }), 'utf-8');
    else if (fs.existsSync(marker)) fs.unlinkSync(marker);
  } catch (_) { /* non-fatal */ }

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
