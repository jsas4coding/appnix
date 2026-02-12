import fs from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

import type { AppConfig } from '@/types/config.js';

const HOME = process.env.HOME || '';
const TEST_BASE = path.join(process.cwd(), 'tests/build');
const IS_TEST = process.env.APPNIX_ENV === 'test';
const BASE_PATH = IS_TEST ? TEST_BASE : HOME;

const APPNIX_DIR = path.join(BASE_PATH, '.config', 'appnix');

/**
 * Returns the base AppNix config directory (~/.config/appnix).
 */
export function getAppnixDir(): string {
  return APPNIX_DIR;
}

/**
 * Returns the full path to the configuration YAML file.
 */
export function getConfigFile(): string {
  return path.join(APPNIX_DIR, 'config.yml');
}

/**
 * Returns the path for temporary build staging (~/.config/appnix/.build).
 * Cleaned up after each build.
 */
export function getStagingPath(): string {
  return path.join(APPNIX_DIR, '.build');
}

/**
 * Returns the path where final AppImage binaries are stored (~/.config/appnix/bin).
 */
export function getBinPath(): string {
  return path.join(APPNIX_DIR, 'bin');
}

/**
 * Returns the path where app icons are stored (~/.config/appnix/icons).
 */
export function getIconsPath(): string {
  return path.join(APPNIX_DIR, 'icons');
}

/**
 * Returns the path to installed.json (~/.config/appnix/installed.json).
 */
export function getInstalledPath(): string {
  return path.join(APPNIX_DIR, 'installed.json');
}

/**
 * Returns the path to the lib directory (~/.config/appnix/lib).
 */
export function getLibPath(): string {
  return path.join(APPNIX_DIR, 'lib');
}

/**
 * Returns the path where Handlebars templates are resolved from.
 * In test mode, resolves from the project source directory.
 */
export function getTemplatesPath(): string {
  if (IS_TEST) {
    return path.join(process.cwd(), 'src', 'templates');
  }
  return path.join(APPNIX_DIR, 'lib', 'templates');
}

/**
 * Returns the path where desktop entries are stored.
 */
export function getDesktopEntriesPath(): string {
  return path.join(BASE_PATH, '.local', 'share', 'applications');
}

/**
 * Loads and validates the configuration from a YAML file.
 *
 * @param configPath - Optional custom path for the configuration file.
 * @returns The validated AppConfig object.
 * @throws Error if the file cannot be read or the configuration is invalid.
 */
export async function loadConfig(configPath: string = getConfigFile()): Promise<AppConfig> {
  try {
    const configContent = await fs.readFile(configPath, 'utf8');
    const parsed = parse(configContent) as AppConfig;

    if (!validateConfig(parsed)) {
      throw new Error('Invalid configuration');
    }

    return parsed;
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    throw error;
  }
}

/**
 * Validates an AppConfig object, ensuring required fields and types.
 *
 * @param config - The configuration object to validate.
 * @returns True if the configuration is valid, false otherwise.
 */
export function validateConfig(config: AppConfig): boolean {
  if (!config.defaults) {
    console.error('Invalid configuration: Missing defaults');
    return false;
  }

  const { electron_version, lang, spellcheck } = config.defaults;

  if (typeof electron_version !== 'string') {
    console.error('Invalid configuration: electron_version must be a string');
    return false;
  }

  if (typeof lang !== 'string') {
    console.error('Invalid configuration: lang must be a string');
    return false;
  }

  if (!Array.isArray(spellcheck) || !spellcheck.every((s) => typeof s === 'string')) {
    console.error('Invalid configuration: spellcheck must be an array of strings');
    return false;
  }

  if (!Array.isArray(config.apps) || config.apps.length === 0) {
    console.error('Invalid configuration: No apps configured');
    return false;
  }

  return true;
}
