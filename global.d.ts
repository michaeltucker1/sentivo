export {};

declare global {
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

  interface Window {
    api: {
      version: string;
      addGoogleDriveAccount: () => Promise<any>;
      signOutGoogleDrive: () => Promise<any>;
      getGoogleDriveToken: () => Promise<string>;
      listGoogleDriveFiles: () => Promise<any>;
      saveGoogleDriveFiles: (files: any[]) => Promise<any>;
      getIndexedFiles: () => Promise<any>;
      search: (query: string, limit?: number) => Promise<any>;
      openLocalPath: (filePath: string) => Promise<boolean>;
      openExternalUrl: (url: string) => Promise<boolean>;
      hideSearchWindow: () => Promise<boolean>;
      toggleSettingsWindow: () => Promise<any>;
      resizeSearchWindow: (height: number) => Promise<boolean>;
      getFileIcon: (filePath: string, fileType: string, source: string) => Promise<string>;
      closeOnboardingAndOpenSearch: () => Promise<any>;
      isFirstLaunch: () => Promise<boolean>;
      setOnboardingComplete: () => Promise<any>;
      installUpdate: () => Promise<any>;
      onUpdateAvailable: (callback: (event: any, version: string) => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onUpdateError: (callback: (event: any, error: string) => void) => void;
      sendFeedback: (data: {
        category: string;
        userEmail: string;
        message: string;
      }) => Promise<any>;
    };
  }
}
