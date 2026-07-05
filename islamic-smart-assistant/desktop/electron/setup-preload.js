const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', {
  getAppDataPath:  ()          => ipcRenderer.invoke('setup:getAppDataPath'),
  getVersion:      ()          => ipcRenderer.invoke('setup:getVersion'),
  detectIp:        ()          => ipcRenderer.invoke('setup:detectIp'),
  reverseGeocode:  (lat, lng)  => ipcRenderer.invoke('setup:reverseGeocode', lat, lng),
  selectFolder:    ()          => ipcRenderer.invoke('setup:selectFolder'),
  complete:             (settings)  => ipcRenderer.invoke('setup:complete', settings),
  launch:               (doLaunch)  => ipcRenderer.invoke('setup:launch', doLaunch),
  cancel:               ()          => ipcRenderer.send('setup:cancel'),
  openLocationSettings: ()          => ipcRenderer.invoke('setup:openLocationSettings'),
});
