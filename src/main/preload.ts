import { contextBridge, ipcRenderer } from "electron";
import { GoogleDriveFile } from "./database/googleDriveIndex.js";

contextBridge.exposeInMainWorld("api", {
  version: "0.1.0",

  // Google Drive
  addGoogleDriveAccount: () => ipcRenderer.invoke("google-drive:add-account"),
  signOutGoogleDrive: () => ipcRenderer.invoke("google-drive:sign-out"),
  getGoogleDriveToken: () => ipcRenderer.invoke("google-drive:get-token"),
  listGoogleDriveFiles: () => ipcRenderer.invoke("google-drive:list-files"),
  saveGoogleDriveFiles: (files: GoogleDriveFile) => ipcRenderer.invoke("google-drive:save-files", files),
  getIndexedFiles: () => ipcRenderer.invoke("google-drive:get-indexed-files"),

  // Search
  search: (query: string, limit?: number) =>
    ipcRenderer.invoke("search:query", query, limit),
  openLocalPath: (filePath: string) =>
    ipcRenderer.invoke("search:open-local-path", filePath),
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke("search:open-external-url", url),
});
