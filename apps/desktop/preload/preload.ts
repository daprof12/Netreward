import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer (web app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Tray stats
  updateTrayStats: (stats: { gbTracked: number; nrtEarned: number; isActive: boolean }) => {
    ipcRenderer.send('update-tray-stats', stats);
  },

  // Notifications
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Listen for tracking toggle from tray
  onTrackingToggled: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('tracking-toggled', (_event, enabled) => callback(enabled));
  },

  // Bandwidth tracking
  onNetworkStats: (callback: (stats: { rxBytes: number; txBytes: number }) => void) => {
    ipcRenderer.on('network-stats-update', (_event, stats) => callback(stats));
  },

  // Auto-Updater
  onUpdaterEvent: (callback: (event: { type: string; info?: any }) => void) => {
    ipcRenderer.on('updater-event', (_event, data) => callback(data));
  },
  installUpdate: () => ipcRenderer.send('install-update'),

  // Scan2Pay Deep Link
  onScan2Pay: (callback: (sessionId: string) => void) => {
    ipcRenderer.on('open-scan2pay', (_event, sessionId) => callback(sessionId));
  },

  // Check if running in Electron
  isElectron: true,
});
