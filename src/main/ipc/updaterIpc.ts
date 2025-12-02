import { BrowserWindow, ipcMain, app } from 'electron';
// import log from 'electron-log';
import updaterPkg from "electron-updater";
const { autoUpdater } = updaterPkg;

// Configure autoUpdater logging
// if (autoUpdater.logger) {
//   autoUpdater.logger = log;
//   log.transports.file.level = 'info';
// }

// Store update state in memory
const updateState = {
  isUpdateAvailable: false,
  isDownloaded: false,
  version: '',
  releaseNotes: '',
  error: null as Error | null,
};

// Track all open windows for broadcasting updates
const windows = new Set<BrowserWindow>();

export function registerUpdaterIpc() {
  // Register IPC handlers
  ipcMain.handle('updater:check-for-updates', handleCheckForUpdates);
  ipcMain.handle('updater:download-update', handleDownloadUpdate);
  ipcMain.handle('updater:get-status', () => updateState);
  ipcMain.handle('updater:install-update', handleInstallUpdate);

  // Set up autoUpdater event listeners
autoUpdater.on('checking-for-update', () => {
  updateState.isUpdateAvailable = false;
  updateState.isDownloaded = false;
  broadcastUpdate('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  updateState.isUpdateAvailable = true;
  updateState.version = info.version;
  updateState.releaseNotes = typeof info.releaseNotes === 'string' 
    ? info.releaseNotes 
    : info.releaseNotes?.map(note => typeof note === 'string' ? note : note.note || '').join('\n') || '';
  broadcastUpdate('update-available', info);
});

autoUpdater.on('update-not-available', () => {
  updateState.isUpdateAvailable = false;
  updateState.isDownloaded = false;
  broadcastUpdate('update-not-available');
});

autoUpdater.on('download-progress', (progressObj) => {
  broadcastUpdate('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  updateState.isDownloaded = true;
  broadcastUpdate('update-downloaded', info);
});

autoUpdater.on('error', (error) => {
  updateState.error = error;
  broadcastUpdate('error', error);
});

  // Install updates when all windows are closed if an update is ready
  app.on('will-quit', (event) => {
    if (updateState.isDownloaded) {
      event.preventDefault();
      installUpdate();
    }
  });
}

export function registerWindow(win: BrowserWindow) {
  windows.add(win);
  win.on('closed', () => {
    windows.delete(win);
  });
}

// IPC Handlers
async function handleCheckForUpdates() {
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    updateState.error = error as Error;
    return { success: false, error: (error as Error).message };
  }
}

async function handleDownloadUpdate() {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    updateState.error = error as Error;
    return { success: false, error: (error as Error).message };
  }
}

function handleInstallUpdate() {
  if (updateState.isDownloaded) {
    setImmediate(() => {
      app.removeAllListeners('window-all-closed');
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.removeAllListeners('close');
          win.close();
        }
      });
      autoUpdater.quitAndInstall();
    });
    return { success: true };
  }
  return { success: false, error: 'No update downloaded' };
}

// Helper to broadcast updates to all windows
function broadcastUpdate(event: string, data?: any) {
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(`updater:${event}`, data);
    }
  });
}

// Helper to install the update
function installUpdate() {
  if (updateState.isDownloaded) {
    autoUpdater.quitAndInstall();
  }
}
