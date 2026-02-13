# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Native context menu** — right-click menu with Cut, Copy, Paste, Select All, Undo/Redo for editable fields, Open/Copy Link, Copy/Save Image, and Back/Forward/Reload fallback
- **Single instance lock** — prevents duplicate app windows via `requestSingleInstanceLock()`
- **External link handling** — URLs outside the app origin open in the system browser via `shell.openExternal()`
- **Crash recovery** — automatic reload after renderer process crash with 2s delay
- **Download handling** — native save dialog for file downloads
- **User agent cleanup** — strips `Electron/` and app name tokens to avoid website detection/blocking
- **Handlebars `json` helper** — enables serialization of arrays/objects in templates

### Fixed

- **App icons** — icon path in desktop entries and electron-builder now uses `app.icon` field instead of `app_name`, fixing mismatches like GloboPlay (`globoplay` vs `globo-play`)

### Changed

- **Node.js runtime** — minimum version bumped from 22 to 24 (Active LTS)
- **`@types/node`** — updated from `^22.0.0` to `^24.0.0`
- **Electron `main.hbs` template** — rewritten from minimal to production-ready
- **Window size** — hardcoded to 1280x800, menu bar always hidden

### Removed

- **`enableRemoteModule: false`** — dead option since Electron 14, removed from webPreferences
- **`window` config option** — removed fullscreen/width/height from app config (caused issues)
- **Unused `path` import** — removed from Electron main template
