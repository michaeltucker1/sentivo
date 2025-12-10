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

  ipcMain.handle("search:get-file-icon", async (_, filePath: string, fileType: string, source: string) => {
    try {
      if (!filePath) {
        throw new Error("Invalid file path");
      }

      // For Google Drive files, return null to use custom icons
      if (source === 'drive') {
        return null;
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const tempDir = `/tmp/sentivo-icons-${Date.now()}`;
      await execAsync(`mkdir -p "${tempDir}"`);
      
      let iconPath = null;

      try {
        if (getExtension(filePath) === 'app') {
          // For apps, get the actual app icon
          const appIconPath = await findAppIcon(filePath);
          
          if (appIconPath) {
            // Convert .icns to .png using sips (more reliable than iconutil)
            iconPath = `${tempDir}/app-icon.png`;
            await execAsync(`sips -s format png -z 128 128 "${appIconPath}" --out "${iconPath}"`);
          }
        } else {
          // For regular local files and folders, use macOS system icons
          iconPath = `${tempDir}/system-icon.png`;
          
          if (fileType === 'folder') {
            // For folders, use a generic folder icon
            await execAsync(`sips -s format png -z 128 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/FolderIcon.icns --out "${iconPath}"`);
          } else {
            // For files, try to get the icon from the file itself or use a default
            try {
              await execAsync(`sips -s format png -z 128 128 "${filePath}" --out "${iconPath}"`);
            } catch {
              // Fallback to a generic document icon
              await execAsync(`sips -s format png -z 128 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out "${iconPath}"`);
            }
          }
        }
      } catch (iconError) {
        console.warn('Failed to get specific icon, using fallback:', iconError);
        // Fallback to a generic file icon using sips
        iconPath = `${tempDir}/fallback-icon.png`;
        
        if (fileType === 'folder') {
          await execAsync(`sips -s format png -z 128 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/FolderIcon.icns --out "${iconPath}"`);
        } else {
          await execAsync(`sips -s format png -z 128 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns --out "${iconPath}"`);
        }
      }

      if (!iconPath) {
        // Clean up temp directory
        await execAsync(`rm -rf "${tempDir}"`);
        return null;
      }

      // Convert PNG to base64 data URL
      const { stdout: pngData } = await execAsync(`cat "${iconPath}" | base64`);
      
      // Clean up temp directory
      await execAsync(`rm -rf "${tempDir}"`);
      
      return `data:image/png;base64,${pngData.trim()}`;
    } catch (error) {
      console.error("Failed to get file icon:", error);
      return null;
    }
  });

// Helper function to get file extension
function getExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
};

async function findAppIcon(appPath: string): Promise<string | null> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  // Common icon locations in macOS app bundles
  const possibleIconPaths = [
    `${appPath}/Contents/Resources/AppIcon.icns`,
    `${appPath}/Contents/Resources/app.icns`,
    `${appPath}/Contents/Resources/icon.icns`,
    `${appPath}/Contents/Resources/App.icns`,
  ];

  // Check Info.plist for icon file specification
  try {
    const { stdout: plistPath } = await execAsync(`/usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "${appPath}/Contents/Info.plist" 2>/dev/null || echo ""`);
    const iconName = plistPath.trim();
    
    if (iconName) {
      possibleIconPaths.unshift(`${appPath}/Contents/Resources/${iconName}`);
    }
  } catch {
    // Ignore if we can't read the plist
  }

  // Test each possible path
  for (const iconPath of possibleIconPaths) {
    try {
      await execAsync(`test -f "${iconPath}"`);
      return iconPath;
    } catch {
      continue;
    }
  }

  return null;
}