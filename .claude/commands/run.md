# Run BikeDataOverlay MAUI App

Builds and runs the BikeDataOverlay MAUI application on the current platform.

## Usage
```
/run [platform] [options]
```

## Parameters
- `platform` (optional): Target platform (`mac` or `windows`). Auto-detects if not specified.
- `--build`: Force rebuild before running
- `--clean`: Clean build before running  
- `--release`: Run in release mode (default: debug)

## Examples
- `/run` - Run on current platform
- `/run mac` - Run on macOS
- `/run windows --build` - Build and run on Windows
- `/run --release` - Run release build

## Implementation
```bash
cd BikeDataOverlayMaui

# Auto-detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
    TARGET_FRAMEWORK="net8.0-maccatalyst"
else
    PLATFORM="windows" 
    TARGET_FRAMEWORK="net8.0-windows10.0.19041.0"
fi

# Override platform if specified
case "$1" in
    "mac")
        TARGET_FRAMEWORK="net8.0-maccatalyst"
        shift
        ;;
    "windows")
        TARGET_FRAMEWORK="net8.0-windows10.0.19041.0"
        shift
        ;;
esac

# Parse options
BUILD_CONFIG="Debug"
FORCE_BUILD=""
CLEAN_BUILD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            FORCE_BUILD="--force"
            shift
            ;;
        --clean)
            CLEAN_BUILD="true"
            shift
            ;;
        --release)
            BUILD_CONFIG="Release"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Clean if requested
if [[ "$CLEAN_BUILD" == "true" ]]; then
    echo "🧹 Cleaning build artifacts..."
    dotnet clean -f "$TARGET_FRAMEWORK" --configuration "$BUILD_CONFIG"
fi

# Build if requested
if [[ -n "$FORCE_BUILD" || "$CLEAN_BUILD" == "true" ]]; then
    echo "🔨 Building application..."
    dotnet build -f "$TARGET_FRAMEWORK" --configuration "$BUILD_CONFIG"
fi

# Run the application
echo "🚀 Launching BikeDataOverlay..."
echo "Framework: $TARGET_FRAMEWORK"
echo "Configuration: $BUILD_CONFIG"
dotnet run -f "$TARGET_FRAMEWORK" --configuration "$BUILD_CONFIG" --no-build
```