# AppNix — Technical Reference

> AI-optimized reference document. For human-readable docs, see `docs/index.html`.

## Project Identity

| Field | Value |
|-------|-------|
| Name | AppNix |
| Version | 0.1.0 |
| Description | Convert websites to Linux desktop AppImages |
| Runtime | Node.js >=24.0.0 |
| Module System | ESM (`"type": "module"`) |
| Language | TypeScript (ES2022 target, NodeNext module) |
| Module Resolution | NodeNext (imports require `.js` extension) |
| Linter/Formatter | Biome 2.3.14 |
| Test Framework | Vitest 1.6.0 |
| Build | `tsc` + `tsc-alias` + `electron-builder` |
| Platform | Linux only |

---

## File Map

| Path | Role | Key Exports |
|------|------|-------------|
| `src/types/app.ts` | Primary type definitions | `WindowConfig`, `AppConfig`, `GlobalConfig` |
| `src/types/config.ts` | Runtime config interface | `AppConfig` (flat variant, used by all modules) |
| `src/utils/config.ts` | Config loading, validation, path resolution | `getAppnixDir()`, `getConfigFile()`, `getStagingPath()`, `getBinPath()`, `getIconsPath()`, `getInstalledPath()`, `getDesktopEntriesPath()`, `loadConfig()`, `validateConfig()` |
| `src/utils/template.ts` | Template rendering, app generation | `renderTemplate()`, `generateElectronApp()` |
| `src/utils/installed.ts` | Installation registry management | `InstalledApp`, `InstalledRegistry`, `readInstalled()`, `writeInstalled()`, `registerApp()`, `unregisterApp()` |
| `src/builder/build.ts` | Build orchestration (electron-builder) | `buildAppImages()` |
| `src/builder/setup.ts` | AppImage runtime bootstrapping | `ensureAppImageRuntime()` |
| `src/scripts/install.ts` | List and uninstall apps | `listInstalled()`, `uninstallApp()` |
| `src/scripts/desktop-entries.ts` | Desktop entry generation | `generateDesktopEntries()` |
| `src/templates/electron/main.hbs` | Handlebars template — Electron main process | — |
| `src/templates/electron/package.hbs` | Handlebars template — Electron package.json | — |
| `src/templates/desktop/entry.hbs` | Handlebars template — `.desktop` entry | — |
| `config.example.yml` | Example YAML configuration | — |
| `vitest.config.ts` | Vitest + vite-tsconfig-paths configuration | — |
| `biome.json` | Biome linter/formatter configuration | — |
| `tsconfig.json` | TypeScript compiler configuration | — |

---

## Type Definitions

### `src/types/app.ts`

```typescript
export interface WindowConfig {
  fullscreen?: boolean;
  width?: number;
  height?: number;
}

export interface AppConfig {
  name: string;           // Display name
  url: string;            // URL to open in Electron
  icon: string;           // Path to icon
  app_name: string;       // Internal name (used for folders/files)
  category?: string;      // Desktop category (e.g., Utility;AI)
  description?: string;   // Short description
  window?: WindowConfig;  // Window options
}

export interface GlobalConfig {
  defaults: {
    electron_version: string;
    lang: string;
    spellcheck: string[];
  };
  apps: AppConfig[];
}
```

### `src/types/config.ts` (Runtime interface)

```typescript
export interface AppConfig {
  defaults: {
    electron_version: string;
    lang: string;
    spellcheck: string[];
  };
  apps: Array<{
    name: string;
    url: string;
    icon?: string;
    app_name: string;
    category: string;
    description: string;
    window?: {
      fullscreen?: boolean;
      width?: number;
      height?: number;
    };
  }>;
}
```

> **Note:** `src/types/config.ts` is the interface actively used at runtime via `@/types/config.js`. `src/types/app.ts` defines a more modular decomposition (`WindowConfig`, `AppConfig`, `GlobalConfig`).

### `src/utils/installed.ts`

