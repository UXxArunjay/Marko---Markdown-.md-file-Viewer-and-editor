const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
  onOpenFile: (callback) => {
    ipcRenderer.on('open-file', (_event, data) => callback(data));
  },
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  checkDefaultApp: () => ipcRenderer.invoke('check-default-app'),
  setDefaultApp: () => ipcRenderer.invoke('set-default-app'),
  claudeRequest: (payload) => ipcRenderer.invoke('claude-request', payload)
});
