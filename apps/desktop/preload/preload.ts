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

  // Check if running in Electron
  isElectron: true,
});
