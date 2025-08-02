import fs from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

import type { AppConfig } from '@/types/config';

const HOME = process.env.HOME || '';
const TEST_BASE = path.join(process.cwd(), 'tests/build');
const IS_TEST = process.env.APPNIX_ENV === 'test';
const BASE_PATH = IS_TEST ? TEST_BASE : HOME;

/**
 * Returns the full path to the configuration YAML file.
 */
export function getConfigFile(): string {
  return path.join(BASE_PATH, '.config', 'appnix', 'config.yml');
}

/**
 * Returns the path where application builds are stored.
 */
export function getAppsPath(): string {
  return path.join(BASE_PATH, '.config', 'appnix', 'apps');
}

/**
 * Returns the path for /.local/appnix app files (AppImages and icons).
 * In test mode, redirected to tests/build/.local/appnix.
 */
export function getOptPath(): string {
  return IS_TEST ? path.join(BASE_PATH, '.local', 'appnix') : path.join(HOME, '.local', 'appnix');
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
