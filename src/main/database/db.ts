import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

let db: Database.Database;

/**
 * Initializes and returns a persistent SQLite database instance.
 * Automatically creates tables if they do not exist.
 */
export function initializeDatabase() {
  const dbPath = path.join(app.getPath("userData"), "google_drive.db");

  db = new Database(dbPath);
  console.log("SQLite database initialized at:", dbPath);

  // Create table if it doesn’t exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_drive (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mimeType TEXT,
      modifiedTime TEXT,
      thumbnailLink TEXT,
      webViewLink TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS google_drive_index_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_page_token TEXT,
      status TEXT,         -- 'idle' | 'indexing' | 'paused' | 'completed' | 'error'
      indexed_count INTEGER DEFAULT 0,
      updated_at TEXT
    );

    -- ensure a single row always exists
    INSERT OR IGNORE INTO google_drive_index_state (id, status, updated_at) VALUES (1, 'idle', datetime('now'));
  `)

  return db;
}

/**
 * Returns the existing database instance.
 */
export function getDatabase() {
  if (!db) throw new Error("Database not initialized. Call initializeDatabase() first.");
  return db;
}
