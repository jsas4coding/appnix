import fs from 'node:fs/promises';
import path from 'node:path';

import Handlebars from 'handlebars';

import type { AppConfig } from '../types/config.js';

Handlebars.registerHelper('json', (context) => JSON.stringify(context));
import {
  getBinPath,
  getDesktopEntriesPath,
  getIconsPath,
  getStagingPath,
  getTemplatesPath,
} from './config.js';

/**
 * Renders a Handlebars template with the provided context.
 */
export async function renderTemplate(
  templatePath: string,
  context: Record<string, unknown>,
): Promise<string> {
  try {
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    return template(context);
  } catch (error) {
    console.error(`Error rendering template ${templatePath}:`, error);
    throw new Error(`Failed to render template at ${templatePath}`);
  }
}

/**
 * Generates the Electron application files in the staging directory
 * and the desktop entry pointing to the final bin path.
 */
export async function generateElectronApp(
  app: AppConfig['apps'][0],
  defaults: AppConfig['defaults'],
): Promise<void> {
  if (!app || !defaults) {
    throw new Error('Invalid app or defaults configuration');
  }

  const appContext = {
    ...app,
    electron_version: defaults.electron_version,
    lang: defaults.lang,
    spellcheck: defaults.spellcheck,
    bin_path: path.join(getBinPath(), app.app_name),
    icon_path: path.join(getIconsPath(), `${app.app_name}.png`),
  };

  const stagingDir = path.join(getStagingPath(), app.app_name);
  const desktopDir = getDesktopEntriesPath();

  try {
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.mkdir(desktopDir, { recursive: true });

    const templatesPath = getTemplatesPath();

    const mainTemplateContent = await renderTemplate(
      path.join(templatesPath, 'electron', 'main.hbs'),
      appContext,
    );
    const packageTemplateContent = await renderTemplate(
      path.join(templatesPath, 'electron', 'package.hbs'),
      appContext,
    );
    const desktopEntryContent = await renderTemplate(
      path.join(templatesPath, 'desktop', 'entry.hbs'),
      appContext,
    );

    await fs.writeFile(path.join(stagingDir, 'main.js'), mainTemplateContent, { mode: 0o644 });
    await fs.writeFile(path.join(stagingDir, 'package.json'), packageTemplateContent, {
      mode: 0o644,
    });
    await fs.writeFile(path.join(desktopDir, `${app.app_name}.desktop`), desktopEntryContent, {
      mode: 0o755,
    });

    console.log(`Generated Electron app files for: ${app.name}`);
    console.log(`Staging directory: ${stagingDir}`);
  } catch (error) {
    console.error(`Error generating Electron app for ${app?.name || 'unknown'}:`, error);
    throw new Error(`Failed to generate Electron app for ${app?.name || 'unknown'}`);
  }
}
