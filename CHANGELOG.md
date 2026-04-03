# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2026-04-03

### Fixed

- **Uninstall cleanup** — remove Electron user data directory (`~/.config/{app_name}/`) when uninstalling apps

### Changed

- **Dependencies** — updated biome 2.4.8→2.4.9

## [1.0.0] - 2026-03-25

### Added

- **`.deb` packaging** — apps are now built as `.deb` packages via electron-builder and installed via `dpkg`
- **App registry** — `installed.json` tracks installed apps with package name, paths, and install date
- **`reinstall` command** — uninstall and rebuild an app in a single step
- **`uninstall all` command** — remove all installed apps, orphaned packages, and desktop entries
- **Config schema** — added `config.schema.json` for YAML validation
- **`maintainer` field** — required in `defaults` for `.deb` package metadata
- **`keywords` field** — optional per-app field for desktop search discovery
- **Native context menu** — right-click menu with Cut, Copy, Paste, Select All, Undo/Redo for editable fields, Open/Copy Link, Copy/Save Image, and Back/Forward/Reload fallback
- **Single instance lock** — prevents duplicate app windows via `requestSingleInstanceLock()`
- **Smart link navigation** — click navigates in-app (fixes Google login flows), Ctrl+click opens in system browser; context menu retains "Open Link in Browser"
- **Crash recovery** — automatic reload after renderer process crash with 2s delay
- **Download handling** — native save dialog for file downloads
- **User agent cleanup** — strips `Electron/` and app name tokens to avoid website detection/blocking
- **Handlebars `json` helper** — enables serialization of arrays/objects in templates
- **App icons** — added icon set for all configured apps
- **Tasker configuration** — `.tasker/` config with `Makefile` and `Taskfile.yml` for task automation

### Fixed

- **`reinstall` self-kill** — `pkill -f` pattern now targets only the Electron app process, not the CLI itself
- **App icons** — icon path in desktop entries and electron-builder now uses `app.icon` field instead of `app_name`
- **Copy Link** — fixed clipboard error in context menu (was using non-existent `webContents.clipboard`)
- **Test isolation** — `APPNIX_ENV=test` set in vitest config to prevent tests from loading user config

### Changed

- **Version** — bumped to 1.0.0
- **Build model** — migrated from AppImage to `.deb` packages
- **Node.js runtime** — minimum version bumped from 22 to 24 (Active LTS)
- **Electron** — updated default version from 40.4.0 to 41.0.2
- **Dependencies** — updated vitest 1.6→4.1, biome 2.3→2.4, typescript 5.4→5.9, rimraf 5→6
- **Removed `vite-tsconfig-paths`** — replaced by native `resolve.tsconfigPaths` in vitest 4
- **Window size** — hardcoded to 1280x800, menu bar always hidden
- **README** — rewritten for `.deb` model with full CLI reference and config documentation

### Removed

- **AppImage support** — replaced entirely by `.deb` packaging
- **`enableRemoteModule: false`** — dead option since Electron 14
- **`window` config option** — removed fullscreen/width/height from app config
- **`config` symlink from git** — runtime symlink to `~/.config/appnix` no longer tracked
