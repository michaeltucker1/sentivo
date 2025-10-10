import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { app, BrowserWindow } from "electron";
import { registerGoogleDriveIpc } from "./ipc/googleDriveIpc.js";
import { initializeDatabase } from "./database/db.js";
import { GoogleDriveIndexer } from './integrations/googleDrive/googleDriveIndexer.js';

// Load environment variables first
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Verify environment variables are loaded
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in .env');
  process.exit(1);
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    title: "Sentivo",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  } else {
    // Try to find Vite dev server on common ports
    const tryLoadUrl = (port: number) => {
      const url = `http://localhost:${port}`;
      win.loadURL(url).catch(() => {
        if (port < 5180) {
          tryLoadUrl(port + 1);
        } else {
          console.error("Could not connect to Vite dev server");
        }
      });
    };
    tryLoadUrl(5173);
    win.webContents.openDevTools();
  }
};

app.whenReady().then(async () => {
  initializeDatabase();
  // Register Google Drive IPC with environment variables
  registerGoogleDriveIpc(googleClientId!, googleClientSecret!);

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
