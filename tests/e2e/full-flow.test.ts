import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { buildAppImages } from '@/builder/build';
import { generateDesktopEntries } from '@/scripts/desktop-entries';
import { installAll } from '@/scripts/install';

const FIXTURES_DIR = '/fixtures';
const CONFIG_SRC = path.join(FIXTURES_DIR, 'config.yml');
const ICONS_SRC = path.join(FIXTURES_DIR, 'icons');
const CONFIG_TARGET_DIR = path.join(os.homedir(), '.config', 'appnix');
const CONFIG_TARGET = path.join(CONFIG_TARGET_DIR, 'config.yml');
const ICONS_TARGET = path.join(CONFIG_TARGET_DIR, 'icons');

describe('AppNix E2E – Full Flow', () => {
  beforeAll(async () => {
    await fs.mkdir(ICONS_TARGET, { recursive: true });
    await fs.copyFile(CONFIG_SRC, CONFIG_TARGET);
    const icons = await fs.readdir(ICONS_SRC);

    for (const icon of icons) {
      await fs.copyFile(path.join(ICONS_SRC, icon), path.join(ICONS_TARGET, icon));
    }
  });

  it('should build, install and generate desktop entries for Google and Wikipedia', async () => {
    await buildAppImages();

    installAll();

    await generateDesktopEntries();

    const apps = ['google', 'wikipedia'];
    for (const app of apps) {
      const appImagePath = path.join('/.local/appnix', app, `${app}.AppImage`);
      const desktopEntryPath = path.join(
        os.homedir(),
        '.local/share/applications',
        `${app}.desktop`,
      );

      const stat = await fs.stat(appImagePath);
      expect(stat.mode & 0o777).toBe(0o755);

      const desktopContent = await fs.readFile(desktopEntryPath, 'utf8');
      expect(desktopContent).toContain(`Name=${app.charAt(0).toUpperCase() + app.slice(1)}`);
      expect(desktopContent).toContain('Exec=');
    }
  });
});