```typescript
export interface InstalledApp {
  name: string;
  app_name: string;
  url: string;
  category: string;
  description: string;
  paths: {
    bin: string;
    desktop: string;
    icon: string | null;
  };
  installedAt: string;
}

export interface InstalledRegistry {
  [appName: string]: InstalledApp;
}
```

---

## Function Signatures

### `src/utils/config.ts`

```typescript
function getAppnixDir(): string
// Returns: ~/.config/appnix (base directory for all AppNix data)

function getConfigFile(): string
// Returns: ~/.config/appnix/config.yml

function getStagingPath(): string
// Returns: ~/.config/appnix/.build (temporary, cleaned after build)

function getBinPath(): string
// Returns: ~/.config/appnix/bin (final AppImage binaries)

function getIconsPath(): string
// Returns: ~/.config/appnix/icons

function getInstalledPath(): string
// Returns: ~/.config/appnix/installed.json

function getDesktopEntriesPath(): string
// Returns: ~/.local/share/applications

async function loadConfig(configPath?: string): Promise<AppConfig>
// Loads YAML, parses with `yaml` package, validates with validateConfig()
// @param configPath — defaults to getConfigFile()
// @throws Error if file unreadable or config invalid

function validateConfig(config: AppConfig): boolean
// Checks: defaults exists, electron_version is string, lang is string,
//         spellcheck is string[], apps is non-empty array
```

### `src/utils/template.ts`

```typescript
async function renderTemplate(
  templatePath: string,
  context: Record<string, unknown>
): Promise<string>
// Reads .hbs file, compiles with Handlebars, returns rendered string

async function generateElectronApp(
  app: AppConfig['apps'][0],
  defaults: AppConfig['defaults']
): Promise<void>
// Creates staging dir, renders main.hbs + package.hbs + entry.hbs
// Writes: {stagingPath}/{app_name}/main.js, {stagingPath}/{app_name}/package.json
// Writes: {desktopEntriesPath}/{app_name}.desktop
// Adds bin_path, icon_path, lang, spellcheck to template context
// Registers Handlebars `json` helper for array serialization
// Default window: { width: 1280, height: 800, fullscreen: false }
```

### `src/utils/installed.ts`

```typescript
async function readInstalled(): Promise<InstalledRegistry>
// Reads ~/.config/appnix/installed.json, returns {} if file doesn't exist

async function writeInstalled(registry: InstalledRegistry): Promise<void>
// Writes registry to installed.json (JSON, 2-space indent, mode 0o644)

async function registerApp(app: InstalledApp): Promise<void>
// Adds/updates app entry in installed.json

async function unregisterApp(appName: string): Promise<InstalledApp | null>
// Removes app from installed.json, returns entry if found
```

### `src/builder/setup.ts`

```typescript
async function ensureAppImageRuntime(): Promise<void>
// Ensures electron-builder AppImage tooling is cached at
// ~/.cache/electron-builder/appimage/appimage-12.0.1/
// Downloads appimage-12.0.1.7z from GitHub releases if missing
// Validates runtime-x64 is a real ELF binary (not HTML error page)
// Uses `gh` CLI (fallback: curl) for download, `7z` for extraction
// Requirements: gh or curl, 7z (p7zip-full)
```

### `src/builder/build.ts`

```typescript
async function buildAppImages(): Promise<void>
// Full build pipeline for each app:
//   1. ensureAppImageRuntime() — bootstrap tooling
//   2. generateElectronApp() — render templates to staging
//   3. npm install --ignore-scripts in staging dir
//   4. electron-builder → AppImage in staging output dir
//   5. Move AppImage to ~/.config/appnix/bin/{app_name} (chmod 755)
//   6. registerApp() — update installed.json
//   7. Clean up staging dirs
//   8. Remove .build/ directory entirely
// Entry point: runs if import.meta.url === file://process.argv[1]
```

### `src/scripts/install.ts`

```typescript
async function listInstalled(): Promise<void>
// Reads installed.json, prints all installed apps with paths

async function uninstallApp(appName: string): Promise<void>
// Removes binary, desktop entry, and icon for the given app
// Unregisters from installed.json
// CLI: node install.js list | node install.js uninstall <name>
```

