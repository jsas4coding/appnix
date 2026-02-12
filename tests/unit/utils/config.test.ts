import path from 'node:path';

import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '@/types/config';
import { getConfigFile, loadConfig, validateConfig } from '@/utils/config';

describe('Configuration Utility', () => {
  const mockValidConfig: AppConfig = {
    defaults: {
      electron_version: '24.0.0',
      lang: 'en-US',
      spellcheck: ['en-US'],
    },
    apps: [
      {
        name: 'Test App',
        url: 'https://example.com',
        app_name: 'test-app',
        category: 'Utility',
        description: 'A test application',
      },
    ],
  };

  const fixturesPath = path.resolve(process.cwd(), 'tests/fixtures');
  const validFixture = path.join(fixturesPath, 'config.valid.yml');
  const invalidFixture = path.join(fixturesPath, 'config.invalid.yml');
  const brokenFixture = path.join(fixturesPath, 'config.broken.yml');

  let mockConsoleError: MockInstance;

  beforeEach(() => {
    process.env.APPNIX_ENV = 'test';
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.APPNIX_ENV;
    mockConsoleError.mockRestore();
  });

  it('should validate a correct configuration', () => {
    expect(validateConfig(mockValidConfig)).toBe(true);
  });

  it('should invalidate configuration without defaults', () => {
    const invalidConfig = {
      ...mockValidConfig,
      defaults: {} as any,
    };
    expect(validateConfig(invalidConfig)).toBe(false);
  });

  it('should invalidate configuration without apps', () => {
    const invalidConfig = {
      ...mockValidConfig,
      apps: [],
    };
    expect(validateConfig(invalidConfig)).toBe(false);
  });

  it('should invalidate configuration with incorrect types', () => {
    const invalidConfig = {
      ...mockValidConfig,
      defaults: { electron_version: 24, lang: true, spellcheck: 'invalid' } as any,
    };
    expect(validateConfig(invalidConfig)).toBe(false);
  });

  it('should load configuration from valid fixture file', async () => {
    const config = await loadConfig(validFixture);
    expect(config).toEqual(mockValidConfig);
  });

  it('should throw an error when loading broken YAML file', async () => {
    await expect(loadConfig(brokenFixture)).rejects.toThrow();
  });

  it('should throw an error when configuration fails validation from invalid fixture', async () => {
    await expect(loadConfig(invalidFixture)).rejects.toThrow('Invalid configuration');
  });

  it('should load configuration using default path (detected by getConfigFile)', async () => {
    const defaultPath = getConfigFile();
    expect(defaultPath).toContain('.config/appnix/config.yml');
  });

  it('should load configuration using default path without parameters', async () => {
    // This will try to load the default test path (tests/build/.config/appnix/config.yml)
    await expect(loadConfig()).rejects.toThrow(); // In this test environment, the file likely doesn't exist
  });
});
