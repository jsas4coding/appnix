import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Configuration } from 'electron-builder';
import { build } from 'electron-builder';

import type { AppConfig } from '@/types/config.js';
import {
  getDesktopEntriesPath,
  getIconsPath,
  getPackagesPath,
  getStagingPath,
  loadConfig,
  validateConfig,
} from '@/utils/config.js';
import { registerApp } from '@/utils/installed.js';
import { generateElectronApp } from '@/utils/template.js';
import { ensureRpmDependencies } from './setup.js';

/**
 * Builds and installs a single app as a .rpm package.
 *
 * 1. Generate Electron files in staging (~/.cache/appnix/build/{app_name})
 * 2. Install dependencies in staging
 * 3. Build .rpm via electron-builder (output to staging)
 * 4. Install .rpm via dnf install
 * 5. Copy .rpm to ~/.cache/appnix/packages/ for reference
 * 6. Register in installed.json
 * 7. Clean up staging for this app
 */
export async function buildSingleApp(
  app: AppConfig['apps'][0],
  defaults: AppConfig['defaults'],
): Promise<void> {
  const stagingPath = getStagingPath();
  const packagesPath = getPackagesPath();
  const iconsPath = getIconsPath();
  const desktopPath = getDesktopEntriesPath();

  await fs.mkdir(packagesPath, { recursive: true });
  await fs.mkdir(iconsPath, { recursive: true });

  const rpmPackageName = `appnix-${app.app_name}`;

  console.log(`\n── Building ${app.name} ──`);

  // 1. Generate Electron app files in staging
  await generateElectronApp(app, defaults);

  const appStagingDir = path.join(stagingPath, app.app_name);
  const buildOutputDir = path.join(stagingPath, `${app.app_name}-out`);

  // 2. Install dependencies in the staging directory
  console.log(`Installing dependencies...`);
  execSync('npm install --ignore-scripts', { cwd: appStagingDir, stdio: 'inherit' });

  // 3. Build .rpm via electron-builder
  const buildConfig: Configuration = {
    appId: `com.appnix.${app.app_name}`,
    productName: app.name,
    electronVersion: defaults.electron_version,
    directories: {
      output: buildOutputDir,
      app: appStagingDir,
    },
    linux: {
      target: ['rpm'],
      category: app.category,
      icon: path.join(getIconsPath(), `${app.icon}.png`),
      packageCategory: app.category,
    },
    rpm: {
      packageName: rpmPackageName,
      maintainer: defaults.maintainer,
    },
    files: ['**/*', '!**/*.ts', '!tsconfig.json', '!package-lock.json'],
  };

  await build({
    config: buildConfig,
    linux: ['rpm'],
  });

  // 4. Find and install .rpm
  const rpmFile = await findRpmPackage(buildOutputDir);
  if (!rpmFile) {
    throw new Error(`.rpm package not found in build output for ${app.name}`);
  }

  console.log(`Installing ${app.name} via dnf...`);
  execSync(`sudo dnf install -y "${rpmFile}"`, { stdio: 'inherit' });

  // 5. Copy .rpm to packages/ for reference
  const savedRpmPath = path.join(packagesPath, `${rpmPackageName}.rpm`);
  await fs.copyFile(rpmFile, savedRpmPath);

  // 6. Register in installed.json
  const binPath = `/opt/${app.name}/${app.app_name}`;
  const desktopEntryPath = path.join(desktopPath, `${app.app_name}.desktop`);
  const iconPath = path.join(iconsPath, `${app.icon || app.app_name}.png`);
  const hasIcon = await fileExists(iconPath);

  await registerApp({
    name: app.name,
    app_name: app.app_name,
    url: app.url,
    category: app.category || '',
    description: app.description || '',
    rpmPackage: rpmPackageName,
    paths: {
      bin: binPath,
      desktop: desktopEntryPath,
      icon: hasIcon ? iconPath : null,
    },
    installedAt: new Date().toISOString(),
  });

  // 7. Clean up staging for this app
  await fs.rm(appStagingDir, { recursive: true, force: true });
  await fs.rm(buildOutputDir, { recursive: true, force: true });
  console.log(`Cleaned staging for ${app.name}`);
}

/**
 * Builds .rpm packages for all configured apps.
 */
export async function buildAllApps() {
  try {
    await ensureRpmDependencies();

    const config = await loadConfig();
    if (!validateConfig(config)) {
      throw new Error('Invalid configuration');
    }

    for (const app of config.apps) {
      await buildSingleApp(app, config.defaults);
    }

    // Final cleanup: remove staging directory
    await fs.rm(getStagingPath(), { recursive: true, force: true });
    console.log('\nAll apps built and installed successfully.');
  } catch (error) {
    // Clean up staging on failure
    await fs.rm(getStagingPath(), { recursive: true, force: true }).catch(() => {});
    console.error('Error building apps:', error);
    throw error;
  }
}

/**
 * Builds and installs a single app by name from the config.
 */
export async function buildAppByName(appName: string): Promise<void> {
  const config = await loadConfig();
  if (!validateConfig(config)) {
    throw new Error('Invalid configuration');
  }

  const app = config.apps.find((a) => a.app_name.toLowerCase() === appName.toLowerCase());

  if (!app) {
    throw new Error(
      `App "${appName}" not found in config. Available: ${config.apps.map((a) => a.app_name).join(', ')}`,
    );
  }

  try {
    await ensureRpmDependencies();
    await buildSingleApp(app, config.defaults);

    // Cleanup staging
    await fs.rm(getStagingPath(), { recursive: true, force: true });
    console.log(`\n${app.name} built and installed successfully.`);
  } catch (error) {
    await fs.rm(getStagingPath(), { recursive: true, force: true }).catch(() => {});
    console.error(`Error building ${app.name}:`, error);
    throw error;
  }
}

/**
 * Finds the first .rpm file in a directory (recursively).
 */
async function findRpmPackage(dir: string): Promise<string | null> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.rpm')) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = await findRpmPackage(fullPath);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
