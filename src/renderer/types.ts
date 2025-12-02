interface SimpleGoogleDriveFile {
  id: string;
  name: string;
  mimeType?: string;
}

interface SearchResult {
  id: string;
  name: string;
  path?: string;
  type: 'file' | 'folder';
  source: 'local' | 'drive';
  score: number;
  metadata?: {
    mimeType?: string;
    modifiedTime?: string;
    thumbnailLink?: string;
    webViewLink?: string;
  };
}

type SearchResults = SearchResult[];

interface api {
  invoke(arg0: string): unknown;
  version: string;

  // Google Drive
  addGoogleDriveAccount: () => Promise<{ success: boolean }>;
  signOutGoogleDrive: () => Promise<{ success: boolean }>;
  getGoogleDriveToken: () => Promise<string | null>;
  listGoogleDriveFiles: () => Promise<any[]>;
  saveGoogleDriveFiles: (files: any[]) => Promise<{ success: boolean }>;
  getIndexedFiles: () => Promise<any[]>;

  // Search
  search: (query: string, limit?: number) => Promise<SearchResults>;
  openLocalPath: (filePath: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
  hideSearchWindow: () => Promise<boolean>;
  // Settings
  toggleSettingsWindow: () => Promise<void>;

  // Onboarding
  closeOnboardingAndOpenSearch: () => Promise<{ success: boolean }>;
  isFirstLaunch: () => Promise<boolean>;
  setOnboardingComplete: () => Promise<{ success: boolean }>;

  // Feedback
  sendFeedback: (data: {
    category: string;
    userEmail: string;
    message: string;
  }) => Promise<{ success: boolean }>;

  // Auto-update
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  getUpdateStatus: () => Promise<{
    isUpdateAvailable: boolean;
    isDownloaded: boolean;
    version: string;
    releaseNotes: string;
    error: Error | null;
  }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
  onDownloadProgress: (callback: (event: any, progress: any) => void) => void;
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
  onError: (callback: (event: any, error: Error) => void) => void;      
}

declare global {
  interface Window {
    api: api;
  }
}

export type { SearchResult, SearchResults, api };
