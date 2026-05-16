/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Type declarations for Vite environment variables
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
