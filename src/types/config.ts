export interface AppConfig {
  defaults: {
    electron_version: string;
    lang: string;
    spellcheck: string[];
  };
  apps: Array<{
    name: string;
    url: string;
    icon?: string;
    app_name: string;
    category: string;
    description: string;
  }>;
}
