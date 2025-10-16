import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { app, BrowserWindow, globalShortcut, Tray, Menu, screen } from "electron";
import { registerGoogleDriveIpc } from "./ipc/googleDriveIpc.js";
import { initializeDatabase } from "./database/db.js";
import { registerSearchIpc } from "./ipc/searchIpc.js";

// Load environment variables first
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Verify environment variables are loaded
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

let tray: any = null;
let settingsWindow: any = null;
let searchWindow: any = null;

if (!googleClientId || !googleClientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in .env');
  process.exit(1);
}

const createSettingsWindow = () => {
  const win = new BrowserWindow({
    width: 650,
    height: 550,
    minWidth: 650,
    minHeight: 550,
    maxWidth: 650,
    maxHeight: 550,
    resizable: false,        
    maximizable: false,
    show: false,
    title: "Sentivo",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "settings",
    });
  } else {
    const tryLoadUrl = (port: number) => {
      const url = `http://localhost:${port}/#/settings`;
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

  return win;
};

export const createSearchWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Dimensions: wider but short (room for search bar + results)
  const winWidth = 600;
  const winHeight = 500;

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: winWidth,
    minHeight: winHeight,
    maxWidth: winWidth,
    maxHeight: winHeight,     
    x: Math.round(width / 2 - winWidth / 2),
    y: Math.round(height / 4), // Slightly higher than center
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    title: "Sentivo",
    backgroundColor: "#00000000", // transparent background
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "search",
    });
  } else {
    const tryLoadUrl = (port: number) => {
      const url = `http://localhost:${port}/#/search`;
      win.loadURL(url).catch(() => {
        if (port < 5180) {
          tryLoadUrl(port + 1);
        } else {
          console.error("Could not connect to Vite dev server for search window");
        }
      });
    };
    tryLoadUrl(5173);
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.on("blur", () => {
    if (!win.webContents.isDevToolsOpened()) {
      win.hide();
    }
  });

  return win;
};

export function createTray() {
  try {
    // Use different paths for dev vs packaged app
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "assets", "logo.png") // production
      : path.join(__dirname, "assets/logo.png");              // development

    tray = new Tray(iconPath);
    tray.setToolTip("Sentivo");

    // Context menu
    const contextMenu = Menu.buildFromTemplate([
      { label: "Open Settings", click: () => toggleSettingsWindow() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);

    // Click handler
    // tray.on("click", () => toggleSettingsWindow());
  } catch (error) {
    console.error("Failed to create tray:", error);
  }
}

function toggleSettingsWindow() {
  if(searchWindow){
    if (searchWindow.isVisible()) {
      searchWindow.hide();
    }
  }
  
  if (!settingsWindow) createSettingsWindow();
  if (settingsWindow.isVisible()) {
    settingsWindow.hide();
  } else {
    settingsWindow.show();
    settingsWindow.focus();
  }
}

function toggleSearchWindow() {
  if (!searchWindow) createSearchWindow();
  if (searchWindow.isVisible()) {
    searchWindow.hide();
  } else {
    searchWindow.show();
    searchWindow.focus();
  }
}

app.whenReady().then(async () => {
  initializeDatabase();
  registerGoogleDriveIpc(googleClientId!, googleClientSecret!);
  registerSearchIpc();

  createTray();
  searchWindow = createSearchWindow();
  settingsWindow = createSettingsWindow();

  // Register ⌘ + Space
  globalShortcut.register('Control+Space', toggleSearchWindow);

  globalShortcut.register("CommandOrControl+R", () => {});
  globalShortcut.register("CommandOrControl+Shift+R", () => {});
  globalShortcut.register("CommandOrControl+=", () => {});
  globalShortcut.register("CommandOrControl+-", () => {});
  globalShortcut.register("CommandOrControl+0", () => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
