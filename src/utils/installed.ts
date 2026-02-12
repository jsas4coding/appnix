import fs from 'node:fs/promises';

import { getInstalledPath } from './config.js';

export interface InstalledApp {
  name: string;
  app_name: string;
  url: string;
  category: string;
  description: string;
  paths: {
    bin: string;
    desktop: string;
    icon: string | null;
  };
  installedAt: string;
}

export interface InstalledRegistry {
  [appName: string]: InstalledApp;
}

/**
 * Reads the installed apps registry from installed.json.
 * Returns an empty registry if the file doesn't exist.
 */
export async function readInstalled(): Promise<InstalledRegistry> {
  try {
    const content = await fs.readFile(getInstalledPath(), 'utf8');
    return JSON.parse(content) as InstalledRegistry;
  } catch {
    return {};
  }
}

/**
 * Writes the installed apps registry to installed.json.
 */
export async function writeInstalled(registry: InstalledRegistry): Promise<void> {
  await fs.writeFile(getInstalledPath(), JSON.stringify(registry, null, 2), { mode: 0o644 });
}

/**
 * Registers an app as installed in the registry.
 */
export async function registerApp(app: InstalledApp): Promise<void> {
  const registry = await readInstalled();
  registry[app.app_name] = app;
  await writeInstalled(registry);
}

/**
 * Removes an app from the installed registry.
 * Returns the app entry if found, null otherwise.
 */
export async function unregisterApp(appName: string): Promise<InstalledApp | null> {
  const registry = await readInstalled();
  const app = registry[appName] || null;
  if (app) {
    delete registry[appName];
    await writeInstalled(registry);
  }
  return app;
}
