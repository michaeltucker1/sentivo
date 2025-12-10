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
  resizeSearchWindow: (height: number) =>
    ipcRenderer.invoke("search:resize-window", height),

  // Onboarding
  closeOnboardingAndOpenSearch: () =>
    ipcRenderer.invoke("onboarding:close-and-open-search"),
  isFirstLaunch: () =>
    ipcRenderer.invoke("onboarding:is-first-launch"),
  setOnboardingComplete: () =>
    ipcRenderer.invoke("onboarding:set-complete"),

  // Auto-update
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback: (event: any, version: string) => void) => 
    ipcRenderer.on('update-available', (event: any, version: string) => callback(event, version)),
  onUpdateDownloaded: (callback: () => void) => 
    ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback: (event: any, error: string) => void) => 
    ipcRenderer.on('update-error', (event: any, error: string) => callback(event, error)),

  // Feedback
  sendFeedback: (data: {
    category: string;
    userEmail: string;
    message: string;
  }) => ipcRenderer.invoke("feedback:send", data),
});