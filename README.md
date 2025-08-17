# Bike Data Overlay

A cross-platform cycling data overlay application built with .NET MAUI, supporting macOS and Windows desktop platforms.

## Quick Start

```bash
cd BikeDataOverlayMaui
dotnet run -f net8.0-maccatalyst    # For macOS
dotnet run -f net8.0-windows10.0.19041.0    # For Windows
```

## Features

- **Real-time Cycling Metrics Display**:
  - Power (Watts)
  - Heart Rate (BPM) with zone indicators
  - Timer functionality

- **Bluetooth Connectivity**:
  - FTMS (Fitness Machine Service) device support
  - Heart Rate monitor integration
  - Device scanning and connection management

- **Heart Rate Zone Management**:
  - Configurable age and resting heart rate
  - 5-zone heart rate system
  - Visual feedback for target zone compliance

- **Cross-Platform Support**:
  - macOS (via Mac Catalyst)
  - Windows 10/11

## Architecture

- **Unified App**: .NET 8 MAUI cross-platform application
- **Platforms**: macOS (Mac Catalyst) and Windows desktop
- **Bluetooth**: Plugin.BLE for cross-platform BLE communication
- **UI Pattern**: MVVM with CommunityToolkit.Mvvm
- **Services**: Dependency injection for clean architecture

## Building and Running

### Prerequisites

- .NET 8 SDK
- Visual Studio 2022 or VS Code with MAUI extensions
- Xcode (for macOS builds)

### macOS

```bash
cd BikeDataOverlayMaui
dotnet build -f net8.0-maccatalyst
dotnet run -f net8.0-maccatalyst
```

### Windows

```bash
cd BikeDataOverlayMaui
dotnet build -f net8.0-windows10.0.19041.0
dotnet run -f net8.0-windows10.0.19041.0
```

## Project Structure

```
BikeDataOverlayMaui/
├── Models/              # Data models
├── Services/            # Business logic services
├── ViewModels/          # MVVM ViewModels
├── Views/               # UI Views
├── Converters/          # Value converters
└── Platforms/           # Platform-specific code
    ├── MacCatalyst/
    └── Windows/
```

For detailed documentation, see [BikeDataOverlayMaui/README.md](BikeDataOverlayMaui/README.md).