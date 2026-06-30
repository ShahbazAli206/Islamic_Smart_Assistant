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

  // Local Bengali translation audio cache.
  // Files served via isa-audio://bn/{N}.mp3 custom protocol.
  bnAudio: {
    /** Returns sorted array of global ayah numbers downloaded to local storage. */
    list:  () => ipcRenderer.invoke('bn-audio:list'),
    /** Returns { count, bytes } storage info. */
    stats: () => ipcRenderer.invoke('bn-audio:stats'),
    /** Deletes all cached Bengali audio files. Returns { deleted }. */
    clear: () => ipcRenderer.invoke('bn-audio:clear'),
    /**
     * Downloads Bengali audio files.
     * items: Array<{ ayah: number; url: string }>
     * Returns { done, failed }.
     */
    download: (items) => ipcRenderer.invoke('bn-audio:download', items),
    /** Returns the isa-audio:// URL for a given global ayah number. */
    getUrl: (ayahNumber) => `isa-audio://bn/${ayahNumber}.mp3`,
    /** Subscribe to download progress events. Returns an unsubscribe fn. */
    onProgress: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('bn-audio:progress', handler);
      return () => ipcRenderer.removeListener('bn-audio:progress', handler);
    },
  },
});
