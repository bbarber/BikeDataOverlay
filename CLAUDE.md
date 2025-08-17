# BikeDataOverlay Development Guide

## CORE PRINCIPLES

1. **Build Often**: `dotnet build` (MAUI unified app)
2. **Test Thoroughly**: Use real devices when possible, simulation fallback
3. **Track Progress**: Update todos throughout development
4. **Clean Commits**: Only commit working code, always push
5. **Cross-Platform**: Ensure compatibility on both macOS and Windows

## WORKFLOW

1. **Explore**: Read files, use Grep/Glob to understand codebase
2. **Plan**: Break tasks into todos, verify approach before coding
3. **Code**: Follow MVVM patterns, build frequently
4. **Test**: Verify on both target platforms
5. **Commit**: Verify builds pass, write descriptive messages

## PROJECT COMMANDS

```bash
# MAUI Application
cd BikeDataOverlayMaui

# Build for macOS
dotnet build -f net8.0-maccatalyst

# Build for Windows  
dotnet build -f net8.0-windows10.0.19041.0

# Run on macOS
dotnet run -f net8.0-maccatalyst

# Run on Windows
dotnet run -f net8.0-windows10.0.19041.0

# Clean build
dotnet clean
```

## ARCHITECTURE

- **Unified App**: .NET 8 MAUI cross-platform application
- **Platforms**: macOS (Mac Catalyst) and Windows desktop
- **Bluetooth**: Plugin.BLE for cross-platform BLE communication
- **UI Pattern**: MVVM with CommunityToolkit.Mvvm
- **Services**: Dependency injection for clean architecture

