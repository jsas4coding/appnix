import fs from 'node:fs/promises';

import { build } from 'electron-builder';
import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAllApps } from '@/builder/build';
import * as setupUtils from '@/builder/setup';
import * as configUtils from '@/utils/config';
import * as installedUtils from '@/utils/installed';
import * as templateUtils from '@/utils/template';

vi.mock('electron-builder', () => ({
  build: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('Deb Build Process', () => {
  const mockConfig = {
    defaults: {
      electron_version: '24.0.0',
      lang: 'en-US',
      spellcheck: ['en-US'],
      maintainer: 'Test User <test@example.com>',
    },
    apps: [
      {
        name: 'Test App',
        url: 'https://example.com',
        app_name: 'test-app',
        category: 'Utility',
        description: 'A test application',
        icon: 'test-icon',
      },
    ],
  };

  let mockConsoleError: MockInstance;
  let mockConsoleLog: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(setupUtils, 'ensureDebDependencies').mockResolvedValue(undefined);
    vi.spyOn(configUtils, 'loadConfig').mockResolvedValue(mockConfig as any);
    vi.spyOn(configUtils, 'validateConfig').mockReturnValue(true);
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);
    vi.spyOn(fs, 'rm').mockResolvedValue(undefined as any);
    vi.spyOn(fs, 'copyFile').mockResolvedValue(undefined as any);
    vi.spyOn(fs, 'access').mockRejectedValue(new Error('not found'));
    vi.spyOn(fs, 'readdir').mockResolvedValue([
      { name: 'test-app.deb', isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.spyOn(templateUtils, 'generateElectronApp').mockResolvedValue(undefined as any);
    vi.spyOn(installedUtils, 'registerApp').mockResolvedValue(undefined as any);
    (build as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it('should build .deb packages for all configured apps', async () => {
    await buildAllApps();

    expect(setupUtils.ensureDebDependencies).toHaveBeenCalled();
    expect(configUtils.loadConfig).toHaveBeenCalled();
    expect(configUtils.validateConfig).toHaveBeenCalledWith(mockConfig);
    expect(templateUtils.generateElectronApp).toHaveBeenCalledWith(
      mockConfig.apps[0],
      mockConfig.defaults,
    );
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          appId: 'com.appnix.test-app',
          productName: 'Test App',
          deb: { packageName: 'appnix-test-app', maintainer: 'Test User <test@example.com>' },
        }),
        linux: ['deb'],
      }),
    );
  });

  it('should build .deb packages for multiple apps', async () => {
    const multiConfig = {
      ...mockConfig,
      apps: [
        mockConfig.apps[0],
        {
          name: 'Another App',
          url: 'https://another.com',
          app_name: 'another-app',
          category: 'Utility',
          description: 'Another test application',
          icon: 'another-icon',
        },
      ],
    };
    vi.spyOn(configUtils, 'loadConfig').mockResolvedValue(multiConfig as any);

    await buildAllApps();

    expect(templateUtils.generateElectronApp).toHaveBeenCalledTimes(2);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('should throw error for invalid configuration', async () => {
    vi.spyOn(configUtils, 'validateConfig').mockReturnValue(false);
    await expect(buildAllApps()).rejects.toThrow('Invalid configuration');
  });

  it('should handle errors during build process', async () => {
    (build as any).mockRejectedValue(new Error('Build failed'));
    await expect(buildAllApps()).rejects.toThrow('Build failed');
  });
});
