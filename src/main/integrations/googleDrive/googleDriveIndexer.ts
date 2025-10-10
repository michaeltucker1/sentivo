// src/main/googleDriveIndexer.ts
import { EventEmitter } from "events";
import { app, ipcMain } from "electron";
import { getGoogleAuthInstance } from "./googleDrive.js";
import { insertOrUpdateFiles } from "../../database/googleDriveIndex.js";

import { getDatabase } from "../../database/db.js";
import { setTimeout as wait } from "timers/promises";
import { GoogleDriveFile } from "../../database/googleDriveIndex.js";

type IndexStatus = "idle" | "indexing" | "paused" | "completed" | "error";
interface GoogleDriveIndexState {
    id: number;
    last_index_page_token: string | null;
    last_change_page_token: string | null;
    status: "idle" | "indexing" | "paused" | "completed" | "error";
    indexed_count: number;
    updated_at: string | null;
}

const PAGE_SIZE = 1000; 

export class GoogleDriveIndexer extends EventEmitter {
  private isStopping = false;

  constructor() {
    super();
  }

  private normaliseDriveFile(file: Partial<GoogleDriveFile>): GoogleDriveFile {
    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType ?? null,
      modifiedTime: file.modifiedTime ?? null,
      thumbnailLink: file.thumbnailLink ?? null,
      webViewLink: file.webViewLink ?? null,
    };
  }

  private getStateRow(): GoogleDriveIndexState {
    const row = getDatabase()
        .prepare("SELECT * FROM google_drive_index_state WHERE id = 1")
        .get() as GoogleDriveIndexState | undefined;
  
    if (row) return row;
  
    // fallback if no row exists yet
    return {
      id: 1,
      last_index_page_token: null,
      last_change_page_token: null,
      status: "idle",
      indexed_count: 0,
      updated_at: null,
    };
  }

  private updateState(partial: Partial<{ last_index_page_token: string | null; last_change_page_token: string | null; status: IndexStatus; indexed_count: number; }>) {
    // merge with current row and upsert
    const cur = this.getStateRow();
    const indextoken = partial.last_index_page_token ?? cur.last_index_page_token;
    const changetoken = partial.last_change_page_token ?? cur.last_change_page_token;
    const status = partial.status ?? cur.status;
    const count = typeof partial.indexed_count === "number" ? partial.indexed_count : cur.indexed_count;
    const now = new Date().toISOString();
    getDatabase().prepare(`
      INSERT INTO google_drive_index_state (id, last_index_page_token, last_change_page_token, status, indexed_count, updated_at)
      VALUES (1, @indextoken, @changetoken, @status, @count, @now)
      ON CONFLICT(id) DO UPDATE SET
        last_index_page_token=@indextoken,
        last_change_page_token=@changetoken,
        status=@status,
        indexed_count=@count,
        updated_at=@now;
    `).run({ indextoken, changetoken, status, count, now });
  }

  private async getStartPageToken(): Promise<string> {
    const auth = getGoogleAuthInstance();
    const token = await auth.getAccessToken();
    const res = await fetch("https://www.googleapis.com/drive/v3/changes/startPageToken", {
      headers: { Authorization: `Bearer ${token}` }
    });
  
    if (!res.ok) throw new Error(`Failed to get startPageToken: ${res.status}`);
    const data = await res.json();
    const tokenValue = data.startPageToken;
    this.updateState({ last_change_page_token: tokenValue });
    return tokenValue;
  }

  /** Public: start or resume indexing. Emits progress events and updates DB checkpoint. */
  public async startIndexing() {
    if (this.getStateRow().status === "indexing") {
      // already indexing
      return;
    }
    this.isStopping = false;
    this.updateState({ status: "indexing" });

    try {
      const auth = getGoogleAuthInstance();
      const token = await auth.getAccessToken();
      if (!token) throw new Error("Not authenticated");

      // Drive API: we use files.list with fields minimized
      // Resume from last saved page token if present
      let pageToken = this.getStateRow().last_index_page_token ?? undefined;

      let totalIndexed = this.getStateRow().indexed_count ?? 0;
      let pageCount = 0;

      while (!this.isStopping) {
        const params: Record<string, string> = {
          pageSize: String(PAGE_SIZE),
          fields: "nextPageToken, files(id, name, mimeType, modifiedTime, thumbnailLink, webViewLink)",
          q: "trashed = false" // exclude trashed
        };
        if (pageToken) params.pageToken = pageToken;

        const url = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams(params).toString()}`;

        // request with authorization
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
          // try refresh once
          await auth.getAccessToken(); // this will refresh internally if needed
          continue;
        }

        if (!res.ok) {
          // transient errors -> backoff and retry
          const code = res.status;
          const text = await res.text().catch(() => "");
          console.warn("Drive list error", code, text);
          await this.handleRetryDelay(code);
          continue;
        }

        const data = await res.json();
        const files: GoogleDriveFile[] = (data.files ?? []) as GoogleDriveFile[];

        // Batch insert into DB
        if (files.length > 0) {
            // convert to your DB shape if needed; here files match
            const normalisedFiles = files.map(file => this.normaliseDriveFile(file));
            insertOrUpdateFiles(normalisedFiles);

            totalIndexed += files.length;
            pageCount++;
            // checkpoint after each page
            this.updateState({ last_index_page_token: data.nextPageToken ?? null, indexed_count: totalIndexed });
            // Emit progress to renderer
            this.emit("progress", { indexed: totalIndexed, lastPageToken: data.nextPageToken ?? null, pageCount });
        } else {
          // no files on this page
          this.updateState({ last_index_page_token: data.nextPageToken ?? null, indexed_count: totalIndexed });
        }

        // if no next page -> done
        if (!data.nextPageToken) {
          this.updateState({ status: "completed", last_index_page_token: null, indexed_count: totalIndexed });
          this.getStartPageToken()
          this.emit("completed", { indexed: totalIndexed });
          break;
        }

        // prepare for next page
        pageToken = data.nextPageToken;

        // Small delay to be polite (and let event loop breathe)
        await wait(50); // 50ms - tune if you hit rate limits
      }

      if (this.isStopping) {
        this.updateState({ status: "paused", last_index_page_token: this.getStateRow().last_index_page_token, indexed_count: totalIndexed });
        this.emit("paused", { indexed: totalIndexed });
      }

    } catch (err) {
      console.error("Indexing error", err);
      this.updateState({ status: "error" });
      this.emit("error", err);
    }
  }

  public async pollIncrementalChanges(intervalMs = 0.5 * 60 * 1000) {
    while (true) {
      try {
        const auth = getGoogleAuthInstance();
        const accessToken = await auth.getAccessToken();
        const state = this.getStateRow();
        let pageToken = state.last_change_page_token;
  
        if (!pageToken) {
          pageToken = await this.getStartPageToken();
        }
  
        const changesUrl = `https://www.googleapis.com/drive/v3/changes?pageToken=${pageToken}&fields=nextPageToken,newStartPageToken,changes(fileId,file(id,name,mimeType,modifiedTime,trashed,thumbnailLink,webViewLink))`;
  
        const res = await fetch(changesUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
  
        if (!res.ok) throw new Error(`Changes list failed: ${res.status}`);
        const data = await res.json();
  
        const changes = data.changes ?? [];
        if (changes.length > 0) {
          for (const change of changes) {
            const f = change.file;
            if (!f) continue;
  
            if (f.trashed) {
              getDatabase().prepare("DELETE FROM google_drive WHERE id = ?").run(f.id);
            } else {
              insertOrUpdateFiles([this.normaliseDriveFile(f)]);
            }
          }
        }
  
        // Update token for next cycle
        const newToken = data.newStartPageToken ?? data.nextPageToken;
        if (newToken) this.updateState({ last_change_page_token: newToken });
  
        this.emit("incremental-sync", { changes: changes.length, newToken });
  
      } catch (err) {
        console.error("Incremental sync error:", err);
        this.emit("error", err);
      }
  
      await wait(intervalMs);
    }
  }
  

  /** Stop indexing gracefully (will stop after current page and checkpoint) */
  public stop() {
    this.isStopping = true;
  }

  /** Simple retry/backoff behavior for transient errors */
  private async handleRetryDelay(statusCode: number) {
    // For 429 and 5xx, backoff. Else throw.
    if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      // exponential-ish: use some time based on attempts — simple sleep
      await wait(1000); // 1s
      return;
    }
    // other statuses: small delay then continue
    await wait(500);
  }

  /** Expose current state quickly */
  public getState() {
    return this.getStateRow();
  }
}

/** IPC wiring example (main process) */
export function registerIndexerIpc(indexer: GoogleDriveIndexer) {
  // start
  ipcMain.handle("drive:index:start", async () => {
    indexer.startIndexing();
    return { started: true };
  });

  // stop
  ipcMain.handle("drive:index:stop", async () => {
    indexer.stop();
    return { stopped: true };
  });

  // status
  ipcMain.handle("drive:index:status", async () => {
    return indexer.getState();
  });

  // forward progress updates to renderer as events
  indexer.on("progress", (p) => {
    // you can broadcast via BrowserWindow.webContents.send or a simple IPC channel
    // e.g. mainWindow.webContents.send('drive:index:progress', p)
    // we'll dispatch via a generic IPC channel:
    // NOTE: access to mainWindow available in your main.ts scope
    // implement sending there or create a small publisher
    // For example:
    // mainWindow?.webContents.send("drive:index:progress", p);
  });

  indexer.on("completed", (payload) => {
    // broadcast completed
  });

  indexer.on("error", (err) => {
    // broadcast error
  });
}
