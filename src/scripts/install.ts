import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { getDesktopEntriesPath, getLegacyBinPath, getPackagesPath } from '@/utils/config.js';
import { readInstalled, unregisterApp, writeInstalled } from '@/utils/installed.js';

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
    console.log(`    Package: ${app.rpmPackage}`);
    console.log(`    Binary:  ${app.paths.bin}`);
    console.log(`    Since:   ${app.installedAt}\n`);
  }
}

/**
 * Uninstalls an app by name using dnf remove and removes its .rpm package.
 */
export async function uninstallApp(appName: string): Promise<void> {
  const app = await unregisterApp(appName);

  if (!app) {
    console.error(`App "${appName}" is not installed.`);
    return;
  }

  console.log(`Uninstalling ${app.name}...`);

  // Remove via dnf
  if (app.rpmPackage) {
    try {
      execSync(`sudo dnf remove -y "${app.rpmPackage}"`, { stdio: 'inherit' });
      console.log(`  Removed package: ${app.rpmPackage}`);
    } catch {
      console.error(`  Failed to remove package: ${app.rpmPackage}`);
    }

    // Remove saved .rpm file
    const rpmPath = path.join(getPackagesPath(), `${app.rpmPackage}.rpm`);
    await safeUnlink(rpmPath, 'Package file');
  }

  // Remove legacy AppImage binary (old model)
  if (app.paths.bin) {
    await safeUnlink(app.paths.bin, 'Binary');
  }

  // Remove desktop entry
  if (app.paths.desktop) {
    await safeUnlink(app.paths.desktop, 'Desktop entry');
  }

  // Remove Electron user data (~/.config/{app_name}/)
  await cleanElectronData(app.app_name);

  // Note: icons in ~/.config/appnix/icons/ are source assets — never delete them

  console.log(`${app.name} uninstalled.`);
}

/**
 * Uninstalls all apps and cleans up all artifacts.
 */
export async function uninstallAll(): Promise<void> {
  const registry = await readInstalled();
  const apps = Object.values(registry);

  if (apps.length > 0) {
    console.log(`\nUninstalling ${apps.length} registered app(s)...`);
    for (const app of apps) {
      console.log(`\n── ${app.name} ──`);

      // Remove .rpm package
      if (app.rpmPackage) {
        try {
          execSync(`sudo dnf remove -y "${app.rpmPackage}"`, { stdio: 'inherit' });
          console.log(`  Removed package: ${app.rpmPackage}`);
        } catch {
          console.error(`  Failed to remove package: ${app.rpmPackage}`);
        }
      }

      // Remove legacy binary
      if (app.paths.bin) {
        await safeUnlink(app.paths.bin, 'Binary');
      }

      // Remove desktop entry
      if (app.paths.desktop) {
        await safeUnlink(app.paths.desktop, 'Desktop entry');
      }

      // Remove Electron user data
      await cleanElectronData(app.app_name);
    }

    // Clear registry
    await writeInstalled({});
  } else {
    console.log('No registered apps found.');
  }

  // Remove any appnix-* rpm packages still installed (catches orphans not in registry)
  await cleanOrphanedRpmPackages();

  // Clean up legacy AppImage binaries (~/.config/appnix/bin/ — kept in config for migration)
  await cleanLegacyBinDir();

  // Clean up .rpm packages (~/.cache/appnix/packages/)
  await cleanDir(getPackagesPath(), 'packages');

  // Clean up orphaned desktop entries
  await cleanOrphanedDesktopEntries();

  console.log('\nAll apps uninstalled and artifacts cleaned.');
}

/**
 * Finds and removes any appnix-* packages still installed via rpm
 * that were not in the registry (orphaned packages).
 */
async function cleanOrphanedRpmPackages(): Promise<void> {
  try {
    const output = execSync('rpm -qa --qf "%{NAME}\\n" "appnix-*"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const packages = output
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((pkg) => pkg.startsWith('appnix-'));

    if (packages.length > 0) {
      console.log(`\nRemoving ${packages.length} orphaned rpm package(s)...`);
      for (const pkg of packages) {
        try {
          execSync(`sudo dnf remove -y "${pkg}"`, { stdio: 'inherit' });
          console.log(`  Removed orphaned package: ${pkg}`);
        } catch {
          console.error(`  Failed to remove: ${pkg}`);
        }
      }
    }
  } catch {
    // No appnix packages found in rpm database
  }
}

/**
 * Removes the legacy bin/ directory left over from the AppImage model.
 */
async function cleanLegacyBinDir(): Promise<void> {
  const legacyBin = getLegacyBinPath();
  try {
    const entries = await fs.readdir(legacyBin);
    if (entries.length > 0) {
      console.log(`\nCleaning legacy AppImage binaries (${entries.length} files)...`);
      for (const entry of entries) {
        const filePath = path.join(legacyBin, entry);
        await fs.unlink(filePath);
        console.log(`  Removed legacy binary: ${filePath}`);
      }
    }
    await fs.rmdir(legacyBin);
    console.log(`  Removed legacy bin directory: ${legacyBin}`);
  } catch {
    // Directory doesn't exist — nothing to clean
  }
}

/**
 * Removes all files in a directory and the directory itself.
 */
async function cleanDir(dirPath: string, label: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`  Cleaned ${label} directory: ${dirPath}`);
  } catch {
    // Directory doesn't exist
  }
}

/**
 * Removes orphaned appnix desktop entries from ~/.local/share/applications/.
 */
async function cleanOrphanedDesktopEntries(): Promise<void> {
  const desktopDir = getDesktopEntriesPath();
  try {
    const entries = await fs.readdir(desktopDir);
    for (const entry of entries) {
      const filePath = path.join(desktopDir, entry);
      if (!entry.endsWith('.desktop')) {
        continue;
      }

      const content = await fs.readFile(filePath, 'utf8');
      if (content.includes('com.appnix.') || content.includes('/appnix/')) {
        await fs.unlink(filePath);
        console.log(`  Removed desktop entry: ${filePath}`);
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

/**
 * Removes Electron user data directory (~/.config/{app_name}/).
 */
async function cleanElectronData(appName: string): Promise<void> {
  const dataDir = path.join(os.homedir(), '.config', appName);
  try {
    await fs.rm(dataDir, { recursive: true, force: true });
    console.log(`  Removed Electron data: ${dataDir}`);
  } catch {
    // Directory doesn't exist
  }
}

async function safeUnlink(filePath: string, label: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`  Removed ${label.toLowerCase()}: ${filePath}`);
  } catch {
    // File doesn't exist
  }
}
