import { app, BrowserWindow, ipcMain } from "electron";
import pkg from "electron-updater";
import log from "electron-log";

const { autoUpdater } = pkg;

// --- Auto-updater configuration ---
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
// We install explicitly via IPC so we control restart timing
autoUpdater.autoInstallOnAppQuit = false;

let mainWindow: BrowserWindow | null = null;

/**
 * Wire up electron-updater to GitHub Releases and forward state to the renderer.
 * This is only active in packaged builds – in dev we no-op to avoid noisy errors.
 */
export function setupAutoUpdater(window: BrowserWindow) {
  if (!app.isPackaged) {
    log.info("[auto-updater] Disabled in development");
    return;
  }

  mainWindow = window;

  log.info("[auto-updater] Initialising");

  // Basic lifecycle events
  autoUpdater.on("checking-for-update", () => {
    log.info("[auto-updater] Checking for update");
  });

  autoUpdater.on("update-available", (info) => {
    log.info(`[auto-updater] Update available: ${info.version}`);
    mainWindow?.webContents.send("update-available", info.version);
    // With autoDownload=true electron-updater will download automatically.
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info(
      `[auto-updater] No update available (current: ${info.version ?? "unknown"})`,
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info(
      `[auto-updater] Update downloaded: ${info.version}. Waiting for user to install.`,
    );
    mainWindow?.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (error: Error) => {
    log.error("[auto-updater] Error", error);
    mainWindow?.webContents.send("update-error", error.message);
  });

  // Kick off an initial check and then poll occasionally
  autoUpdater
    .checkForUpdates()
    .catch((err: unknown) => log.error("[auto-updater] Initial check failed", err));

  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((err: unknown) =>
        log.error("[auto-updater] Periodic check failed", err),
      );
  }, SIX_HOURS);
}

// --- IPC handlers ---
export function registerUpdaterIpc() {
  if (!app.isPackaged) {
    // No-op in dev, keeps renderer calls safe
    ipcMain.handle("install-update", () => ({ success: false, reason: "dev" }));
    return;
  }

  ipcMain.handle("install-update", () => {
    log.info("[auto-updater] Installing update and restarting app");
    // The second arg (isSilent) defaults to false; we want a normal restart.
    autoUpdater.quitAndInstall();
    return { success: true };
  });
}
