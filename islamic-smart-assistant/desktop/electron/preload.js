const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  notifyAzan: (title, body) => ipcRenderer.send('azan:notify', { title, body }),
});