### `src/scripts/desktop-entries.ts`

```typescript
async function generateDesktopEntries(): Promise<void>
// Loads config, validates, iterates apps:
//   Renders entry.hbs with app context (includes bin_path, icon_path)
//   Output: ~/.local/share/applications/{app_name}.desktop (mode 0o755)
// Entry point: runs if import.meta.url === file://process.argv[1]
```

---

## Configuration Schema

File location: `~/.config/appnix/config.yml`

```yaml
defaults:                          # Required
  electron_version: '36.0.0'      # Required — string
  lang: 'en-US'                   # Required — string
  spellcheck:                     # Required — string[]
    - 'en-US'
    - 'pt-BR'

apps:                              # Required — non-empty array
  - name: 'ChatGPT'              # Required — display name
    url: 'https://chat.openai.com' # Required — URL to load
    icon: 'chatgpt'              # Optional in config.ts, used for icon path
    app_name: 'chatgpt'          # Required — internal identifier (folders/files)
    category: 'Utility'          # Required in config.ts — FreeDesktop category
    description: 'AI Chat'       # Required in config.ts — short description
    window:                       # Optional — window configuration
      fullscreen: false           # Optional — boolean (default: false)
      width: 1280                 # Optional — number (default: 1280)
      height: 800                 # Optional — number (default: 800)
```

### Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `defaults.electron_version` | `string` | Yes | — | Electron version for generated apps |
| `defaults.lang` | `string` | Yes | — | Language locale |
| `defaults.spellcheck` | `string[]` | Yes | — | Spellcheck language codes |
| `apps[].name` | `string` | Yes | — | Display name shown in desktop |
| `apps[].url` | `string` | Yes | — | URL loaded in Electron BrowserWindow |
| `apps[].icon` | `string` | No* | — | Icon identifier or path |
| `apps[].app_name` | `string` | Yes | — | Internal name for files/folders |
| `apps[].category` | `string` | Yes | — | FreeDesktop category string |
| `apps[].description` | `string` | Yes | — | Short app description |
| `apps[].window.fullscreen` | `boolean` | No | `false` | Start in fullscreen mode |
| `apps[].window.width` | `number` | No | `1280` | Window width in pixels |
| `apps[].window.height` | `number` | No | `800` | Window height in pixels |

---

## Template Variables

### `main.hbs` (Electron main process)

| Variable | Source | Usage |
|----------|--------|-------|
| `{{url}}` | `app.url` | App URL — loaded via `loadURL()`, used for origin check |
| `{{app_name}}` | `app.app_name` | Persistent session partition name |
| `{{window.width}}` | `app.window.width` or `1280` | BrowserWindow width |
| `{{window.height}}` | `app.window.height` or `800` | BrowserWindow height |
| `{{#if window.fullscreen}}` | `app.window.fullscreen` | Conditional fullscreen |
| `{{#unless window.fullscreen}}` | `app.window.fullscreen` | Hide menu bar when not fullscreen |
| `{{{json spellcheck}}}` | `defaults.spellcheck` | Spellcheck languages array (triple-stache for raw JSON) |

### `package.hbs` (Electron package.json)

| Variable | Source | Usage |
|----------|--------|-------|
| `{{app_name}}` | `app.app_name` | Package name |
| `{{description}}` | `app.description` | Package description |
| `{{category}}` | `app.category` | Keywords array |
| `{{name}}` | `app.name` | Product name |
| `{{electron_version}}` | `defaults.electron_version` | Electron devDependency version |

### `entry.hbs` (Desktop entry)

| Variable | Source | Usage |
|----------|--------|-------|
| `{{name}}` | `app.name` | Desktop entry Name |
| `{{description}}` | `app.description` | Desktop entry Comment |
| `{{bin_path}}` | `getBinPath() + app.app_name` | Full path to AppImage binary in Exec |
| `{{icon_path}}` | `getIconsPath() + app.app_name + .png` | Full path to icon |
| `{{app_name}}` | `app.app_name` | StartupWMClass |
| `{{category}}` | `app.category` | Desktop entry Categories |

