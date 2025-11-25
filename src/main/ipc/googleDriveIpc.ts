import { ipcMain } from "electron";
import { initGoogleDriveAuth, listDriveFiles, getGoogleAuthInstance } from "../integrations/googleDrive/googleDrive.js";
import { insertOrUpdateFiles, getAllFiles, clearGoogleDriveIndex } from "../database/googleDriveIndex.js";
import { clearSearchCache } from "../database/search.js";

export const registerGoogleDriveIpc = (clientId: string, clientSecret: string) => {
  initGoogleDriveAuth(clientId, clientSecret);

  //Auth
  ipcMain.handle("google-drive:add-account", async () => {
    const auth = getGoogleAuthInstance();
    await auth.signIn();
    return { success: true };
  });

  ipcMain.handle("google-drive:sign-out", async () => {
    const auth = getGoogleAuthInstance();
    await auth.signOut();
    clearGoogleDriveIndex();
    clearSearchCache('drive');
    return { success: true };
  });

  ipcMain.handle("google-drive:get-token", async () => {
    const auth = getGoogleAuthInstance();
    return await auth.getAccessToken();
  });

  ipcMain.handle("google-drive:list-files", async () => {
    return await listDriveFiles();
  });

  //Database
  ipcMain.handle("google-drive:save-files", async (_, files) => {
    insertOrUpdateFiles(files);
    return { success: true };
  });
  
  ipcMain.handle("google-drive:get-indexed-files", async () => {
    return getAllFiles();
  });

};
