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
    console.log(`    Package: ${app.debPackage}`);
    console.log(`    Binary:  ${app.paths.bin}`);
    console.log(`    Since:   ${app.installedAt}\n`);
  }
}

/**
 * Uninstalls an app by name using dpkg -r and removes its .deb package.
 */
export async function uninstallApp(appName: string): Promise<void> {
  const app = await unregisterApp(appName);

  if (!app) {
    console.error(`App "${appName}" is not installed.`);
    return;
  }

  console.log(`Uninstalling ${app.name}...`);

  // Remove via dpkg (new .deb model)
  if (app.debPackage) {
    try {
      execSync(`sudo dpkg -r "${app.debPackage}"`, { stdio: 'inherit' });
      console.log(`  Removed package: ${app.debPackage}`);
    } catch {
      console.error(`  Failed to remove package: ${app.debPackage}`);
    }

    // Remove saved .deb file
    const debPath = path.join(getPackagesPath(), `${app.debPackage}.deb`);
    await safeUnlink(debPath, 'Package file');
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
 * Uninstalls all apps (both .deb and legacy AppImage) and cleans up all artifacts.
 */
export async function uninstallAll(): Promise<void> {
  const registry = await readInstalled();
  const apps = Object.values(registry);

  if (apps.length > 0) {
    console.log(`\nUninstalling ${apps.length} registered app(s)...`);
    for (const app of apps) {
      console.log(`\n── ${app.name} ──`);

      // Remove .deb package
      if (app.debPackage) {
        try {
          execSync(`sudo dpkg -r "${app.debPackage}"`, { stdio: 'inherit' });
          console.log(`  Removed package: ${app.debPackage}`);
        } catch {
          console.error(`  Failed to remove package: ${app.debPackage}`);
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

  // Remove any appnix-* deb packages still in dpkg (catches orphans not in registry)
  await cleanOrphanedDebPackages();

  // Clean up legacy AppImage binaries (~/.config/appnix/bin/)
  await cleanLegacyBinDir();

  // Clean up .deb packages (~/.config/appnix/packages/)
  await cleanDir(getPackagesPath(), 'packages');

  // Clean up orphaned desktop entries
  await cleanOrphanedDesktopEntries();

  console.log('\nAll apps uninstalled and artifacts cleaned.');
}

/**
 * Finds and removes any appnix-* packages still installed via dpkg
 * that were not in the registry (orphaned packages).
 */
async function cleanOrphanedDebPackages(): Promise<void> {
  try {
    const output = execSync('dpkg -l | grep "^ii  appnix-"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const packages = output
      .trim()
      .split('\n')
      .map((line) => line.split(/\s+/)[1])
      .filter(Boolean);

    if (packages.length > 0) {
      console.log(`\nRemoving ${packages.length} orphaned deb package(s)...`);
      for (const pkg of packages) {
        try {
          execSync(`sudo dpkg -r "${pkg}"`, { stdio: 'inherit' });
          console.log(`  Removed orphaned package: ${pkg}`);
        } catch {
          console.error(`  Failed to remove: ${pkg}`);
        }
      }
    }
  } catch {
    // No appnix packages found in dpkg
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
