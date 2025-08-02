#!/usr/bin/env bash
set -e

# Parameters
NODE_VERSION=${1:-22} # Default Node version
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
SYMLINK_DIR="$HOME/nvm"

echo "📦 Installing or updating NVM and Node.js..."

# Get the latest NVM version
NVM_VERSION=$(curl -sL https://api.github.com/repos/nvm-sh/nvm/releases/latest | jq -r ".tag_name")
if [ -z "$NVM_VERSION" ]; then
  echo "❌ Failed to fetch the latest NVM version." >&2
  exit 1
fi

# Install NVM
echo "⬇️  Installing NVM $NVM_VERSION..."
curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
. "$NVM_DIR/nvm.sh"

# Install Node
echo "⬇️  Installing Node.js v${NODE_VERSION}..."
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use default

# Create symlink for direct Node binary access
echo "🔗 Creating symlink for Node binaries..."
LATEST_NODE_DIR=$(ls -1 "$NVM_DIR/versions/node" | sort -V | tail -n1)
ln -sf "$NVM_DIR/versions/node/$LATEST_NODE_DIR/bin" "$SYMLINK_DIR"

# Add to .bashrc if not already present
if ! grep -q 'export PATH="$HOME/nvm:$PATH"' "$HOME/.bashrc"; then
  echo 'export PATH="$HOME/nvm:$PATH"' >>"$HOME/.bashrc"
fi

echo "✅ NVM + Node setup complete!"
