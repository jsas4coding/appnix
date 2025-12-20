import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateDesktopEntries } from '@/scripts/desktop-entries';
import * as configUtils from '@/utils/config';
import * as templateUtils from '@/utils/template';
describe('Desktop Integration', () => {
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
            },
        ],
    };
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(configUtils, 'loadConfig').mockResolvedValue(mockConfig);
        vi.spyOn(configUtils, 'validateConfig').mockReturnValue(true);
        vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
        vi.spyOn(templateUtils, 'renderTemplate').mockResolvedValue('Desktop Entry Content');
        vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
        vi.spyOn(process, 'env', 'get').mockReturnValue({ HOME: '/home/testuser' });
    });
    it('should generate desktop entries for all configured apps', async () => {
        await generateDesktopEntries();
        expect(configUtils.loadConfig).toHaveBeenCalled();
        expect(configUtils.validateConfig).toHaveBeenCalledWith(mockConfig);
        expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(path.join('share', 'applications')), { recursive: true });
        expect(templateUtils.renderTemplate).toHaveBeenCalledWith(expect.stringContaining('desktop/entry.hbs'), mockConfig.apps[0]);
        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('test-app.desktop'), 'Desktop Entry Content', { mode: 0o755 });
    });
    it('should throw error for invalid configuration', async () => {
        vi.spyOn(configUtils, 'validateConfig').mockReturnValue(false);
        await expect(generateDesktopEntries()).rejects.toThrow('Invalid configuration');
    });
});
