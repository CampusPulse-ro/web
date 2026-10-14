/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CampusPulse API, set per deploy target (see src/config.ts). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