---

## Path Resolution

All paths are under `~/.config/appnix/` (config dir). Nothing is stored in the project repo at runtime.

| Function | Production Path | Test Path (`APPNIX_ENV=test`) |
|----------|----------------|-------------------------------|
| `getAppnixDir()` | `$HOME/.config/appnix` | `$CWD/tests/build/.config/appnix` |
| `getConfigFile()` | `$HOME/.config/appnix/config.yml` | `$CWD/tests/build/.config/appnix/config.yml` |
| `getStagingPath()` | `$HOME/.config/appnix/.build` | `$CWD/tests/build/.config/appnix/.build` |
| `getBinPath()` | `$HOME/.config/appnix/bin` | `$CWD/tests/build/.config/appnix/bin` |
| `getIconsPath()` | `$HOME/.config/appnix/icons` | `$CWD/tests/build/.config/appnix/icons` |
| `getInstalledPath()` | `$HOME/.config/appnix/installed.json` | `$CWD/tests/build/.config/appnix/installed.json` |
| `getDesktopEntriesPath()` | `$HOME/.local/share/applications` | `$CWD/tests/build/.local/share/applications` |

Environment variable: `APPNIX_ENV=test` activates test mode. Base path switches from `$HOME` to `$CWD/tests/build`.

### Config Directory Structure

```
~/.config/appnix/
├── config.yml           # User configuration (YAML)
├── installed.json       # Installation registry (tracks all installed apps)
├── bin/
│   └── {app_name}       # AppImage binaries (chmod 755, no extension)
├── icons/
│   └── {app_name}.png   # App icons
└── .build/              # Temporary staging (cleaned after build)
    ├── {app_name}/      # Generated Electron files + node_modules
    └── {app_name}-out/  # electron-builder output
```

### installed.json Schema

```json
{
  "todoist": {
    "name": "Todoist",
    "app_name": "todoist",
    "url": "https://app.todoist.com",
    "category": "Utility",
    "description": "Todoist Task Manager",
    "paths": {
      "bin": "/home/user/.config/appnix/bin/todoist",
      "desktop": "/home/user/.local/share/applications/todoist.desktop",
      "icon": "/home/user/.config/appnix/icons/todoist.png"
    },
    "installedAt": "2026-02-12T12:45:48.392Z"
  }
}
```

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `electron-builder` | ^24.6.4 | Build AppImages from Electron apps |
| `handlebars` | ^4.7.8 | Template engine for code generation |
| `yaml` | ^2.3.4 | Parse YAML configuration files |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `@biomejs/biome` | ^2.3.14 | Linter + formatter (replaces ESLint + Prettier) |
| `@types/node` | ^24.0.0 | Node.js type definitions |
| `@vitest/coverage-v8` | ^1.6.0 | Code coverage with V8 provider |
| `rimraf` | ^5.0.5 | Cross-platform `rm -rf` for clean script |
| `tsc-alias` | ^1.8.10 | Resolve TypeScript path aliases in compiled output |
| `typescript` | ^5.4.5 | TypeScript compiler |
| `vite-tsconfig-paths` | ^5.1.4 | Resolve tsconfig paths in Vitest |
| `vitest` | ^1.6.0 | Test runner |

### System Requirements (for build)

| Tool | Package | Purpose |
|------|---------|---------|
| `7z` | p7zip-full | Extract AppImage runtime archive |
| `gh` or `curl` | gh / curl | Download AppImage runtime from GitHub |

---

## Build Pipeline

```
1. npm run clean          → rimraf dist/
2. npm run build          → tsc → tsc-alias → node dist/builder/build.js
   ├── tsc                  Compile TS → JS in dist/
   ├── tsc-alias             Rewrite @/* imports to relative paths
   └── build.js             Pipeline:
       ├── ensureAppImageRuntime()   Download + cache AppImage tooling
       └── For each app in config:
           ├── generateElectronApp()   Render templates → staging dir
           ├── npm install             Install electron in staging
           ├── electron-builder        Build AppImage → staging output
           ├── Move AppImage           → ~/.config/appnix/bin/{app_name}
           ├── registerApp()           → update installed.json
           └── Cleanup                 → remove staging dirs
```

