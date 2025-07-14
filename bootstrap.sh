#!/usr/bin/env bash
# bootstrap.sh ── One-command setup for StackScribe
#
# Installs all language/toolchain dependencies and fetches build artifacts so that
# contributors can run the desktop app (& optional sync functions) immediately.
#
# Usage:  ./bootstrap.sh
# -----------------------------------------------------------------------------
set -euo pipefail

bold() { printf '\033[1m%s\033[0m\n' "$1"; }

bold "🔧 Installing JavaScript dependencies (root)…"
npm ci --no-fund --no-audit

bold "🔧 Installing JavaScript dependencies (stackscribe-functions)…"
pushd stackscribe-functions >/dev/null
npm ci --no-fund --no-audit
popd >/dev/null

bold "🦀 Ensuring Rust tool-chain (stable) is installed…"
if ! command -v rustup >/dev/null 2>&1; then
  bold "    rustup not found – installing…"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi
rustup toolchain install stable --profile minimal --component rust-analyzer --no-self-update

bold "📦 Pre-fetching Rust crates for Tauri app…"
cargo fetch --manifest-path src-tauri/Cargo.toml

bold "✅ Bootstrap complete"
cat <<EOF

Next steps:
  • Start local sync functions (optional):
        cd stackscribe-functions && npm start
  • Run the Tauri desktop app:
        npm run tauri dev
EOF
