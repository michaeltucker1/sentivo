import { BrowserWindow, ipcMain, app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import log from 'electron-log';

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Track the main window
let mainWindow: BrowserWindow | null = null;

// Simple auto-update handler
export function setupAutoUpdater(window: BrowserWindow) {
  mainWindow = window;
  
  // Check for updates on startup
  autoUpdater.checkForUpdates().catch(console.error);
  
  // Check for updates every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(console.error);
  }, 6 * 60 * 60 * 1000);

  // Handle update available
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info.version);
  
  // Auto-download the update
  autoUpdater.downloadUpdate().catch(console.error);
});

// Handle update downloaded
autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
  
  // Auto-install the update
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1000);
});

// Handle errors
autoUpdater.on('error', (error) => {
  console.error('Update error:', error);
  mainWindow?.webContents.send('update-error', error.message);
});
}

// IPC handlers
export function registerUpdaterIpc() {
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}
