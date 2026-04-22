#!/bin/bash
# =============================================================================
# VeilVote — VPS Setup Script (Ubuntu 22.04, 2+ cores, 8GB RAM)
# Installs: Rust, Solana CLI, Anchor, Docker, Arcium CLI
# =============================================================================

set -euo pipefail

echo "=========================================="
echo " VeilVote — VPS Toolchain Setup"
echo "=========================================="

# 1. System dependencies
echo "[1/8] Installing system dependencies..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  pkg-config build-essential libudev-dev libssl-dev \
  curl git ca-certificates gnupg

# 2. Rust
echo "[2/8] Installing Rust..."
if ! command -v rustc &> /dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
else
  echo "Rust already installed: $(rustc --version)"
fi

# 3. Solana CLI 2.3.0
echo "[3/8] Installing Solana CLI 2.3.0..."
if ! command -v solana &> /dev/null; then
  sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
  echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
else
  echo "Solana already installed: $(solana --version)"
fi

# 4. Generate Solana keypair (if needed)
echo "[4/8] Setting up Solana keypair..."
if [ ! -f "$HOME/.config/solana/id.json" ]; then
  solana-keygen new --no-passphrase
fi
solana config set --url https://api.devnet.solana.com

# 5. Anchor 0.32.1
echo "[5/8] Installing Anchor 0.32.1..."
if ! command -v anchor &> /dev/null; then
  cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1 --locked
else
  echo "Anchor already installed: $(anchor --version)"
fi

# 6. Yarn
echo "[6/8] Installing Yarn..."
if ! command -v yarn &> /dev/null; then
  npm install -g yarn
else
  echo "Yarn already installed: $(yarn --version)"
fi

# 7. Docker & Docker Compose
echo "[7/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
  sudo apt-get install -y docker.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "⚠️  You need to logout and login again for Docker permissions to take effect."
  echo "   Or run: newgrp docker"
else
  echo "Docker already installed: $(docker --version)"
fi

# 8. Arcium CLI
echo "[8/8] Installing Arcium CLI..."
if ! command -v arcium &> /dev/null; then
  curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash
  source "$HOME/.cargo/env"
  arcup install
else
  echo "Arcium already installed: $(arcium --version)"
fi

echo ""
echo "=========================================="
echo " ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Versions:"
echo "  Rust:    $(rustc --version 2>/dev/null || echo 'not found')"
echo "  Solana:  $(solana --version 2>/dev/null || echo 'not found')"
echo "  Anchor:  $(anchor --version 2>/dev/null || echo 'not found')"
echo "  Arcium:  $(arcium --version 2>/dev/null || echo 'not found')"
echo ""
echo "Next steps:"
echo "  1. cd /path/to/veilvote"
echo "  2. arcium build"
echo "  3. arcium test --cluster devnet"
echo "  4. arcium deploy"
echo ""
