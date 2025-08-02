import fs from 'node:fs/promises';
import path from 'node:path';

import Handlebars from 'handlebars';

import type { AppConfig } from '../types/config.js';
import { getAppsPath, getDesktopEntriesPath, getOptPath } from './config.js';

/**
 * Renders a Handlebars template with the provided context.
 */
export async function renderTemplate(
  templatePath: string,
  context: Record<string, any>,
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
 * Generates the Electron application files based on templates and configuration.
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
    window: app.window || { width: 1280, height: 800, fullscreen: false },
  };

  const buildDir = path.join(getAppsPath(), app.app_name);
  const optDir = getOptPath();
  const desktopDir = getDesktopEntriesPath();

  try {
    // Ensure directories exist
    await fs.mkdir(buildDir, { recursive: true });
    await fs.mkdir(optDir, { recursive: true });
    await fs.mkdir(desktopDir, { recursive: true });

    // Render templates
    const mainTemplateContent = await renderTemplate(
      path.join(process.cwd(), 'src', 'templates', 'electron', 'main.hbs'),
      appContext,
    );
    const packageTemplateContent = await renderTemplate(
      path.join(process.cwd(), 'src', 'templates', 'electron', 'package.hbs'),
      appContext,
    );
    const desktopEntryContent = await renderTemplate(
      path.join(process.cwd(), 'src', 'templates', 'desktop', 'entry.hbs'),
      appContext,
    );

    // Write generated files
    await fs.writeFile(path.join(buildDir, 'main.js'), mainTemplateContent, { mode: 0o644 });
    await fs.writeFile(path.join(buildDir, 'package.json'), packageTemplateContent, {
      mode: 0o644,
    });
    await fs.writeFile(path.join(desktopDir, `${app.app_name}.desktop`), desktopEntryContent, {
      mode: 0o644,
    });

    // TODO: Copy icon and AppImage to /.local/appnix (requires elevation in production)
    console.log('Generated Electron app files for:', app.name);
    console.log(`Build directory: ${buildDir}`);
  } catch (error) {
    console.error(`Error generating Electron app for ${app?.name || 'unknown'}:`, error);
    throw new Error(`Failed to generate Electron app for ${app?.name || 'unknown'}`);
  }
}
