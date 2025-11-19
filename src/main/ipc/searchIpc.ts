import { ipcMain } from "electron";
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

}