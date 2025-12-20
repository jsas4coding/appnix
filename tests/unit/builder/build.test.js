import fs from 'node:fs/promises';
import { build } from 'electron-builder';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAppImages } from '@/builder/build';
import * as configUtils from '@/utils/config';
import * as templateUtils from '@/utils/template';
// Mock electron-builder
vi.mock('electron-builder', () => ({
    build: vi.fn(),
}));
describe('AppImage Build Process', () => {
    const mockConfig = {
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
                icon: '/path/to/icon.png',
                window: { width: 1024, height: 768 },
            },
        ],
    };
    let mockConsoleError;
    let mockConsoleLog;
    beforeEach(() => {
        vi.clearAllMocks();
        mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(configUtils, 'loadConfig').mockResolvedValue(mockConfig);
        vi.spyOn(configUtils, 'validateConfig').mockReturnValue(true);
        vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
        vi.spyOn(templateUtils, 'generateElectronApp').mockResolvedValue(undefined);
        build.mockResolvedValue(undefined);
    });
    afterEach(() => {
        mockConsoleError.mockRestore();
        mockConsoleLog.mockRestore();
    });
    it('should build AppImages for all configured apps', async () => {
        await buildAppImages();
        expect(configUtils.loadConfig).toHaveBeenCalled();
        expect(configUtils.validateConfig).toHaveBeenCalledWith(mockConfig);
        expect(templateUtils.generateElectronApp).toHaveBeenCalledWith(mockConfig.apps[0], mockConfig.defaults);
        expect(build).toHaveBeenCalledWith(expect.objectContaining({
            config: expect.objectContaining({
                appId: 'com.appnix.test-app',
                productName: 'Test App',
            }),
            linux: ['AppImage'],
        }));
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Built AppImage for Test App'));
        expect(mockConsoleLog).toHaveBeenCalledWith('All AppImages built successfully');
    });
    it('should build AppImages for multiple apps', async () => {
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
                    icon: '/path/to/icon2.png',
                    window: { width: 800, height: 600 },
                },
            ],
        };
        vi.spyOn(configUtils, 'loadConfig').mockResolvedValue(multiConfig);
        await buildAppImages();
        expect(templateUtils.generateElectronApp).toHaveBeenCalledTimes(2);
        expect(build).toHaveBeenCalledTimes(2);
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Built AppImage for Another App'));
        expect(mockConsoleLog).toHaveBeenCalledWith('All AppImages built successfully');
    });
    it('should throw error for invalid configuration', async () => {
        vi.spyOn(configUtils, 'validateConfig').mockReturnValue(false);
        await expect(buildAppImages()).rejects.toThrow('Invalid configuration');
    });
    it('should handle errors during build process', async () => {
        build.mockRejectedValue(new Error('Build failed'));
        await expect(buildAppImages()).rejects.toThrow('Build failed');
    });
});
