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
}
