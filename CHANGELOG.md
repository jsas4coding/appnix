# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Single instance lock** — prevents duplicate app windows via `requestSingleInstanceLock()`
- **Persistent sessions** — login state survives app restarts via `persist:{app_name}` partition
- **Permission handling** — whitelisted permissions (notifications, media, geolocation, clipboard) scoped to app origin
- **External link handling** — URLs outside the app origin open in the system browser via `shell.openExternal()`
- **Crash recovery** — automatic reload after renderer process crash with 2s delay
- **Download handling** — native save dialog for file downloads
- **Spellcheck support** — configurable spellcheck languages from `defaults.spellcheck`
- **Background throttling disabled** — keeps chat/email apps responsive when not focused
- **User agent cleanup** — strips `Electron/` token to avoid website detection/blocking
- **Handlebars `json` helper** — enables serialization of arrays/objects in templates
- `lang` and `spellcheck` fields now passed from defaults to the Electron template context

### Changed

- **Node.js runtime** — minimum version bumped from 22 to 24 (Active LTS)
- **`@types/node`** — updated from `^22.0.0` to `^24.0.0`
- **Electron `main.hbs` template** — rewritten from minimal to production-ready

### Removed

- **`enableRemoteModule: false`** — dead option since Electron 14, removed from webPreferences
- **Unused `path` import** — removed from Electron main template
