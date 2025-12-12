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
  getSystemIcon: (filePath: string) => Promise<string>;
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
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  onUpdateAvailable: (callback: (event: any, version: string) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateError: (callback: (event: any, error: string) => void) => void;
}

declare global {
  interface Window {
    api: api;
  }
}

export type { SearchResult, SearchResults, api };
