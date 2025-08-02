/**
 * Interfaces for AppNix configuration
 */
export interface WindowConfig {
  fullscreen?: boolean;
  width?: number;
  height?: number;
}

export interface AppConfig {
  name: string; // Display name
  url: string; // URL to open in Electron
  icon: string; // Path to icon
  app_name: string; // Internal name (used for folders/files)
  category?: string; // Desktop category (e.g., Utility;AI)
  description?: string; // Short description
  window?: WindowConfig; // Window options
}

export interface GlobalConfig {
  defaults: {
    electron_version: string;
    lang: string;
    spellcheck: string[];
  };
  apps: AppConfig[];
}
