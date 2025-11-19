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
  saveGoogleDriveFiles: (files: SimpleGoogleDriveFile[]) => Promise<{ success: boolean }>;
  getIndexedFiles: () => Promise<SimpleGoogleDriveFile[]>;

  // Search
  search: (query: string, limit?: number) => Promise<SearchResults>;
  openLocalPath: (filePath: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<boolean>;
  hideSearchWindow: () => Promise<boolean>;
}

declare global {
  interface Window {
    api: api;
  }
}

export type { SearchResult, SearchResults, api };
