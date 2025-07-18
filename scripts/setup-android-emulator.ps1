# Android Emulator Setup Script for StackScribe
# Run this script to set up and launch Android emulator

param(
    [string]$Action = "setup",
    [string]$Device = "pixel_7"
)

# Define Android SDK path
$AndroidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$EmulatorPath = "$AndroidSdkPath\emulator"
$AvdManagerPath = "$AndroidSdkPath\cmdline-tools\latest\bin\avdmanager.bat"

Write-Host "🤖 StackScribe Android Emulator Manager" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Android SDK is installed
if (-not (Test-Path $AndroidSdkPath)) {
    Write-Host "❌ Android SDK not found at: $AndroidSdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio first: https://developer.android.com/studio" -ForegroundColor Yellow
    exit 1
}

# Set environment variables for this session
$env:ANDROID_HOME = $AndroidSdkPath
$env:ANDROID_SDK_ROOT = $AndroidSdkPath
$env:PATH += ";$AndroidSdkPath\tools;$AndroidSdkPath\platform-tools;$AndroidSdkPath\emulator"

Write-Host "✅ Android SDK found at: $AndroidSdkPath" -ForegroundColor Green

function Show-AvailableDevices {
    Write-Host "📱 Available AVDs:" -ForegroundColor Cyan
    & "$EmulatorPath\emulator.exe" -list-avds
}

function Create-AVD {
    param([string]$DeviceName)
    
    Write-Host "🛠️ Creating AVD: $DeviceName" -ForegroundColor Cyan
    
    # Create AVD using command line
    $createCommand = "echo 'no' | `"$AvdManagerPath`" create avd -n $DeviceName -k `"system-images;android-34;google_apis;x86_64`" -d `"pixel_7`""
    
    Write-Host "Running: $createCommand" -ForegroundColor Gray
    Invoke-Expression $createCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AVD '$DeviceName' created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create AVD. Try creating it manually in Android Studio." -ForegroundColor Red
    }
}

function Start-Emulator {
    param([string]$DeviceName)
    
    Write-Host "🚀 Starting emulator: $DeviceName" -ForegroundColor Cyan
    
    # Start emulator in background
    Start-Process -FilePath "$EmulatorPath\emulator.exe" -ArgumentList "-avd", $DeviceName, "-no-snapshot-save", "-wipe-data" -NoNewWindow
    
    Write-Host "✅ Emulator starting... This may take a few minutes." -ForegroundColor Green
    Write-Host "💡 You can now run: npm run tauri android dev" -ForegroundColor Yellow
}

function Install-SystemImage {
    Write-Host "📦 Installing Android system image..." -ForegroundColor Cyan
    
    $sdkManagerPath = "$AndroidSdkPath\cmdline-tools\latest\bin\sdkmanager.bat"
    if (Test-Path $sdkManagerPath) {
        & "$sdkManagerPath" "system-images;android-34;google_apis;x86_64"
        & "$sdkManagerPath" "platforms;android-34"
        & "$sdkManagerPath" "build-tools;34.0.0"
    } else {
        Write-Host "❌ SDK Manager not found. Please install Android Studio command line tools." -ForegroundColor Red
    }
}

# Main script logic
switch ($Action.ToLower()) {
    "setup" {
        Write-Host "🔧 Setting up Android emulator..." -ForegroundColor Cyan
        Install-SystemImage
        Create-AVD -DeviceName $Device
        Write-Host "✅ Setup complete! Run with -Action start to launch emulator." -ForegroundColor Green
    }
    "start" {
        Show-AvailableDevices
        Start-Emulator -DeviceName $Device
    }
    "list" {
        Show-AvailableDevices
    }
    "install" {
        Install-SystemImage
    }
    default {
        Write-Host "Usage: .\setup-android-emulator.ps1 -Action [setup|start|list|install] -Device [device_name]" -ForegroundColor Yellow
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\setup-android-emulator.ps1 -Action setup" -ForegroundColor Gray
        Write-Host "  .\setup-android-emulator.ps1 -Action start" -ForegroundColor Gray
        Write-Host "  .\setup-android-emulator.ps1 -Action list" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "  npm run tauri android dev    - Run app in development mode" -ForegroundColor Gray
Write-Host "  npm run tauri android build  - Build APK" -ForegroundColor Gray
Write-Host "  adb devices                  - List connected devices" -ForegroundColor Gray 