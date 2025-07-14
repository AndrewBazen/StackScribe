<#!
.SYNOPSIS
    One-command setup for StackScribe development (Windows / PowerShell).

.DESCRIPTION
    Installs Node dependencies, the Rust tool-chain, and pre-fetches crates so
    that contributors can immediately run the desktop app and optional sync
    functions.

    Usage:
        PS> .\bootstrap.ps1        # executes setup
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) {
    Write-Host "`e[1m$msg`e[0m"
}

Write-Info "🔧 Installing JavaScript dependencies (root)…"
npm ci --no-fund --no-audit

Write-Info "🔧 Installing JavaScript dependencies (stackscribe-functions)…"
Push-Location "stackscribe-functions"
npm ci --no-fund --no-audit
Pop-Location

Write-Info "🦀 Ensuring Rust tool-chain (stable) is installed…"
if (-not (Get-Command rustup -ErrorAction SilentlyContinue)) {
    Write-Info "    rustup not found – installing…"
    $rustupInstaller = "rustup-init.exe"
    Invoke-WebRequest "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/$rustupInstaller" -OutFile $rustupInstaller
    & .\$rustupInstaller -y --profile minimal | Out-Null
    Remove-Item .\$rustupInstaller
    $env:Path += ";$env:USERPROFILE\.cargo\bin"
}

& rustup toolchain install stable --profile minimal --component rust-analyzer --no-self-update

Write-Info "📦 Pre-fetching Rust crates for Tauri app…"
& cargo fetch --manifest-path .\src-tauri\Cargo.toml

Write-Info "✅ Bootstrap complete"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Start local sync functions (optional): cd stackscribe-functions && npm start"
Write-Host "  2. Run the Tauri desktop app: npm run tauri dev" 