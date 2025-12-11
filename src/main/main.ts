import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  screen,
  nativeImage,
  ipcMain,
  IpcMainInvokeEvent,
} from "electron";
import Store from "electron-store";
import { registerGoogleDriveIpc } from "./ipc/googleDriveIpc.js";
import { initializeDatabase } from "./database/db.js";
import { registerSearchIpc } from "./ipc/searchIpc.js";
import { registerFeedbackIpc } from "./ipc/feedbackIpc.js";
import { registerUpdaterIpc, setupAutoUpdater } from "./ipc/updaterIpc.js";
import fs from "fs";

// --- Path and Environment Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine the root path of the project, robust in both dev and packaged modes.
const isDev = !app.isPackaged;
const appRoot = isDev ? path.join(__dirname, '..', '..') : path.join(__dirname, '..');

// Load environment variables
const envPath = isDev 
  ? path.join(appRoot, '.env')
  : path.join(process.resourcesPath, '.env');

dotenv.config({ path: envPath });

// Verify environment variables are loaded
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in .env');
  console.error('Env path:', envPath);
  console.error('App root:', appRoot);
  console.error('Is packaged:', app.isPackaged);
  if (!isDev) {
    console.log('Continuing without Google Drive integration in production...');
  } else {
    process.exit(1);
  }
}

// --- Global Window and Tray Declarations (with Types) ---
let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
let searchWindow: BrowserWindow | null = null;
let onboardingWindow: BrowserWindow | null = null;

// Initialize electron store for persisting app state
const store = new Store();

const RENDERER_PATH_BASE = isDev ? 'http://localhost' : path.join(__dirname, "../renderer/index.html");
const VITE_PORT = 5173; // Standard Vite dev server port

// --- Window Creation Functions ---

const getWindowOptions = (isSearch: boolean) => {
    const baseOptions: Electron.BrowserWindowConstructorOptions = {
        title: "Sentivo",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        skipTaskbar: true, // Hide from dock
    };

    if (isSearch) {
        const winWidth = 700;
        const winHeight = 500;
        return {
            ...baseOptions,
            width: winWidth,
            height: 87,  // Smaller initial height
            minWidth: winWidth,
            minHeight: 87,  // Allow shrinking
            maxWidth: winWidth,
            maxHeight: 800,  // Allow growing
            show: false,
            frame: false,
            transparent: true,
            resizable: true,  // Allow resizing
            alwaysOnTop: true,
            backgroundColor: "#00000000",
            vibrancy: "sidebar",
            visualEffectState: "active"
        };
    } else {
        return {
            ...baseOptions,
            width: 650,
            height: 550,
            minWidth: 650,
            minHeight: 550,
            maxWidth: 650,
            maxHeight: 550,
            resizable: false,
            maximizable: false,
            show: false,
        };
    }
};

const loadWindowContent = (win: BrowserWindow, hash: string) => {
    if (isDev) {
        const tryLoadUrl = (port: number) => {
            const url = `${RENDERER_PATH_BASE}:${port}/#/${hash}`;
            win.loadURL(url).catch(() => {
                if (port < VITE_PORT + 10) { // Check a range of ports
                    tryLoadUrl(port + 1);
                } else {
                    console.error(`Could not connect to dev server on ports ${VITE_PORT}-${VITE_PORT + 10}`);
                }
            });
        };
        tryLoadUrl(VITE_PORT);
        // win.webContents.openDevTools(hash === 'search' ? { mode: "detach" } : {});
    } else {
        // Production path: Load file with hash
        win.loadFile(RENDERER_PATH_BASE, { hash });
    }
};

const createSettingsWindow = () => {
    const win = new BrowserWindow(getWindowOptions(false) as Electron.BrowserWindowConstructorOptions);
    loadWindowContent(win, "settings");
    return win;
};

export const createSearchWindow = () => {
    const win = new BrowserWindow(getWindowOptions(true) as Electron.BrowserWindowConstructorOptions);

    win.on("blur", () => {
        if (!win.webContents.isDevToolsOpened()) {
            win.hide();
        }
    });

    loadWindowContent(win, "search");
    return win;
};

const createOnboardingWindow = () => {
    const win = new BrowserWindow({
        ...getWindowOptions(false),
        title: "Welcome to Sentivo",
        width: 650,
        height: 550,
        minWidth: 650,
        minHeight: 550,
        maxWidth: 650,
        maxHeight: 550,
        resizable: false,
        maximizable: false,
    } as Electron.BrowserWindowConstructorOptions);
    
    loadWindowContent(win, "onboarding");
    return win;
};

// --- Tray Functions (Optimized Icon Path) ---

