# Cycling Statistics Overlay Application Plan

## Overview
Create a desktop overlay application that displays cycling statistics (starting with Watts) from a Bluetooth-connected smart trainer while allowing full-screen video playback underneath.

## Technology Stack

### Primary Framework
- **WPF (Windows Presentation Foundation)** - Best choice for overlay functionality with transparency support
- **.NET 8** - Latest LTS version for modern features and performance
- **C#** - Primary programming language

### Bluetooth Communication
- **Windows.Devices.Bluetooth** - Native Windows 10/11 Bluetooth Low Energy (BLE) API
- **InTheHand.BluetoothLE** - Cross-platform alternative if needed
- **ANT+ .NET SDK** - Alternative for ANT+ enabled trainers

### UI Framework
- **WPF with XAML** - Native transparency and overlay support
- **Skia-based rendering** - For smooth graphics if needed

## Architecture Components

### 1. Bluetooth Service Layer
- **BluetoothTrainerService**: Handles connection and communication with smart trainer
- **FitnessEquipmentProfile**: Implements Bluetooth FTMS (Fitness Machine Service) protocol
- **DataParser**: Converts raw Bluetooth data to structured cycling metrics

### 2. Data Layer
- **CyclingMetrics**: Model for power, cadence, speed, heart rate data
- **DataBuffer**: Circular buffer for real-time data smoothing
- **SessionRecorder**: Optional data logging for workout analysis

### 3. Overlay UI Layer
- **OverlayWindow**: Always-on-top transparent window
- **StatisticsDisplay**: Customizable UI components for metrics
- **PositionManager**: Handles overlay positioning and sizing

### 4. Configuration Layer
- **Settings**: User preferences, trainer pairing, display options
- **ThemeManager**: Dark/light themes, color schemes
- **HotkeyManager**: Global shortcuts for show/hide functionality

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create WPF application with transparent overlay window
2. Implement basic Bluetooth scanning and device discovery
3. Create simple Watts display UI component
4. Test overlay functionality over video applications

### Phase 2: Trainer Communication
1. Implement FTMS protocol for power data
2. Add connection management (auto-reconnect, error handling)
3. Implement data validation and smoothing algorithms
4. Add connection status indicators

### Phase 3: Enhanced UI
1. Create customizable display layouts
2. Add multiple positioning options (corners, edges)
3. Implement transparency and size controls
4. Add basic theming support

### Phase 4: Advanced Features
1. Add additional metrics (cadence, speed, heart rate)
2. Implement data logging and session recording
3. Add workout interval timer
4. Create configuration UI for settings

## Technical Considerations

### Overlay Implementation
- Use `WindowStyle="None"` and `AllowsTransparency="True"`
- Set `Topmost="True"` for always-on-top behavior
- Use `WindowState="Normal"` with manual positioning
- Handle window activation to prevent stealing focus

### Bluetooth Challenges
- Device pairing and authorization
- Connection stability and reconnection logic
- Battery level monitoring
- Multiple device support (trainer + heart rate monitor)

### Performance Optimization
- Minimize UI thread blocking with async Bluetooth operations
- Implement efficient data binding with INotifyPropertyChanged
- Use hardware acceleration for graphics rendering
- Optimize overlay redraw frequency

### User Experience
- Minimize resource usage when not actively displaying
- Provide visual feedback for connection status
- Implement graceful error handling and recovery
- Support global hotkeys for quick show/hide

## Development Tools & Dependencies

### NuGet Packages
- `Windows.Devices.Bluetooth` (Windows SDK)
- `System.Reactive` (Reactive Extensions for data streams)
- `Microsoft.Extensions.Configuration` (Settings management)
- `Microsoft.Extensions.Logging` (Logging framework)

### Development Environment
- Visual Studio 2022 or JetBrains Rider
- Windows 10/11 development machine
- Bluetooth-enabled development environment
- Smart trainer for testing (or Bluetooth simulator)

## Deployment Considerations

### Distribution
- Self-contained executable with .NET runtime included
- Windows Installer (MSI) package
- Optional Microsoft Store distribution

### System Requirements
- Windows 10 version 1903 or later (for Bluetooth LE support)
- .NET 8 Runtime
- Bluetooth 4.0+ adapter
- Compatible smart trainer with FTMS support

This plan provides a solid foundation for building a professional cycling statistics overlay application using .NET technologies.