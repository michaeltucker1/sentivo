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

  interface ImportMetaEnv {
    readonly VITE_FEEDBACK_EMAIL?: string;
    readonly VITE_EMAILJS_SERVICE_ID?: string;
    readonly VITE_EMAILJS_TEMPLATE_ID?: string;
    readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
