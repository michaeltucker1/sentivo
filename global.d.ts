export {};

declare global {
  interface Window {
    api: {
      version: string;
      // Google Drive
      addGoogleDriveAccount: () => Promise<{ success: boolean }>;
      signOutGoogleDrive: () => Promise<{ success: boolean }>;
      getGoogleDriveToken: () => Promise<string | null>;
      listGoogleDriveFiles: () => Promise<any[]>;
      saveGoogleDriveFiles: (files: any[]) => Promise<{ success: boolean }>;
      getIndexedFiles: () => Promise<any[]>;
      // Search
      search: (query: string, limit?: number) => Promise<any[]>;
      openLocalPath: (filePath: string) => Promise<void>;
      openExternalUrl: (url: string) => Promise<void>;
      hideSearchWindow: () => Promise<void>;
      // Settings
      toggleSettingsWindow: () => Promise<void>;
      // Onboarding
      closeOnboardingAndOpenSearch: () => Promise<{ success: boolean }>;
      isFirstLaunch: () => Promise<boolean>;
      setOnboardingComplete: () => Promise<{ success: boolean }>;
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
      
      // Event listeners
      onUpdateAvailable: (callback: (event: any, info: { version: string }) => void) => void;
      onDownloadProgress: (callback: (event: any, progress: any) => void) => void;
      onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
      onError: (callback: (event: any, error: Error) => void) => void;
      // Feedback
      sendFeedback: (data: {
        category: string;
        userEmail: string;
        message: string;
      }) => Promise<{ success: boolean }>;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_FEEDBACK_EMAIL?: string;
    readonly VITE_EMAILJS_SERVICE_ID?: string;
    readonly VITE_EMAILJS_TEMPLATE_ID?: string;
    readonly VITE_EMAILJS_PUBLIC_KEY?: string;
    readonly VITE_AIRTABLE_TOKEN?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
