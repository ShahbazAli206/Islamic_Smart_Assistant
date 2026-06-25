const { contextBridge, ipcRenderer } = require('electron');

// Exposes shell.openExternal so the web app can open OS-level URLs (e.g.
// ms-settings:bluetooth) that window.open() cannot handle in Electron.
contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});

contextBridge.exposeInMainWorld('desktop', {
  notifyAzan: (title, body) => ipcRenderer.send('azan:notify', { title, body }),

  // LAN device discovery + casting (Chromecast / DLNA / AirPlay / Alexa).
  devices: {
    list:      () => ipcRenderer.invoke('devices:list'),
    rescan:    () => ipcRenderer.invoke('devices:rescan'),
    mediaBase: () => ipcRenderer.invoke('devices:mediaBase'),
    play:      (args) => ipcRenderer.invoke('devices:play', args),
    stop:      (args) => ipcRenderer.invoke('devices:stop', args),
    setVolume: (args) => ipcRenderer.invoke('devices:setVolume', args),
    /** Subscribe to live device-list changes. Returns an unsubscribe fn. */
    onChanged: (cb) => {
      const handler = (_e, list) => cb(list);
      ipcRenderer.on('devices:changed', handler);
      return () => ipcRenderer.removeListener('devices:changed', handler);
    },
  },
});
