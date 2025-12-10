import { BrowserWindow, ipcMain, shell } from "electron";
import { search } from "../database/search.js";

export const registerSearchIpc = () => {
  // Main search endpoint
  ipcMain.handle("search:query", async (_, query: string, limit?: number) => {
    try {
      return await search(query, limit);
    } catch (error) {
      console.error("Search error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Unknown search error"
      );
    }
  });

  ipcMain.handle("search:open-local-path", async (_, filePath: string) => {
    try {
      if (!filePath) {
        throw new Error("No file path provided");
      }

      const result = await shell.openPath(filePath);
      if (result) {
        throw new Error(result);
      }

      return true;
    } catch (error) {
      console.error("Failed to open local path:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to open local file"
      );
    }
  });

  ipcMain.handle("search:open-external-url", async (_, url: string) => {
    try {
      if (!url) {
        throw new Error("No URL provided");
      }

      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error("Failed to open external URL:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to open external link"
      );
    }
  });

  ipcMain.handle("search:hide-window", async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.hide();
      return true;
    } catch (error) {
      console.error("Failed to hide search window:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to hide search window"
      );
    }
  });

  ipcMain.handle("search:resize-window", async (event, height: number) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        const [currentWidth] = window.getSize();
        window.setSize(currentWidth, height, true); // true = animate
      }
      return true;
    } catch (error) {
      console.error("Failed to resize search window:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to resize search window"
      );
    }
  });
};