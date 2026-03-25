# AppNix

Personal tool to convert websites into Linux desktop apps (.deb).

Define your apps in YAML, and AppNix generates Electron wrappers, builds `.deb` packages, and creates `.desktop` entries for seamless OS integration.

## Requirements

- Node.js >= 24.0.0
- Linux operating system
- `dpkg` — install and manage `.deb` packages

## Quick Start

```bash
# Install the CLI
npm run setup

# Edit your config
nano ~/.config/appnix/config.yml

# Build and install a single app
appnix install whatsapp

# Build all apps
appnix build

# List installed apps
appnix list

# Reinstall an app (uninstall + rebuild)
appnix reinstall todoist

# Uninstall an app
appnix uninstall todoist

# Uninstall everything
appnix uninstall all
```

## Configuration

Apps are defined in `~/.config/appnix/config.yml`:

```yaml
defaults:
  electron_version: "41.0.2"
  maintainer: "Your Name <your@email.com>"
  lang: "en-US"
  spellcheck:
    - "en-US"
    - "pt-BR"

apps:
  - name: "WhatsApp"
    url: "https://web.whatsapp.com"
    icon: "whatsapp"
    app_name: "whatsapp"
    category: "Network;InstantMessaging;Chat"
    description: "End-to-end encrypted messaging, voice and video calls"
    keywords:
      - "messaging"
      - "chat"
      - "calls"
```

See [`config.example.yml`](config.example.yml) for a schema reference and [`config.schema.json`](config.schema.json) for JSON Schema validation.

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name for desktop entry |
| `url` | Yes | URL loaded by the Electron wrapper |
| `app_name` | Yes | Machine identifier (lowercase, hyphens) |
| `icon` | No | Icon filename (without extension) from `~/.config/appnix/icons/` |
| `category` | Yes | FreeDesktop.org menu categories (`;` separated) |
| `description` | Yes | Short description for package metadata |
| `keywords` | No | Search keywords for desktop discovery |

## Electron Features

Generated apps include production-ready Electron features:

| Feature | Description |
|---------|-------------|
| Native context menu | Cut, Copy, Paste, links, images, navigation |
| Single instance lock | Prevents duplicate app windows |
| Smart link navigation | In-app navigation + Ctrl+click for system browser |
| Crash recovery | Auto-reload after renderer crash (2s delay) |
| Download handling | Native save dialog for downloads |
| User agent cleanup | Strips Electron token to avoid site blocking |
| Security hardening | Context isolation, sandbox, no Node integration |

## Security

- Context isolation enabled — separates web content from Electron internals
- Sandbox mode — renderer runs with restricted system access
- Node integration disabled — web content cannot access Node.js APIs

## Development

```bash
npm install             # Install dependencies
npm run lint            # Lint with Biome
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format with Biome
npm run test            # Unit tests
npm run test:coverage   # Unit tests with coverage
npm run test:e2e        # End-to-end tests
npm run test:watch      # Watch mode
```

### Task Runner

This project uses [Tasker](https://github.com/user/tasker) for task automation:

```bash
task appnix:dev:setup       # Compile and install CLI
task appnix:dev:install     # Install a single app
task appnix:dev:build       # Build all apps
task lint:dev:check         # Run linter
task test:dev:unit          # Run unit tests
```

Run `tasker list` for all available tasks.

## Documentation

- [`docs/index.html`](docs/index.html) — full interactive documentation
- [`docs/appnix.md`](docs/appnix.md) — AI-optimized technical reference

## Limitations

- Linux only
- Requires Chromium-compatible web applications

## License

MIT
