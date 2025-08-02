import fs from 'node:fs';

import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installAll } from '@/scripts/install';
import * as configUtils from '@/utils/config';

describe('AppNix Installer', () => {
  const mockFiles = ['test-app.AppImage', 'test-app.desktop', 'icon.png'];

  let mockConsoleLog: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(configUtils, 'getOptPath').mockReturnValue('/mock/.local/appnix');
    vi.spyOn(configUtils, 'getDesktopEntriesPath').mockReturnValue('/mock/desktop');
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(mockFiles);
    vi.spyOn(fs, 'copyFileSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  it('should prepare directories and install AppImages, desktop entries, and icons', () => {
    installAll();

    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/.local/appnix', { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/desktop', { recursive: true });
    expect(fs.copyFileSync).toHaveBeenCalled();
    expect(fs.chmodSync).toHaveBeenCalledWith(
      expect.stringContaining('/mock/.local/appnix/test-app/test-app.AppImage'),
      0o755,
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Installed AppImage'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Installed desktop entry'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Installed icon'));
    expect(mockConsoleLog).toHaveBeenCalledWith('🎉 Installation complete.');
  });

  it('should skip copying icon into /opt if specific icon does not exist', () => {
    // Mock existsSync: return false only for the app-specific icon in config path
    vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (typeof p === 'string' && p.includes('/.config/appnix/icons/test-app.png')) {
        return false;
      }
      return true;
    });
    installAll();

    // Validate that .desktop entry was still copied, but no icon copy for AppImage folder
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/workspace/dev/odr/cli/appnix/dist/test-app.desktop'),
      expect.stringContaining('/mock/desktop/test-app.desktop'),
    );
    expect(fs.copyFileSync).not.toHaveBeenCalledWith(
      expect.stringContaining('/.config/appnix/icons/test-app.png'),
      expect.stringContaining('/mock/.local/appnix/test-app/test-app.png'),
    );
  });

  it('should not call mkdirSync if directories already exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    installAll();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});
