import fs from 'node:fs/promises';

import { readInstalled, unregisterApp } from '@/utils/installed.js';

/**
 * Lists all installed AppNix applications.
 */
export async function listInstalled(): Promise<void> {
  const registry = await readInstalled();
  const apps = Object.values(registry);

  if (apps.length === 0) {
    console.log('No apps installed.');
    return;
  }

  console.log(`\nInstalled apps (${apps.length}):\n`);
  for (const app of apps) {
    console.log(`  ${app.name} (${app.app_name})`);
    console.log(`    URL:     ${app.url}`);
    console.log(`    Binary:  ${app.paths.bin}`);
    console.log(`    Desktop: ${app.paths.desktop}`);
    console.log(`    Since:   ${app.installedAt}\n`);
  }
}

/**
 * Uninstalls an app by name, removing its binary, desktop entry, and icon.
 */
export async function uninstallApp(appName: string): Promise<void> {
  const app = await unregisterApp(appName);

  if (!app) {
    console.error(`App "${appName}" is not installed.`);
    return;
  }

  console.log(`Uninstalling ${app.name}...`);

  const removals = [
    { label: 'Binary', path: app.paths.bin },
    { label: 'Desktop entry', path: app.paths.desktop },
    { label: 'Icon', path: app.paths.icon },
  ];

  for (const { label, path: filePath } of removals) {
    if (!filePath) {
      continue;
    }
    try {
      await fs.unlink(filePath);
      console.log(`  Removed ${label}: ${filePath}`);
    } catch {
      console.log(`  ${label} not found: ${filePath}`);
    }
  }

  console.log(`${app.name} uninstalled.`);
}