### Electron Security Defaults (from main.hbs)

```javascript
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webviewTag: false,
  session: ses,               // persist:{app_name} partition
  backgroundThrottling: false,
  spellcheck: true
}
// Additional runtime features:
// - requestSingleInstanceLock() — prevents duplicate windows
// - session.setPermissionRequestHandler() — whitelisted permissions
// - setWindowOpenHandler() + will-navigate — external link handling
// - render-process-gone — crash recovery with 2s reload
// - will-download — native save dialog
// - User agent stripped of Electron/ token
```

---

## Testing Structure

| Path | Type | What it tests |
|------|------|---------------|
| `tests/unit/utils/config.test.ts` | Unit | `loadConfig()`, `validateConfig()`, path functions |
| `tests/unit/utils/template.test.ts` | Unit | `renderTemplate()`, `generateElectronApp()` |
| `tests/unit/builder/build.test.ts` | Unit | `buildAppImages()` |
| `tests/unit/scripts/install.test.ts` | Unit | `listInstalled()`, `uninstallApp()` |
| `tests/unit/scripts/desktop-entries.test.ts` | Unit | `generateDesktopEntries()` |
| `tests/e2e/full-flow.test.ts` | E2E | Full build + install + uninstall pipeline |

### Test Commands

```bash
npm run test              # Unit tests (vitest run tests/unit)
npm run test:coverage     # Unit tests with V8 coverage
npm run test:e2e          # E2E tests (vitest run tests/e2e)
npm run test:watch        # Unit tests in watch mode
```

### Test Environment

- `APPNIX_ENV=test` — redirects all file operations to `tests/build/`
- Vitest globals enabled (`describe`, `it`, `expect` without imports)
- `vite-tsconfig-paths` resolves `@/*` aliases in tests
- Coverage: V8 provider, reporters: text + html + lcov, includes `src/**/*.ts`, excludes `**/types/**`

---

## Conventions

### Module System
- ESM everywhere (`"type": "module"` in package.json)
- TypeScript compiled to ES2022 with NodeNext module resolution
- Imports require `.js` extension: `import { foo } from '@/utils/config.js'`
- Path alias: `@/*` → `src/*` (resolved by `tsc-alias` in build, `vite-tsconfig-paths` in tests)

### Code Style (Biome)
- Indent: 2 spaces
- Line width: 100
- Quotes: single
- Semicolons: always
- Block statements required (no single-line if/for)
- Organize imports automatically
- `noExplicitAny` disabled in tests only

### Import Style
- Node builtins: `import fs from 'node:fs/promises'` (prefixed with `node:`)
- Path alias: `import { loadConfig } from '@/utils/config.js'`
- Type imports: `import type { AppConfig } from '@/types/config.js'`

### File Naming
- Source: `kebab-case.ts` (e.g., `desktop-entries.ts`)
- Tests: `{source-name}.test.ts` mirroring src structure
- Templates: `{name}.hbs`

### Scripts Entry Point Pattern
```typescript
if (import.meta.url === `file://${process.argv[1]}`) {
  myFunction().catch(console.error);
}
```

---

## Output Structure

### Compiled Output (`dist/`) — repo only, no runtime artifacts

```
dist/
├── builder/
│   ├── build.js
│   └── setup.js
├── scripts/
│   ├── install.js
│   └── desktop-entries.js
├── types/
│   ├── app.js
│   └── config.js
└── utils/
    ├── config.js
    ├── template.js
    └── installed.js
```

### Runtime Output (all under `~/.config/appnix/`)

```
~/.config/appnix/
├── config.yml           # User configuration
├── installed.json       # Installation tracking for uninstall
├── bin/
│   └── {app_name}       # AppImage binary (chmod 755)
└── icons/
    └── {app_name}.png   # App icons

~/.local/share/applications/
└── {app_name}.desktop   # Desktop entry (chmod 755)
```
