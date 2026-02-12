#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { positionals } = parseArgs({ allowPositionals: true });
const [command, ...args] = positionals;

function showHelp(): void {
  console.log(`
AppNix — Convert websites to Linux desktop AppImages

Usage: appnix <command> [options]

Commands:
  build              Build AppImages for all configured apps
  install <name>     Build and install a single app
  reinstall <name>   Uninstall and rebuild an app (kills running process)
  list               List installed apps
  uninstall <name>   Uninstall an app by name
  desktop            Generate desktop entries
  all                Build all apps and generate desktop entries

Examples:
  appnix build
  appnix install whatsapp
  appnix reinstall todoist
  appnix list
  appnix uninstall todoist
`);
}

switch (command) {
  case 'build': {
    const { buildAppImages } = await import('@/builder/build.js');
    await buildAppImages();
    break;
  }
  case 'install': {
    const name = args[0];
    if (!name) {
      console.error('Error: app name is required.\nUsage: appnix install <name>');
      process.exit(1);
    }
    const { buildAppByName } = await import('@/builder/build.js');
    await buildAppByName(name);
    break;
  }
  case 'reinstall': {
    const name = args[0];
    if (!name) {
      console.error('Error: app name is required.\nUsage: appnix reinstall <name>');
      process.exit(1);
    }
    // Kill running process to prevent ETXTBSY when overwriting binary
    try {
      execSync(`pkill -f ${name}`, { stdio: 'ignore' });
    } catch {
      // App may not be running — ignore
    }
    const { uninstallApp } = await import('@/scripts/install.js');
    await uninstallApp(name);
    const { buildAppByName } = await import('@/builder/build.js');
    await buildAppByName(name);
    break;
  }
  case 'list': {
    const { listInstalled } = await import('@/scripts/install.js');
    await listInstalled();
    break;
  }
  case 'uninstall': {
    const name = args[0];
    if (!name) {
      console.error('Error: app name is required.\nUsage: appnix uninstall <name>');
      process.exit(1);
    }
    const { uninstallApp } = await import('@/scripts/install.js');
    await uninstallApp(name);
    break;
  }
  case 'desktop': {
    const { generateDesktopEntries } = await import('@/scripts/desktop-entries.js');
    await generateDesktopEntries();
    break;
  }
  case 'all': {
    const { buildAppImages } = await import('@/builder/build.js');
    const { generateDesktopEntries } = await import('@/scripts/desktop-entries.js');
    await buildAppImages();
    await generateDesktopEntries();
    break;
  }
  default:
    showHelp();
    break;
}
