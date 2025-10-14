import { ipcMain } from "electron";
import { search } from "../database/search.js";

export const registerSearchIpc = () => {
  // Main search endpoint
  ipcMain.handle("search:query", async (_, query: string, limit?: number) => {
    try {
      const results = await search(query, limit);
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error("Search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown search error",
        data: { local: [], drive: [] }
      };
    }
  });

}