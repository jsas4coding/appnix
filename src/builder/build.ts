import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { Configuration } from 'electron-builder';
import { build } from 'electron-builder';

import { getAppsPath, loadConfig, validateConfig } from '@/utils/config';
import { generateElectronApp } from '@/utils/template';

/**
 * Builds AppImage files for all configured apps.
 */
export async function buildAppImages() {
  try {
    const config = await loadConfig();
    if (!validateConfig(config)) {
      throw new Error('Invalid configuration');
    }

    const buildDir = path.join(process.cwd(), 'dist', 'apps');
    await fs.mkdir(buildDir, { recursive: true });

    for (const app of config.apps) {
      // Generate Electron app files in the appropriate build path
      await generateElectronApp(app, config.defaults);

      const electronAppDir = path.join(getAppsPath(), app.app_name);

      // Electron Builder configuration
      const buildConfig: Configuration = {
        appId: `com.appnix.${app.app_name}`,
        productName: app.name,
        directories: {
          output: path.join(buildDir, app.app_name),
          app: electronAppDir,
        },
        linux: {
          target: ['AppImage'],
          category: app.category,
          icon: app.icon,
        },
        files: ['**/*', '!**/*.ts', '!tsconfig.json', '!package-lock.json'],
      };

      // Build AppImage
      await build({
        config: buildConfig,
        linux: ['AppImage'],
      });

      console.log(`Built AppImage for ${app.name}`);
    }

    console.log('All AppImages built successfully');
  } catch (error) {
    console.error('Error building AppImages:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAppImages().catch(console.error);
}