export function createTray() {
  try {
    const iconBaseName = 'trayIcon.png'; 
  
    const iconPath = isDev
      ? path.join(__dirname, "assets", iconBaseName)
      : path.join(process.resourcesPath, "assets", iconBaseName); 
    
    // IMPORTANT: Check if file exists before creating nativeImage
    if (!fs.existsSync(iconPath)) {
        console.error(`Tray icon not found at: ${iconPath}`);
        return;
    }

    const image = nativeImage.createFromPath(iconPath);
    
    // IMPORTANT: setTemplateImage is crucial for macOS Dark Mode compatibility
    image.setTemplateImage(true); 

    tray = new Tray(image);
    tray.setToolTip("Sentivo");

    const contextMenu = Menu.buildFromTemplate([
      { label: "Open Settings", click: () => toggleSettingsWindow() },
      { label: "Show Onboarding", click: () => toggleOnboardingWindow() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);

  } catch (error) {
    console.error("Failed to create tray:", error);
  }
}

// --- Window Management Functions (Cleanup) ---

function toggleSettingsWindow() {
    // Hide search window if visible
    if (searchWindow && !searchWindow.isDestroyed() && searchWindow.isVisible()) {
        searchWindow.hide();
    }
    
    if (!settingsWindow || settingsWindow.isDestroyed()) {
        settingsWindow = createSettingsWindow();
    }
    
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        if (settingsWindow.isVisible()) {
            settingsWindow.hide();
        } else {
            settingsWindow.show();
            settingsWindow.focus();
        }
    }
}

function toggleSearchWindow() {
    if (searchWindow && !searchWindow.isDestroyed()) {
        if (searchWindow.isVisible()) {
            // Just hide it if visible
            searchWindow.hide();
            return;
        }
        // If window exists but is hidden, destroy and recreate to appear on current Space
        searchWindow.destroy();
        searchWindow = null;
    }
    
    // Create a new window
    searchWindow = createSearchWindow();
    
    if (searchWindow && !searchWindow.isDestroyed()) {
        // Position on current Space
        try {
            const cursorPoint = screen.getCursorScreenPoint();
            const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
            const { width, height } = currentDisplay.workAreaSize;
            const winWidth = 700;
            
            const xPos = Math.round(width / 2 - winWidth / 2);
            const yPos = Math.round(height / 4);
            
            searchWindow.setPosition(xPos, yPos);
            searchWindow.show();
            searchWindow.focus();
        } catch (error) {
            console.log('Error positioning window:', error);
            searchWindow.show();
            searchWindow.focus();
        }
    }
}

function toggleOnboardingWindow() {
    // Hide other windows if visible
    if (searchWindow && !searchWindow.isDestroyed() && searchWindow.isVisible()) {
        searchWindow.hide();
    }
    if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isVisible()) {
        settingsWindow.hide();
    }
    
    if (!onboardingWindow || onboardingWindow.isDestroyed()) {
        onboardingWindow = createOnboardingWindow();
    }
    
    if (onboardingWindow && !onboardingWindow.isDestroyed()) {
        if (onboardingWindow.isVisible()) {
            onboardingWindow.hide();
        } else {
            onboardingWindow.show();
            onboardingWindow.center();
            onboardingWindow.focus();
        }
    }
}

// --- Electron Lifecycle ---

app.whenReady().then(async () => {
  initializeDatabase();
  
  // Initialize auto-updater
  registerUpdaterIpc();
  
  // Only register Google Drive IPC if credentials are available
  if (googleClientId && googleClientSecret) {
    registerGoogleDriveIpc(googleClientId, googleClientSecret);
  } else {
    console.log('Google Drive integration disabled - no credentials available');
  }
  
  registerSearchIpc();
  registerFeedbackIpc();

  // Register settings IPC handler (kept original logic)
  ipcMain.handle("settings:toggle-window", (event: IpcMainInvokeEvent) => {
    try {
      toggleSettingsWindow();
      return { success: true };
    } catch (error) {
      console.error("IPC: Failed to toggle settings window:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to toggle settings window"
      );
    }
  });

  // Register onboarding IPC handlers
  ipcMain.handle("onboarding:is-first-launch", () => {
    return !(store as any).get("onboardingCompleted", false);
  });

  ipcMain.handle("onboarding:set-complete", () => {
    (store as any).set("onboardingCompleted", true);
    return { success: true };
  });

  ipcMain.handle("onboarding:close-and-open-search", (event: IpcMainInvokeEvent) => {
    try {
      // Mark onboarding as complete
      (store as any).set("onboardingCompleted", true);
      
      // Close onboarding window
      if (onboardingWindow && !onboardingWindow.isDestroyed()) {
        onboardingWindow.close();
        onboardingWindow = null;
      }
      
      // Show search window
      toggleSearchWindow();
      
      return { success: true };
    } catch (error) {
      console.error("IPC: Failed to close onboarding and open search:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to close onboarding and open search"
      );
    }
  });

  // Create windows/tray
  createTray();
  searchWindow = createSearchWindow();
  settingsWindow = createSettingsWindow();
  
  // Setup auto-updater with the main window
  setupAutoUpdater(searchWindow);
  
  // Only show onboarding on first launch
  if (!(store as any).get("onboardingCompleted", false)) {
    onboardingWindow = createOnboardingWindow();
    if (onboardingWindow) {
      // No need to register with auto-updater
    }
    onboardingWindow.show();
    onboardingWindow.center();
  }

  // Register ⌘ + Space
  globalShortcut.register('Control+Space', toggleSearchWindow);

  // Clear default shortcuts to prevent conflicts and ensure production cleanliness
  globalShortcut.register("CommandOrControl+R", () => {});
  globalShortcut.register("CommandOrControl+Shift+R", () => {});
  globalShortcut.register("CommandOrControl+=", () => {});
  globalShortcut.register("CommandOrControl+-", () => {});
  globalShortcut.register("CommandOrControl+0", () => {});
  // Optional: Add the same to the search and settings windows explicitly
  // searchWindow.setMenu(null);
  // settingsWindow.setMenu(null);


  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow();
  });
});

app.on("window-all-closed", () => {
  // Quit application on all platforms except macOS
  if (process.platform !== "darwin") app.quit();
});

// Handle window cleanup before quit
app.on("before-quit", () => {
  globalShortcut.unregisterAll(); // Ensure all shortcuts are released
  // The global variables hold references, so explicit removal is optional but clean
});