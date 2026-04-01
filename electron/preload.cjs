const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'pong',

  startScan: (rootPath) => ipcRenderer.invoke('scan:start', rootPath),
  cancelScan: () => ipcRenderer.invoke('scan:cancel'),

  onScanProgress: (cb) => {
    ipcRenderer.removeAllListeners('scan:progress');
    ipcRenderer.on('scan:progress', (_e, data) => cb(data));
  },
  getInstalledApps: () => ipcRenderer.invoke('apps:list'),

  onScanComplete: (cb) => {
    ipcRenderer.removeAllListeners('scan:complete');
    ipcRenderer.on('scan:complete', (_e, data) => cb(data));
  },
});
