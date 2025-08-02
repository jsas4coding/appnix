import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig, validateConfig } from '@/utils/config';
import { renderTemplate } from '@/utils/template';

/**
 * Generates and installs desktop entries for all configured applications.
 *
 * - Loads and validates the AppNix configuration.
 * - Ensures the desktop entry directory exists.
 * - Renders `.desktop` files using Handlebars templates.
 * - Saves the generated files to the system or test environment path.
 */
export async function generateDesktopEntries(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!validateConfig(config)) {
      throw new Error('Invalid configuration');
    }

    const desktopEntryDir = path.resolve(process.env.HOME || '', '.local', 'share', 'applications');

    await fs.mkdir(desktopEntryDir, { recursive: true });

    for (const app of config.apps) {
      const desktopEntryContent = await renderTemplate(
        path.join(process.cwd(), 'src', 'templates', 'desktop', 'entry.hbs'),
        app,
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

if (import.meta.url === `file://${process.argv[1]}`) {
  generateDesktopEntries().catch(console.error);
}
