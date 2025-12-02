const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  version: "0.1.0",

  // Google Drive
  addGoogleDriveAccount: () => ipcRenderer.invoke("google-drive:add-account"),
  signOutGoogleDrive: () => ipcRenderer.invoke("google-drive:sign-out"),
  getGoogleDriveToken: () => ipcRenderer.invoke("google-drive:get-token"),
  listGoogleDriveFiles: () => ipcRenderer.invoke("google-drive:list-files"),
  saveGoogleDriveFiles: (files: any[]) => ipcRenderer.invoke("google-drive:save-files", files), 
  getIndexedFiles: () => ipcRenderer.invoke("google-drive:get-indexed-files"),

  // Search
  search: (query: string, limit?: number) =>
    ipcRenderer.invoke("search:query", query, limit),
  openLocalPath: (filePath: string) =>
    ipcRenderer.invoke("search:open-local-path", filePath),
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("search:open-external-url", url),
  hideSearchWindow: () =>
    ipcRenderer.invoke("search:hide-window"),
  toggleSettingsWindow: () =>
    ipcRenderer.invoke("settings:toggle-window"),

  // Onboarding
  closeOnboardingAndOpenSearch: () =>
    ipcRenderer.invoke("onboarding:close-and-open-search"),
  isFirstLaunch: () =>
    ipcRenderer.invoke("onboarding:is-first-launch"),
  setOnboardingComplete: () =>
    ipcRenderer.invoke("onboarding:set-complete"),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),
  installUpdate: () => ipcRenderer.invoke('updater:install-update'),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => 
    ipcRenderer.on('updater:update-available', callback),
  onDownloadProgress: (callback: (event: any, progress: any) => void) => 
    ipcRenderer.on('updater:download-progress', callback),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => 
    ipcRenderer.on('updater:update-downloaded', callback),
  onError: (callback: (event: any, error: Error) => void) => 
    ipcRenderer.on('updater:error', callback),

  // Feedback
  sendFeedback: (data: {
    category: string;
    userEmail: string;
    message: string;
  }) => ipcRenderer.invoke("feedback:send", data),
});