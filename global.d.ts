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
