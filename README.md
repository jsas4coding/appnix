# AppNix 🚀

Transform web applications into native Linux desktop applications with ease.

## 🌟 Overview

AppNix is a powerful CLI tool that converts websites into Linux desktop AppImages using Electron, allowing you to turn any web app into a native desktop experience.

## ✨ Features

- 🌐 Convert web apps to native Linux desktop applications
- 🔧 Customizable app configurations
- 🛡️ Secure Electron sandbox
- 💻 Easy-to-use CLI interface
- 🖥️ Seamless desktop integration

## 🚀 Quick Start

### Prerequisites

- Node.js (>=22.0.0)
- Linux operating system

### Installation

```bash
npm install -g appnix
```

### Configuration

Create a configuration file at `~/.config/appnix/config.yml`:

```yaml
defaults:
  electron_version: '36.0.0'
  lang: 'en-US'

apps:
  - name: 'ChatGPT'
    url: 'https://chat.openai.com'
    app_name: 'chatgpt'
    category: 'Utility;AI'
    description: 'Chat with AI'
    icon: '/path/to/icon.png'
    window:
      width: 1280
      height: 800
```

### Usage

#### Build AppImage

```bash
appnix build
```

#### Install Desktop Entries

```bash
appnix install:desktop
```

## 🛠️ Development Commands

```bash
# Build the project
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## 🔒 Security

- Electron sandbox enabled by default
- Strict configuration validation
- Minimal runtime permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Run tests and linting
5. Submit a pull request

## 📋 Compatibility

- Linux desktop environments
- Web applications compatible with Electron
- Node.js >=22.0.0

## 🚧 Limitations

- Currently Linux-only
- Requires Chromium-compatible web applications

## 📜 License

[To be determined]

## 🙏 Acknowledgments

- Electron
- Electron Builder
- Handlebars
- TypeScript Community

