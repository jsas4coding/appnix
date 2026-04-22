#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { positionals } = parseArgs({ allowPositionals: true });
const [command, ...args] = positionals;

function showHelp(): void {
  console.log(`
AppNix — Convert websites to Linux desktop apps (.rpm)

Usage: appnix <command> [options]

Commands:
  build              Build .rpm packages for all configured apps
  install <name>     Build and install a single app
  reinstall <name>   Uninstall and rebuild an app
  list               List installed apps
  uninstall <name>   Uninstall an app by name
  uninstall all      Uninstall all apps (including legacy AppImage)
  desktop            Regenerate desktop entries
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
    const { buildAllApps } = await import('@/builder/build.js');
    await buildAllApps();
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
    // Kill running Electron app to prevent ETXTBSY when overwriting binary
    // Use appnix-specific pattern to avoid killing the CLI process itself
    try {
      execSync(`pkill -f "appnix-${name}|com\\.appnix\\.${name}"`, { stdio: 'ignore' });
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
      console.error('Error: app name is required.\nUsage: appnix uninstall <name|all>');
      process.exit(1);
    }
    if (name === 'all') {
      const { uninstallAll } = await import('@/scripts/install.js');
      await uninstallAll();
    } else {
      const { uninstallApp } = await import('@/scripts/install.js');
      await uninstallApp(name);
    }
    break;
  }
  case 'desktop': {
    const { generateDesktopEntries } = await import('@/scripts/desktop-entries.js');
    await generateDesktopEntries();
    break;
  }
  case 'all': {
    const { buildAllApps } = await import('@/builder/build.js');
    const { generateDesktopEntries } = await import('@/scripts/desktop-entries.js');
    await buildAllApps();
    await generateDesktopEntries();
    break;
  }
  default:
    showHelp();
    break;
}
