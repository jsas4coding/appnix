import { execSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';

const APPIMAGE_VERSION = 'appimage-12.0.1';
export const CACHE_DIR = path.join(os.homedir(), '.cache', 'electron-builder', 'appimage', APPIMAGE_VERSION);
const RELEASE_REPO = 'electron-userland/electron-builder-binaries';
const ARCHIVE_NAME = `${APPIMAGE_VERSION}.7z`;

/**
 * Ensures the AppImage runtime and tools are available in the electron-builder cache.
 *
 * electron-builder's app-builder binary expects these files but may fail to download
 * them automatically. This function checks for their presence and downloads/extracts
 * them from the official GitHub release if missing.
 */
export async function ensureAppImageRuntime(): Promise<void> {
  const runtimePath = path.join(CACHE_DIR, 'runtime-x64');
  const mksquashfsPath = path.join(CACHE_DIR, 'linux-x64', 'mksquashfs');

  if (await isValidElf(runtimePath) && await fileExists(mksquashfsPath)) {
    console.log('AppImage runtime already cached.');
    return;
  }

  console.log('AppImage runtime not found in cache. Downloading...');

  await fs.mkdir(CACHE_DIR, { recursive: true });

  const archivePath = path.join(CACHE_DIR, ARCHIVE_NAME);

  try {
    await downloadRelease(archivePath);
    await extractArchive(archivePath);
    await fs.unlink(archivePath).catch(() => {});

    if (!await isValidElf(runtimePath)) {
      throw new Error(`runtime-x64 is not a valid ELF binary after extraction`);
    }

    if (!await fileExists(mksquashfsPath)) {
      throw new Error(`mksquashfs not found after extraction`);
    }

    console.log('AppImage runtime cached successfully.');
  } catch (error) {
    console.error('Failed to setup AppImage runtime:', error);
    console.error(`\nManual fix: download ${APPIMAGE_VERSION}.7z from`);
    console.error(`https://github.com/${RELEASE_REPO}/releases/tag/${APPIMAGE_VERSION}`);
    console.error(`and extract to ${CACHE_DIR}`);
    throw error;
  }
}

/**
 * Downloads the AppImage tooling archive from GitHub releases using gh CLI or curl.
 */
async function downloadRelease(destPath: string): Promise<void> {
  if (commandExists('gh')) {
    console.log(`Downloading ${ARCHIVE_NAME} via gh CLI...`);
    execSync(
      `gh release download ${APPIMAGE_VERSION} --repo ${RELEASE_REPO} --pattern "${ARCHIVE_NAME}" --dir "${path.dirname(destPath)}" --clobber`,
      { stdio: 'inherit' },
    );
    return;
  }

  console.log(`Downloading ${ARCHIVE_NAME} via curl...`);
  const url = `https://github.com/${RELEASE_REPO}/releases/download/${APPIMAGE_VERSION}/${ARCHIVE_NAME}`;
  execSync(`curl -fSL -o "${destPath}" "${url}"`, { stdio: 'inherit' });
}

/**
 * Extracts the .7z archive into the cache directory.
 */
async function extractArchive(archivePath: string): Promise<void> {
  if (!commandExists('7z')) {
    throw new Error(
      '7z is required to extract AppImage runtime. Install with: sudo apt install p7zip-full',
    );
  }

  console.log('Extracting AppImage runtime...');
  execSync(`7z x -y -o"${CACHE_DIR}" "${archivePath}"`, { stdio: 'inherit' });
}

/**
 * Checks if a file exists and is a valid ELF binary (not an HTML error page).
 */
async function isValidElf(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(4);
    await fd.read(buf, 0, 4, 0);
    await fd.close();
    // ELF magic bytes: 0x7F 'E' 'L' 'F'
    return buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
