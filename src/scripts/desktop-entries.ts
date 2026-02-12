import fs from 'node:fs/promises';
import path from 'node:path';

import {
  getBinPath,
  getDesktopEntriesPath,
  getIconsPath,
  getTemplatesPath,
  loadConfig,
  validateConfig,
} from '@/utils/config.js';
import { renderTemplate } from '@/utils/template.js';

/**
 * Generates and installs desktop entries for all configured applications.
 *
 * Renders .desktop files using Handlebars templates with full bin/icon paths.
 */
export async function generateDesktopEntries(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!validateConfig(config)) {
      throw new Error('Invalid configuration');
    }

    const desktopEntryDir = getDesktopEntriesPath();
    await fs.mkdir(desktopEntryDir, { recursive: true });

    for (const app of config.apps) {
      const context = {
        ...app,
        bin_path: path.join(getBinPath(), app.app_name),
        icon_path: path.join(getIconsPath(), `${app.app_name}.png`),
      };

      const desktopEntryContent = await renderTemplate(
        path.join(getTemplatesPath(), 'desktop', 'entry.hbs'),
        context,
      );

      const desktopEntryPath = path.join(desktopEntryDir, `${app.app_name}.desktop`);
      await fs.writeFile(desktopEntryPath, desktopEntryContent, { mode: 0o755 });

      console.log(`Generated desktop entry for ${app.name}`);
    }

    console.log('Desktop integration completed');
  } catch (error) {
    console.error('Error generating desktop entries:', error);
    throw error;
  }
}
