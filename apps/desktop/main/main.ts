import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import * as path from 'path';

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
}

// ── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIPC();

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
