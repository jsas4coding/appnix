import { execSync } from 'node:child_process';

const REQUIRED_TOOLS = ['rpmbuild', 'dnf'] as const;

/**
 * Ensures required system tools for building .rpm packages are available.
 * Throws if any dependency is missing.
 */
export async function ensureRpmDependencies(): Promise<void> {
  const missing: string[] = [];

  for (const tool of REQUIRED_TOOLS) {
    if (!commandExists(tool)) {
      missing.push(tool);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required tools: ${missing.join(', ')}.\nInstall with: sudo dnf install rpm-build dnf`,
    );
  }

  console.log('Build dependencies verified.');
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
