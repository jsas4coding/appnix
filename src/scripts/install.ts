import fs from 'node:fs';
import path from 'node:path';

import { getDesktopEntriesPath, getOptPath } from '@/utils/config';

const DIST_DIR = path.join(process.cwd(), 'dist');

/**
 * Ensures that a directory exists. Creates it recursively if it does not exist.
 *
 * @param dir - The directory path to ensure.
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolves a path depending on the environment. In test mode, redirects paths to the test build directory.
 *
 * @param originalPath - The original absolute path.
 * @returns The resolved path adjusted for the current environment.
 */
function resolvePathForEnv(originalPath: string): string {
  if (process.env.APPNIX_ENV === 'test') {
    return path.join(process.cwd(), 'tests', 'build', path.relative('/', originalPath));
  }
  return originalPath;
}

/**
 * Returns the path used for storing application icons.
 * Uses the same location as the configuration directory.
 *
 * @returns The resolved icons path adjusted for the current environment.
 */
function getIconsPath(): string {
  return resolvePathForEnv(path.join(process.env.HOME || '', '.config', 'appnix', 'icons'));
}

/**
 * Installs AppImages, desktop entries, and icons from the dist directory.
 *
 * - AppImages are copied to the /.local/appnix/{app}/ directory.
 * - Desktop entries are copied to the user's applications directory.
 * - Icons are first read from the configuration icons path and then copied to /.local/appnix alongside each AppImage.
 * - Adjusts permissions for AppImage files to be executable.
 * - Supports test mode by redirecting paths to a safe test build directory.
 */
export function installAll() {
  const optPath = resolvePathForEnv(getOptPath());
  const desktopPath = resolvePathForEnv(getDesktopEntriesPath());
  const iconsConfigPath = getIconsPath();

  console.log('📂 Preparing installation directories...');
  ensureDir(optPath);
  ensureDir(desktopPath);
  ensureDir(iconsConfigPath);

  console.log('📦 Installing AppImages, desktop entries, and icons...');
  const files = fs.readdirSync(DIST_DIR);

  for (const file of files) {
    const filePath = path.join(DIST_DIR, file);

    if (file.endsWith('.AppImage')) {
      const appFolder = file.replace('.AppImage', '');
      const target = path.join(optPath, appFolder, file);
      ensureDir(path.dirname(target));
      fs.copyFileSync(filePath, target);
      fs.chmodSync(target, 0o755);

      // Copy icon for the app if exists in config icons path
      const iconFile = `${appFolder}.png`;
      const iconSource = path.join(iconsConfigPath, iconFile);
      if (fs.existsSync(iconSource)) {
        const iconTarget = path.join(optPath, appFolder, iconFile);
        fs.copyFileSync(iconSource, iconTarget);
        console.log(`  ✔ Installed icon for ${appFolder}: ${iconTarget}`);
      }

      console.log(`  ✔ Installed AppImage: ${target}`);
    }

    if (file.endsWith('.desktop')) {
      const target = path.join(desktopPath, file);
      fs.copyFileSync(filePath, target);
      console.log(`  ✔ Installed desktop entry: ${target}`);
    }

    if (file.endsWith('.png') || file.endsWith('.svg') || file.endsWith('.ico')) {
      const target = path.join(iconsConfigPath, file);
      fs.copyFileSync(filePath, target);
      console.log(`  ✔ Installed icon: ${target}`);
    }
  }

  console.log('🎉 Installation complete.');
}
