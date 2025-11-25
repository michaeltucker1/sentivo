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
}

declare global {
  interface Window {
    api: api;
  }
}

export type { SearchResult, SearchResults, api };
