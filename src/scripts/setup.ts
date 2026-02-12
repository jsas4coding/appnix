import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getBinPath, getLibPath } from '@/utils/config.js';

/**
 * Installs the AppNix CLI by copying compiled files to ~/.config/appnix/lib/
 * and creating a symlink at /workspace/bin/appnix.
 */
export async function setupCli(): Promise<void> {
  const libPath = getLibPath();
  const binPath = getBinPath();
  const projectRoot = process.cwd();
  const distPath = path.join(projectRoot, 'dist');
  const templatesSource = path.join(projectRoot, 'src', 'templates');

  console.log('Setting up AppNix CLI...\n');

  // 1. Create directories
  await fs.mkdir(libPath, { recursive: true });
  await fs.mkdir(binPath, { recursive: true });

  // 2. Copy dist/ → lib/ (compiled JS)
  console.log(`Copying compiled files to ${libPath}`);
  await fs.cp(distPath, libPath, { recursive: true, force: true });

  // 3. Copy src/templates/ → lib/templates/ (Handlebars templates)
  const templatesTarget = path.join(libPath, 'templates');
  console.log(`Copying templates to ${templatesTarget}`);
  await fs.cp(templatesSource, templatesTarget, { recursive: true, force: true });

  // 4. Copy package.json + package-lock.json and install production deps
  console.log('Installing production dependencies...');
  await fs.copyFile(path.join(projectRoot, 'package.json'), path.join(libPath, 'package.json'));
  await fs.copyFile(
    path.join(projectRoot, 'package-lock.json'),
    path.join(libPath, 'package-lock.json'),
  );
  execSync('npm install --omit=dev', { cwd: libPath, stdio: 'inherit' });

  // 5. Add shebang to cli.js and make it executable
  const cliPath = path.join(libPath, 'cli.js');
  const cliContent = await fs.readFile(cliPath, 'utf8');
  if (!cliContent.startsWith('#!')) {
    await fs.writeFile(cliPath, `#!/usr/bin/env node\n${cliContent}`);
  }
  await fs.chmod(cliPath, 0o755);

  // 6. Create symlink /workspace/bin/appnix → lib/cli.js
  const workspaceBin = '/workspace/bin';
  const symlinkPath = path.join(workspaceBin, 'appnix');
  const symlinkTarget = path.join(libPath, 'cli.js');

  await fs.mkdir(workspaceBin, { recursive: true });

  try {
    await fs.unlink(symlinkPath);
  } catch {
    // Symlink doesn't exist yet
  }

  await fs.symlink(symlinkTarget, symlinkPath);
  console.log(`Created symlink: ${symlinkPath} → ${symlinkTarget}`);

  console.log(`\nAppNix CLI installed successfully.`);
  console.log(`Make sure ${workspaceBin} is in your PATH.`);
}

setupCli().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
