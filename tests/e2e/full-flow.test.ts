import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { buildAllApps } from '@/builder/build';
import { generateDesktopEntries } from '@/scripts/desktop-entries';

const FIXTURES_DIR = '/fixtures';
const CONFIG_SRC = path.join(FIXTURES_DIR, 'config.yml');
const ICONS_SRC = path.join(FIXTURES_DIR, 'icons');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'appnix');
const CACHE_DIR = path.join(os.homedir(), '.cache', 'appnix');
const CONFIG_TARGET = path.join(CONFIG_DIR, 'config.yml');
const ICONS_TARGET = path.join(CONFIG_DIR, 'icons');

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
    await buildAllApps();
    await generateDesktopEntries();

    const apps = ['google', 'wikipedia'];
    for (const app of apps) {
      const rpmPackagePath = path.join(CACHE_DIR, 'packages', `appnix-${app}.rpm`);
      const desktopEntryPath = path.join(
        os.homedir(),
        '.local/share/applications',
        `${app}.desktop`,
      );

      const stat = await fs.stat(rpmPackagePath);
      expect(stat.isFile()).toBe(true);

      const desktopContent = await fs.readFile(desktopEntryPath, 'utf8');
      expect(desktopContent).toContain(`Name=${app.charAt(0).toUpperCase() + app.slice(1)}`);
      expect(desktopContent).toContain('Exec=');
    }
  });
});
