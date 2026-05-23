# NetReward — Desktop Development Plan (Windows, macOS, Linux)

## Overview

A single Electron app that wraps the existing Vite web app in a native desktop shell with system tray/menu bar widget, background telemetry, auto-start, and auto-update. One codebase produces builds for all three desktop platforms.

---

## Project Setup

```bash
mkdir -p apps/desktop
cd apps/desktop
npm init -y
npm install electron electron-builder electron-updater electron-store
npm install --save-dev @electron/rebuild concurrently wait-on
```

---

## Directory Structure

```
apps/desktop/
├── main/
│   ├── main.ts                  ← Electron main process entry
│   ├── tray.ts                  ← System tray / menu bar widget
│   ├── telemetry.ts             ← OS-level network stats collector
│   ├── auto-updater.ts          ← GitHub Releases auto-updater
│   ├── ipc-handlers.ts          ← IPC bridge (main ↔ renderer)
│   └── auto-launch.ts           ← Start on boot
├── preload/
│   └── preload.ts               ← Secure context bridge
├── renderer/                    ← Loads your existing Vite web app
│   └── index.html               ← Points to localhost:5173 (dev) or built files (prod)
├── assets/
│   ├── icons/
│   │   ├── icon.icns            ← macOS app icon (512×512)
│   │   ├── icon.ico             ← Windows app icon (256×256)
│   │   ├── icon.png             ← Linux app icon (512×512)
│   │   ├── tray-default.png     ← Tray icon (16×16 / 32×32)
│   │   ├── tray-active.png      ← Green tray (tracking active)
│   │   └── tray-paused.png      ← Grey tray (tracking paused)
│   └── splash.html              ← Loading screen while renderer boots
├── electron-builder.yml         ← Build config for all 3 platforms
├── tsconfig.json
└── package.json
```

---

## Main Process

```typescript
// main/main.ts
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'path';
import { createTray, updateTrayStats } from './tray';
import { startTelemetry, stopTelemetry } from './telemetry';
import { setupAutoUpdater } from './auto-updater';
import { setupAutoLaunch } from './auto-launch';

let mainWindow: BrowserWindow | null = null;

// Prevent multiple instances
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NetReward',
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    backgroundColor: '#0a0a0f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false, // Show after ready-to-show
  });

  // Load the Vite app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // CRITICAL: Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray(mainWindow!);
  startTelemetry();
  setupAutoUpdater();
  setupAutoLaunch();
});

// macOS: hide dock icon when window is hidden (menu bar app behavior)
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// Global quit handler
app.on('before-quit', () => {
  app.isQuitting = true;
  stopTelemetry();
});
```

---

## System Tray / Menu Bar Widget

### Windows: System Tray (Bottom-right notification area)
### macOS: Menu Bar (Top-right status menu)
### Linux: System Tray (AppIndicator / StatusNotifierItem)

```typescript
// main/tray.ts
import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let currentStats = { gbTracked: 0, nrtEarned: 0, isActive: true };

export function createTray(mainWindow: BrowserWindow) {
  const iconPath = path.join(__dirname, '../assets/icons/tray-active.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  tray.setToolTip('NetReward — Tracking Active');
  
  updateTrayMenu(mainWindow);
  
  // Left-click: show/hide window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      // macOS: hide dock icon when minimized to menu bar
      if (process.platform === 'darwin') app.dock?.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
      if (process.platform === 'darwin') app.dock?.show();
    }
  });
}

function updateTrayMenu(mainWindow: BrowserWindow) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `📊 ${currentStats.gbTracked.toFixed(1)} GB tracked — ${currentStats.nrtEarned.toFixed(2)} NRT`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: currentStats.isActive ? '🟢 Tracking Active' : '🔴 Tracking Paused',
      type: 'checkbox',
      checked: currentStats.isActive,
      click: () => {
        currentStats.isActive = !currentStats.isActive;
        updateTrayMenu(mainWindow);
        mainWindow.webContents.send('tracking-toggled', currentStats.isActive);
      },
    },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        if (process.platform === 'darwin') app.dock?.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Start on Boot',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit NetReward',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);
  
  // Update tray icon based on state
  const iconName = currentStats.isActive ? 'tray-active.png' : 'tray-paused.png';
  const iconPath = path.join(__dirname, `../assets/icons/${iconName}`);
  tray?.setImage(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  
  // Update tooltip
  tray?.setToolTip(
    currentStats.isActive
      ? `NetReward — ${currentStats.gbTracked.toFixed(1)} GB | ${currentStats.nrtEarned.toFixed(2)} NRT`
      : 'NetReward — Tracking Paused'
  );
}

// Called by telemetry module to update live stats
export function updateTrayStats(gbTracked: number, nrtEarned: number) {
  currentStats.gbTracked = gbTracked;
  currentStats.nrtEarned = nrtEarned;
  // Re-render tray menu with updated stats
  // (requires reference to mainWindow — store globally)
}
```

