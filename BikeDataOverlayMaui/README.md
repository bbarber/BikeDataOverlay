# Bike Data Overlay - .NET MAUI

A cross-platform cycling data overlay application built with .NET MAUI, supporting macOS and Windows desktop platforms.

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

- **Frameless Window Design**:
  - Borderless overlay window (like Electron apps)
  - Always-on-top positioning
  - Draggable custom title bar
  - Minimize/restore functionality
  - Perfect for cycling app overlays

- **Cross-Platform Support**:
  - macOS (via Mac Catalyst)
  - Windows 10/11

## Architecture

This application replaces the previous Electron frontend + .NET backend architecture with a unified MAUI application that provides:

- Single codebase for multiple platforms
- Native Bluetooth access via Plugin.BLE
- MVVM pattern with CommunityToolkit.Mvvm
- Dependency injection for clean architecture

## Technology Stack

- **.NET 8 MAUI** - Cross-platform UI framework
- **Plugin.BLE** - Bluetooth Low Energy library
- **CommunityToolkit.Mvvm** - MVVM helpers and commands
- **CommunityToolkit.Maui** - Additional MAUI controls and converters

## Project Structure

```
BikeDataOverlayMaui/
├── Models/              # Data models
│   ├── CyclingMetrics.cs
│   ├── BluetoothDevice.cs
│   └── HeartRateZone.cs
├── Services/            # Business logic services
│   ├── IBluetoothService.cs
│   ├── BluetoothService.cs
│   ├── HeartRateZoneService.cs
│   └── TimerService.cs
├── ViewModels/          # MVVM ViewModels
│   └── MainViewModel.cs
├── Views/               # UI Views
│   └── MainPage.xaml
├── Converters/          # Value converters
│   └── ValueConverters.cs
└── Platforms/           # Platform-specific code
    ├── MacCatalyst/
    └── Windows/
```

## Building and Running

### Prerequisites

- .NET 8 SDK
- Visual Studio 2022 or VS Code with MAUI extensions
- Xcode (for macOS builds)

### macOS

```bash
dotnet build -f net8.0-maccatalyst
dotnet run -f net8.0-maccatalyst
```

### Windows

```bash
dotnet build -f net8.0-windows10.0.19041.0
dotnet run -f net8.0-windows10.0.19041.0
```

## Bluetooth Permissions

### macOS
The app requests Bluetooth permissions via Info.plist:
- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`

### Windows
Bluetooth capabilities are declared in Package.appxmanifest:
- `bluetooth`
- `bluetoothAdvertisementWatcher`
- `bluetooth.genericAttributeProfile`

## Features Migrated from Original App

All original features have been successfully migrated:

1. **Power Display** - Shows watts with device management panel
2. **Heart Rate Monitoring** - BPM display with zone configuration
3. **Timer Functionality** - Start/stop/reset with time tracking
4. **Bluetooth Device Management** - Scan, connect, and manage fitness devices
5. **Heart Rate Zone Configuration** - Age-based zone calculation with target selection
6. **Simulation Mode** - Falls back to simulated data when no devices are connected

## Development Notes

- The app uses Plugin.BLE for cross-platform Bluetooth functionality
- FTMS (Fitness Machine Service) protocols are implemented for trainer connectivity
- Heart rate zones use the Karvonen method for accurate calculation
- All UI is built with native MAUI controls for optimal performance
- Services are registered with dependency injection for testability

## Future Enhancements

- Speed and cadence display
- Workout session recording
- Data export capabilities
- Additional fitness device protocol support