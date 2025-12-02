import { BrowserWindow, ipcMain, app, dialog } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import type { UpdateInfo, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater/out/types';
import log from 'electron-log';

// Type definitions for update state
interface UpdateState {
  isUpdateAvailable: boolean;
  isDownloaded: boolean;
  isUpdating: boolean;
  version: string;
  releaseNotes: string;
  error: string | null;
  progress: number;
  lastCheck: Date | null;
}

// Store update state in memory
const updateState: UpdateState = {
  isUpdateAvailable: false,
  isDownloaded: false,
  isUpdating: false,
  version: '',
  releaseNotes: '',
  error: null,
  progress: 0,
  lastCheck: null
};

// Track all open windows for broadcasting updates
const windows = new Set<BrowserWindow>();

// Configure autoUpdater logging
if (autoUpdater.logger) {
  autoUpdater.logger = log;
  log.transports.file.level = 'info';
  log.info('Auto-updater initialized');
}

// Helper to reset update state
function resetUpdateState() {
  updateState.isUpdateAvailable = false;
  updateState.isDownloaded = false;
  updateState.isUpdating = false;
  updateState.version = '';
  updateState.releaseNotes = '';
  updateState.error = null;
  updateState.progress = 0;
}

// Helper to broadcast updates to all windows
function broadcastUpdate(event: string, data?: any) {
  const message = {
    event,
    data,
    state: { ...updateState }
  };

  windows.forEach(win => {
    try {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send(`updater:${event}`, message);
      }
    } catch (error) {
      log.error('Error broadcasting update:', error);
    }
  });
}

// IPC Handlers
async function handleCheckForUpdates() {
  if (updateState.isUpdating) {
    return { 
      success: false, 
      error: 'Update check already in progress' 
    };
  }

  try {
    updateState.isUpdating = true;
    updateState.error = null;
    const result = await autoUpdater.checkForUpdates();
    return { 
      success: true, 
      updateInfo: result?.updateInfo,
      isUpdateAvailable: !!result?.updateInfo
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateState.error = errorMessage;
    log.error('Error checking for updates:', error);
    return { 
      success: false, 
      error: errorMessage,
      isUpdateAvailable: false
    };
  } finally {
    updateState.isUpdating = false;
    updateState.lastCheck = new Date();
  }
}

async function handleDownloadUpdate() {
  if (updateState.isUpdating) {
    return { success: false, error: 'Update already in progress' };
  }

  try {
    updateState.isUpdating = true;
    updateState.error = null;
    updateState.progress = 0;
    
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateState.error = errorMessage;
    log.error('Error downloading update:', error);
    return { 
      success: false, 
      error: errorMessage 
    };
  } finally {
    updateState.isUpdating = false;
  }
}

function handleInstallUpdate() {
  if (!updateState.isDownloaded) {
    return { 
      success: false, 
      error: 'No update has been downloaded yet' 
    };
  }

  // Give the UI time to respond before quitting
  setImmediate(() => {
    try {
      // Remove any listeners that might prevent quitting
      app.removeAllListeners('window-all-closed');
      
      // Close all windows
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.removeAllListeners('close');
          win.close();
        }
      });
      
      // Install and restart
      autoUpdater.quitAndInstall(true, true);
    } catch (error) {
      log.error('Error during install:', error);
      // If auto-install fails, try a manual restart
      app.relaunch();
      app.exit(0);
    }
  });

  return { success: true };
}

// Helper to install the update
function installUpdate() {
  if (updateState.isDownloaded) {
    handleInstallUpdate();
  } else {
    log.warn('Attempted to install update but no update is downloaded');
  }
}

export function registerWindow(win: BrowserWindow) {
  windows.add(win);
  win.on('closed', () => {
    windows.delete(win);
  });
}

export function registerUpdaterIpc() {
  // Configure auto-updater
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.fullChangelog = true;
  autoUpdater.allowDowngrade = false;

  // Register IPC handlers
  ipcMain.handle('updater:check-for-updates', handleCheckForUpdates);
  ipcMain.handle('updater:download-update', handleDownloadUpdate);
  ipcMain.handle('updater:get-status', () => updateState);
  ipcMain.handle('updater:install-update', handleInstallUpdate);

  // Set up autoUpdater event listeners
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    updateState.isUpdating = true;
    updateState.error = null;
    updateState.lastCheck = new Date();
    broadcastUpdate('checking-for-update');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available:', info.version);
    updateState.isUpdateAvailable = true;
    updateState.version = info.version;
    updateState.releaseNotes = typeof info.releaseNotes === 'string' 
      ? info.releaseNotes 
      : info.releaseNotes?.map(note => typeof note === 'string' ? note : note.note || '').join('\n') || '';
    
    broadcastUpdate('update-available', info);
    
    // Show notification to user
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      dialog.showMessageBox(focusedWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it now?`,
        detail: 'The update will be installed the next time you restart the application.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          handleDownloadUpdate();
        }
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available');
    updateState.isUpdating = false;
    updateState.lastCheck = new Date();
    broadcastUpdate('update-not-available');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    updateState.progress = Math.floor(progress.percent) || 0;
    broadcastUpdate('download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
    log.info('Update downloaded:', info.version);
    updateState.isDownloaded = true;
    updateState.isUpdating = false;
    updateState.version = info.version;
    broadcastUpdate('update-downloaded', info);
    
    // Notify user that update is ready
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      dialog.showMessageBox(focusedWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The update will be installed when you restart the application.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          handleInstallUpdate();
        }
      });
    }
  });

  autoUpdater.on('error', (error: Error) => {
    log.error('Update error:', error);
    updateState.isUpdating = false;
    updateState.error = error.message;
    broadcastUpdate('error', error);
    
    // Show error to user
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      dialog.showErrorBox('Update Error', error.message || 'An unknown error occurred during update.');
    }
  });

  // Install updates when all windows are closed if an update is ready
  app.on('will-quit', (event) => {
    if (updateState.isDownloaded) {
      event.preventDefault();
      installUpdate();
    }
  });

  // Initial check for updates (silent check)
  autoUpdater.checkForUpdates().catch(error => {
    log.error('Initial update check failed:', error);
  });

  // Periodically check for updates (every 4 hours)
  const CHECK_UPDATE_INTERVAL = 4 * 60 * 60 * 1000;
  setInterval(() => {
    if (!updateState.isUpdating) {
      autoUpdater.checkForUpdates().catch(error => {
        log.error('Periodic update check failed:', error);
      });
    }
  }, CHECK_UPDATE_INTERVAL);
}