---

## OS-Level Network Telemetry

```typescript
// main/telemetry.ts
import os from 'os';
import { ipcMain } from 'electron';

interface NetworkSnapshot {
  bytesRx: number;
  bytesTx: number;
  timestamp: number;
}

let previousSnapshot: NetworkSnapshot | null = null;
let sessionBytesUp = 0;
let sessionBytesDown = 0;
let telemetryInterval: NodeJS.Timeout | null = null;

function getNetworkBytes(): NetworkSnapshot {
  const interfaces = os.networkInterfaces();
  let totalRx = 0;
  let totalTx = 0;
  
  // Sum all non-internal interfaces
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.internal) continue;
      // os.networkInterfaces() doesn't provide byte counters directly.
      // On real implementation, use platform-specific APIs:
      // - Windows: `netstat -e` or WMI
      // - macOS: `netstat -ib` or IOKit
      // - Linux: `/proc/net/dev`
    }
  }
  
  return { bytesRx: totalRx, bytesTx: totalTx, timestamp: Date.now() };
}

// Platform-specific byte counters
async function getPlatformNetworkBytes(): Promise<{ rx: number; tx: number }> {
  const { execSync } = require('child_process');
  
  switch (process.platform) {
    case 'linux': {
      // Read /proc/net/dev
      const data = require('fs').readFileSync('/proc/net/dev', 'utf-8');
      const lines = data.split('\n').slice(2);
      let totalRx = 0, totalTx = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10 || parts[0].startsWith('lo:')) continue;
        totalRx += parseInt(parts[1], 10);
        totalTx += parseInt(parts[9], 10);
      }
      return { rx: totalRx, tx: totalTx };
    }
    case 'darwin': {
      // macOS: parse netstat -ib
      const output = execSync('netstat -ib', { encoding: 'utf-8' });
      const lines = output.split('\n');
      let totalRx = 0, totalTx = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11 || parts[0] === 'Name' || parts[0] === 'lo0') continue;
        totalRx += parseInt(parts[6], 10) || 0;
        totalTx += parseInt(parts[9], 10) || 0;
      }
      return { rx: totalRx, tx: totalTx };
    }
    case 'win32': {
      // Windows: parse netstat -e
      const output = execSync('netstat -e', { encoding: 'utf-8' });
      const bytesLine = output.split('\n').find(l => l.includes('Bytes'));
      if (bytesLine) {
        const parts = bytesLine.trim().split(/\s+/);
        return { rx: parseInt(parts[1], 10), tx: parseInt(parts[2], 10) };
      }
      return { rx: 0, tx: 0 };
    }
    default:
      return { rx: 0, tx: 0 };
  }
}

export function startTelemetry() {
  telemetryInterval = setInterval(async () => {
    const current = await getPlatformNetworkBytes();
    
    if (previousSnapshot) {
      const deltaRx = current.rx - previousSnapshot.bytesRx;
      const deltaTx = current.tx - previousSnapshot.bytesTx;
      
      if (deltaRx > 0) sessionBytesDown += deltaRx;
      if (deltaTx > 0) sessionBytesUp += deltaTx;
    }
    
    previousSnapshot = { bytesRx: current.rx, bytesTx: current.tx, timestamp: Date.now() };
  }, 5000); // Sample every 5 seconds
}

export function stopTelemetry() {
  if (telemetryInterval) clearInterval(telemetryInterval);
}
```

---

## Auto-Launch on Boot

```typescript
// main/auto-launch.ts
import { app } from 'electron';

export function setupAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true, // Start minimized to tray
    path: app.getPath('exe'),
  });
}

export function setAutoLaunch(enabled: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
  });
}
```

