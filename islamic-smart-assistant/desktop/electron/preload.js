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

  // Per-language translation audio cache (download-on-demand).
  // Files served via isa-audio://{lang}/{N}.mp3 custom protocol.
  transAudio: {
    /** Sorted array of global ayah numbers downloaded for a language. */
    list:  (lang) => ipcRenderer.invoke('trans-audio:list', lang),
    /** { count, bytes } for one language. */
    stats: (lang) => ipcRenderer.invoke('trans-audio:stats', lang),
    /** { totalBytes, byLang } across every downloaded language. */
    statsAll: () => ipcRenderer.invoke('trans-audio:statsAll'),
    /** Delete one language's cached files. Returns { deleted }. */
    clear: (lang) => ipcRenderer.invoke('trans-audio:clear', lang),
    /**
     * Download + extract a language's audio archive (.zip).
     * (lang, archiveUrl) -> { ok, extracted, error? }
     */
    download: (lang, archiveUrl) => ipcRenderer.invoke('trans-audio:download', lang, archiveUrl),
    /** isa-audio:// URL for a given language + global ayah number. */
    getUrl: (lang, ayahNumber) => `isa-audio://${lang}/${ayahNumber}.mp3`,
    /**
     * Subscribe to download progress. cb receives { lang, done, total, failed }.
     * Returns an unsubscribe fn.
     */
    onProgress: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on('trans-audio:progress', handler);
      return () => ipcRenderer.removeListener('trans-audio:progress', handler);
    },
  },
});
