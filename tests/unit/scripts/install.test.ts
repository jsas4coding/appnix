import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listInstalled, uninstallApp } from '@/scripts/install';
import * as installedUtils from '@/utils/installed';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AppNix Install/Uninstall', () => {
  let mockConsoleLog: MockInstance;
  let mockConsoleError: MockInstance;

  const mockRegistry = {
    'test-app': {
      name: 'Test App',
      app_name: 'test-app',
      url: 'https://example.com',
      category: 'Utility',
      description: 'A test application',
      debPackage: 'appnix-test-app',
      paths: {
        bin: '/opt/Test App/test-app',
        desktop: '/home/user/.local/share/applications/test-app.desktop',
        icon: '/home/user/.config/appnix/icons/test-app.png',
      },
      installedAt: '2026-01-01T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('listInstalled', () => {
    it('should list installed apps with deb package info', async () => {
      vi.spyOn(installedUtils, 'readInstalled').mockResolvedValue(mockRegistry);
      await listInstalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Test App'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('appnix-test-app'));
    });

    it('should handle empty registry', async () => {
      vi.spyOn(installedUtils, 'readInstalled').mockResolvedValue({});
      await listInstalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('No apps installed.');
    });
  });

  describe('uninstallApp', () => {
    it('should uninstall app via dpkg -r', async () => {
      vi.spyOn(installedUtils, 'unregisterApp').mockResolvedValue(mockRegistry['test-app']);
      const { execSync } = await import('node:child_process');
      await uninstallApp('test-app');
      expect(execSync).toHaveBeenCalledWith('sudo dpkg -r "appnix-test-app"', {
        stdio: 'inherit',
      });
      expect(mockConsoleLog).toHaveBeenCalledWith('Test App uninstalled.');
    });

    it('should handle app not found', async () => {
      vi.spyOn(installedUtils, 'unregisterApp').mockResolvedValue(null);
      await uninstallApp('nonexistent');
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('"nonexistent" is not installed'),
      );
    });
  });
});
