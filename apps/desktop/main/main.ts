import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import * as si from 'systeminformation';

// ── State ───────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Tracking stats (updated by renderer via IPC)
let trackingStats = { gbTracked: 0, nrtEarned: 0, isActive: true };

// ── Prevent Multiple Instances ──────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Create Main Window ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NetReward',
    backgroundColor: '#0a0a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  // Load the Vite dev server or built files
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the built web app
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // CRITICAL: Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // macOS: hide dock icon when minimized to menu bar
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
    }
  });
}

// ── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../assets/icons/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('NetReward — Tracking Active');

  updateTrayMenu();

  // Left-click: toggle window visibility
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
      if (process.platform === 'darwin') app.dock?.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
      if (process.platform === 'darwin') app.dock?.show();
    }
  });
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `📊 ${trackingStats.gbTracked.toFixed(1)} GB tracked — ${trackingStats.nrtEarned.toFixed(2)} NRT`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: trackingStats.isActive ? '🟢 Tracking Active' : '🔴 Tracking Paused',
      type: 'checkbox',
      checked: trackingStats.isActive,
      click: () => {
        trackingStats.isActive = !trackingStats.isActive;
        mainWindow?.webContents.send('tracking-toggled', trackingStats.isActive);
        updateTrayMenu();
      },
    },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        if (process.platform === 'darwin') app.dock?.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Start on Boot',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem: any) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: true,
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit NetReward',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);

  // Update tooltip
  tray?.setToolTip(
    trackingStats.isActive
      ? `NetReward — ${trackingStats.gbTracked.toFixed(1)} GB | ${trackingStats.nrtEarned.toFixed(2)} NRT`
      : 'NetReward — Tracking Paused'
  );
}

// ── IPC Handlers ────────────────────────────────────────────────────────────
function setupIPC() {
  // Update tray stats from renderer
  ipcMain.on('update-tray-stats', (_event, stats: { gbTracked: number; nrtEarned: number; isActive: boolean }) => {
    trackingStats = stats;
    updateTrayMenu();
  });

  // Show native notification
  ipcMain.on('show-notification', (_event, data: { title: string; body: string }) => {
    new Notification(data).show();
  });

  // Get platform info
  ipcMain.handle('get-platform', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
  }));

  // Auto-updater install
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

// ── Auto-Updater ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater-event', { type: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater-event', { type: 'available', info });
  });
  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('updater-event', { type: 'not-available', info });
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater-event', { type: 'error', info: err.message });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('updater-event', { type: 'progress', info: progressObj });
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater-event', { type: 'downloaded', info });
  });

  // Check on startup
  autoUpdater.checkForUpdatesAndNotify();
}

// ── Bandwidth Tracking ──────────────────────────────────────────────────────
let lastRx = 0;
let lastTx = 0;

async function startBandwidthTracking() {
  // Initialize baseline
  try {
    const stats = await si.networkStats();
    if (stats && stats.length > 0) {
      // Sum all interfaces or take default
      let sumRx = 0, sumTx = 0;
      for (const iface of stats) {
        sumRx += iface.rx_bytes;
        sumTx += iface.tx_bytes;
      }
      lastRx = sumRx;
      lastTx = sumTx;
    }
  } catch (e) {
    console.error('Failed to init network stats', e);
  }

  // Poll every 5 seconds
  setInterval(async () => {
    if (!trackingStats.isActive) return; // Don't track if paused

    try {
      const stats = await si.networkStats();
      if (stats && stats.length > 0) {
        let sumRx = 0, sumTx = 0;
        for (const iface of stats) {
          sumRx += iface.rx_bytes;
          sumTx += iface.tx_bytes;
        }

        const diffRx = sumRx - lastRx;
        const diffTx = sumTx - lastTx;
        
        lastRx = sumRx;
        lastTx = sumTx;

        // Ensure valid diff (handles counter wraps/reboots)
        if (diffRx > 0 || diffTx > 0) {
          mainWindow?.webContents.send('network-stats-update', {
            rxBytes: Math.max(0, diffRx),
            txBytes: Math.max(0, diffTx)
          });
        }
      }
    } catch (e) {
      // Silent error on poll
    }
  }, 5000);
}

// ── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIPC();
  setupAutoUpdater();
  startBandwidthTracking();

  // Auto-start on boot (default: enabled)
  if (!app.getLoginItemSettings().openAtLogin) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
    });
  }
});

// macOS: re-create window on dock click
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Global quit handler
app.on('before-quit', () => {
  isQuitting = true;
});

// Keep app running when all windows closed (tray stays)
app.on('window-all-closed', () => {
  // Don't quit — tray keeps the app alive
  if (process.platform !== 'darwin') {
    // On Windows/Linux, keep the tray alive
  }
});
