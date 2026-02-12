# AppNix

Convert websites to Linux desktop AppImages.

Define your apps in YAML, and AppNix generates Electron wrappers, builds portable AppImages, and creates `.desktop` entries for seamless OS integration.

## Requirements

- Node.js >= 24.0.0
- Linux operating system
- `7z` (p7zip-full) — extract AppImage runtime
- `gh` or `curl` — download AppImage runtime from GitHub

## Quick Start

```bash
# Install the CLI
npm run setup

# Edit your config
nano ~/.config/appnix/config.yml

# Build all apps
appnix build

# List installed apps
appnix list

# Uninstall an app
appnix uninstall <app_name>
```

## Configuration

Apps are defined in `~/.config/appnix/config.yml`:

```yaml
defaults:
  electron_version: '40.4.0'
  lang: 'en-US'
  spellcheck:
    - 'en-US'
    - 'pt-BR'

apps:
  - name: 'WhatsApp'
    url: 'https://web.whatsapp.com'
    icon: 'whatsapp'
    app_name: 'whatsapp'
    category: 'Network;InstantMessaging;Chat'
    description: 'Messaging, voice and video calls'
```

See `config.example.yml` for a complete example.

## Electron Features

Generated apps include production-ready Electron features:

| Feature | Description |
|---------|-------------|
| Native context menu | Cut, Copy, Paste, links, images, navigation |
| Single instance lock | Prevents duplicate app windows |
| External links | Non-app URLs open in system browser |
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
npm run lint          # Lint with Biome
npm run format        # Format with Biome
npm run test          # Unit tests
npm run test:coverage # Unit tests with coverage
npm run test:e2e      # End-to-end tests
```

## Documentation

- [`docs/index.html`](docs/index.html) — full interactive documentation
- [`docs/appnix.md`](docs/appnix.md) — AI-optimized technical reference

## Limitations

- Linux only
- Requires Chromium-compatible web applications

## License

MIT