---

## Auto-Updater

```typescript
// main/auto-updater.ts
import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';

export function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  
  autoUpdater.on('update-available', (info) => {
    console.log(`Update available: v${info.version}`);
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `NetReward v${info.version} has been downloaded. Restart to install?`,
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  // Check for updates every 4 hours
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000);
  autoUpdater.checkForUpdatesAndNotify();
}
```

---

## Build Configuration

```yaml
# electron-builder.yml
appId: com.netreward.desktop
productName: NetReward
copyright: Copyright © 2026 NetReward

directories:
  output: release
  buildResources: assets

files:
  - main/**/*
  - preload/**/*
  - renderer/**/*
  - assets/**/*

# ── Windows ──────────────────────────────────────────────
win:
  target:
    - target: nsis
      arch: [x64, arm64]
    - target: portable
      arch: [x64]
  icon: assets/icons/icon.ico
  requestedExecutionLevel: asInvoker

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: NetReward
  runAfterFinish: true

# ── macOS ────────────────────────────────────────────────
mac:
  target:
    - target: dmg
      arch: [universal]  # x64 + arm64 in one binary
    - target: zip
      arch: [universal]
  icon: assets/icons/icon.icns
  category: public.app-category.finance
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: entitlements.plist
  entitlementsInherit: entitlements.plist

dmg:
  background: assets/dmg-background.png
  iconSize: 100
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

# ── Linux ────────────────────────────────────────────────
linux:
  target:
    - target: AppImage
      arch: [x64, arm64]
    - target: deb
      arch: [x64]
    - target: rpm
      arch: [x64]
  icon: assets/icons/icon.png
  category: Finance
  desktop:
    StartupNotify: true
    StartupWMClass: netreward

# ── Auto-updater ─────────────────────────────────────────
publish:
  provider: github
  owner: daprof12
  repo: NetReward-Desktop
```

---

## Platform-Specific Differences

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Tray location | Bottom-right notification area | Top-right menu bar | Top panel (varies by DE) |
| Window chrome | Default title bar | Hidden inset (traffic lights) | Default title bar |
| Auto-start | `app.setLoginItemSettings()` | Same | `.desktop` file in `~/.config/autostart/` |
| Installer | `.exe` (NSIS) + `.msi` | `.dmg` + `.zip` | `.AppImage` + `.deb` + `.rpm` |
| Code signing | Authenticode ($200-400/yr) | Apple notarization ($99/yr) | Not required |
| Tray library | Built-in Electron | Built-in Electron | Requires `libappindicator` |
| Network stats | `netstat -e` | `netstat -ib` | `/proc/net/dev` |
| Universal binary | x64 + ARM64 separate | Universal (x64+arm64 combined) | x64 + ARM64 separate |

---

## macOS Menu Bar Specifics

```typescript
// macOS: hide dock icon when window is hidden
if (process.platform === 'darwin') {
  mainWindow.on('hide', () => {
    app.dock?.hide();
  });
  mainWindow.on('show', () => {
    app.dock?.show();
  });
}

// macOS: native window controls (traffic lights)
const mainWindow = new BrowserWindow({
  titleBarStyle: 'hiddenInset',
  trafficLightPosition: { x: 16, y: 16 },
  vibrancy: 'under-window', // Native blur effect
});
```

---

## Estimated Timeline

| Task | Duration |
|------|----------|
| Electron project setup | 1 day |
| Main process + window management | 2 days |
| System tray implementation | 2 days |
| Renderer integration (load Vite app) | 1 day |
| OS-level network telemetry | 3 days |
| Auto-launch on boot | 0.5 days |
| Auto-updater (GitHub Releases) | 1 day |
| IPC bridge (preload) | 1 day |
| Windows build + testing | 2 days |
| macOS build + notarization | 2 days |
| Linux build + packaging | 1 day |
| Testing across all 3 OSes | 2 days |
| **Total** | **~4 weeks** (Windows first, then macOS/Linux) |

---

## Distribution Channels

| Platform | Channel | Notes |
|----------|---------|-------|
| Windows | GitHub Releases + website download | Consider Microsoft Store later |
| macOS | GitHub Releases + website download | Notarized `.dmg` |
| Linux | GitHub Releases + Snap Store | `.AppImage` is most universal |
