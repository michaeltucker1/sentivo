export {};

declare global {
  interface Window {
    api: {
      addGoogleDriveAccount: () => Promise<{ success: boolean }>;
      signOutGoogleDrive: () => Promise<{ success: boolean }>;
      getGoogleDriveToken: () => Promise<string | null>;
      listGoogleDriveFiles: () => Promise<any[]>;
      saveGoogleDriveFiles: (files: any[]) => Promise<{ success: boolean }>;
      getIndexedFiles: () => Promise<any[]>;
      version: string;
    };
  }
}
