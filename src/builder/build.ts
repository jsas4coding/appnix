import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Configuration } from 'electron-builder';
import { build } from 'electron-builder';

import {
  getBinPath,
  getDesktopEntriesPath,
  getIconsPath,
  getStagingPath,
  loadConfig,
  validateConfig,
} from '@/utils/config.js';
import { registerApp } from '@/utils/installed.js';
import { generateElectronApp } from '@/utils/template.js';
import { CACHE_DIR, ensureAppImageRuntime } from './setup.js';

/**
 * Builds AppImage files for all configured apps.
 *
 * For each app:
 * 1. Generate Electron files in staging (~/.config/appnix/.build/{app_name})
 * 2. Install dependencies in staging
 * 3. Build AppImage via electron-builder (output to staging)
 * 4. Move final AppImage to ~/.config/appnix/bin/{app_name}
 * 5. Register in installed.json
 * 6. Clean up staging
 */
export async function buildAppImages() {
  try {
    await ensureAppImageRuntime();

    const config = await loadConfig();
    if (!validateConfig(config)) {
      throw new Error('Invalid configuration');
    }

    const stagingPath = getStagingPath();
    const binPath = getBinPath();
    const iconsPath = getIconsPath();
    const desktopPath = getDesktopEntriesPath();

    await fs.mkdir(binPath, { recursive: true });
    await fs.mkdir(iconsPath, { recursive: true });

    for (const app of config.apps) {
      console.log(`\n── Building ${app.name} ──`);

      // 1. Generate Electron app files in staging
      await generateElectronApp(app, config.defaults);

      const appStagingDir = path.join(stagingPath, app.app_name);
      const buildOutputDir = path.join(stagingPath, `${app.app_name}-out`);

      // 2. Install dependencies in the staging directory
      console.log(`Installing dependencies...`);
      execSync('npm install --ignore-scripts', { cwd: appStagingDir, stdio: 'inherit' });

      // 3. Build AppImage via electron-builder
      const buildConfig: Configuration = {
        appId: `com.appnix.${app.app_name}`,
        productName: app.name,
        electronVersion: config.defaults.electron_version,
        directories: {
          output: buildOutputDir,
          app: appStagingDir,
        },
        linux: {
          target: ['AppImage'],
          category: app.category,
          icon: app.icon,
        },
        files: ['**/*', '!**/*.ts', '!tsconfig.json', '!package-lock.json'],
      };

      await build({
        config: buildConfig,
        linux: ['AppImage'],
      });

      // 4. Find and move AppImage to bin/
      const appImageFile = await findAppImage(buildOutputDir);
      if (!appImageFile) {
        throw new Error(`AppImage not found in build output for ${app.name}`);
      }

      const finalBinPath = path.join(binPath, app.app_name);
      await fs.copyFile(appImageFile, finalBinPath);
      await fs.chmod(finalBinPath, 0o755);
      console.log(`Installed: ${finalBinPath}`);

      // 5. Register in installed.json
      const desktopEntryPath = path.join(desktopPath, `${app.app_name}.desktop`);
      const iconPath = path.join(iconsPath, `${app.app_name}.png`);
      const hasIcon = await fileExists(iconPath);

      await registerApp({
        name: app.name,
        app_name: app.app_name,
        url: app.url,
        category: app.category || '',
        description: app.description || '',
        paths: {
          bin: finalBinPath,
          desktop: desktopEntryPath,
          icon: hasIcon ? iconPath : null,
        },
        installedAt: new Date().toISOString(),
      });

      // 6. Clean up staging for this app
      await fs.rm(appStagingDir, { recursive: true, force: true });
      await fs.rm(buildOutputDir, { recursive: true, force: true });
      console.log(`Cleaned staging for ${app.name}`);
    }

    // Final cleanup: remove .build directory and runtime cache
    await fs.rm(stagingPath, { recursive: true, force: true });
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    console.log('\nAll apps built and installed successfully.');
  } catch (error) {
    // Clean up staging on failure
    await fs.rm(getStagingPath(), { recursive: true, force: true }).catch(() => {});
    console.error('Error building AppImages:', error);
    throw error;
  }
}

/**
 * Finds the first .AppImage file in a directory (recursively).
 */
async function findAppImage(dir: string): Promise<string | null> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.AppImage')) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const found = await findAppImage(fullPath);
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
