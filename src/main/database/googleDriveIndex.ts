import { getDatabase } from "./db.js";

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType?: string | null;
    modifiedTime?: string | null;
    thumbnailLink?: string | null;
    webViewLink?: string | null;
}

export function insertOrUpdateFiles(files: GoogleDriveFile[]) {
  const stmt = getDatabase().prepare(`
    INSERT OR REPLACE INTO google_drive (id, name, mimeType, modifiedTime, thumbnailLink, webViewLink)
    VALUES (@id, @name, @mimeType, @modifiedTime, @thumbnailLink, @webViewLink)
  `);

  const insertMany = getDatabase().transaction((fileList: GoogleDriveFile[]) => {
    for (const file of fileList) {
      stmt.run(file);
    }
  });

  insertMany(files);
}

export function getAllFiles(): GoogleDriveFile[] {
  const stmt = getDatabase().prepare("SELECT * FROM google_drive");
  return stmt.all() as GoogleDriveFile[];
}

export function searchFiles(keyword: string): GoogleDriveFile[] {
  const stmt = getDatabase().prepare(`
    SELECT * FROM google_drive WHERE name LIKE ? ORDER BY modifiedTime DESC
  `);
  return stmt.all(`%${keyword}%`) as GoogleDriveFile[];
}

export function clearGoogleDriveIndex() {
  const db = getDatabase();
  db.prepare("DELETE FROM google_drive").run();
  db.prepare(`
    UPDATE google_drive_index_state
    SET
      last_index_page_token = NULL,
      last_change_page_token = NULL,
      status = 'idle',
      indexed_count = 0,
      updated_at = datetime('now')
    WHERE id = 1
  `).run();
}
