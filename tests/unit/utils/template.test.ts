import fs from 'node:fs/promises';
import path from 'node:path';

import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '@/types/config';
import { getAppsPath, getDesktopEntriesPath } from '@/utils/config';
import { generateElectronApp, renderTemplate } from '@/utils/template';

describe('Template Utility', () => {
  const mockApp: AppConfig['apps'][0] = {
    name: 'Test App',
    url: 'https://example.com',
    app_name: 'test-app',
    category: 'Utility',
    description: 'A test application',
    icon: '/path/to/icon.png',
    window: { width: 1024, height: 768 },
  };

  const mockDefaults: AppConfig['defaults'] = {
    electron_version: '24.0.0',
    lang: 'en-US',
    spellcheck: ['en-US'],
  };

  let mockConsoleError: MockInstance;

  beforeEach(() => {
    process.env.APPNIX_ENV = 'test';
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.APPNIX_ENV;
    mockConsoleError.mockRestore();
  });

  it('should render a simple template', async () => {
    const mockReadFile = vi.spyOn(fs, 'readFile').mockResolvedValue('Hello {{name}}!');
    const result = await renderTemplate('/mock/template/path', { name: 'World' });
    expect(result).toBe('Hello World!');
    expect(mockReadFile).toHaveBeenCalledWith('/mock/template/path', 'utf8');
  });

  it('should render template with conditionals and loops', async () => {
    const template = '{{#if name}}Name: {{name}}{{/if}} {{#each items}}Item: {{this}} {{/each}}';
    vi.spyOn(fs, 'readFile').mockResolvedValue(template);
    const result = await renderTemplate('/mock/template/path', { name: 'Test', items: ['a', 'b'] });
    expect(result).toContain('Name: Test');
    expect(result).toContain('Item: a');
    expect(result).toContain('Item: b');
  });

  it('should handle missing variables gracefully', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValue('Optional: {{optionalVar}}');
    const result = await renderTemplate('/mock/template/path', {});
    expect(result).toBe('Optional: ');
  });

  it('should generate Electron app files and write them to correct locations', async () => {
    const mockReadFile = vi
      .spyOn(fs, 'readFile')
      .mockResolvedValueOnce('Main script for {{app_name}}')
      .mockResolvedValueOnce('Package config for {{app_name}}')
      .mockResolvedValueOnce('Desktop entry for {{app_name}}');

    const mockWriteFile = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined as any);
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);

    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await generateElectronApp(mockApp, mockDefaults);

    expect(mockReadFile).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(getAppsPath(), mockApp.app_name, 'main.js'),
      expect.any(String),
      expect.any(Object),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(getAppsPath(), mockApp.app_name, 'package.json'),
      expect.any(String),
      expect.any(Object),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(getDesktopEntriesPath(), `${mockApp.app_name}.desktop`),
      expect.any(String),
      expect.any(Object),
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Generated Electron app files for:'),
      mockApp.name,
    );
  });

  it('should throw error when template reading fails in generateElectronApp', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Read error'));
    await expect(generateElectronApp(mockApp, mockDefaults)).rejects.toThrow();
  });

  it('should handle template rendering errors', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Read error'));
    await expect(renderTemplate('/mock/template/path', {})).rejects.toThrow(
      'Failed to render template',
    );
  });
});
