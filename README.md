# Bike Data Overlay

A cycling statistics overlay application built with Electron, featuring real-time Bluetooth Low Energy (BLE) connectivity for heart rate monitors and cycling power meters.

## Features

- **Real-time BLE connectivity** for heart rate monitors and cycling power meters
- **Transparent overlay window** showing watts, heart rate, and timer
- **Heart rate zone tracking** with configurable zones based on age and resting HR
- **Always-on-top positioning** with smart mouse event handling
- **Cross-platform support** (macOS, Linux, Windows)

## Quick Start

```bash
cd frontend
npm install
npm start
```

This will:
1. Install frontend dependencies (including BLE support)
2. Launch the Electron overlay window
3. Enable Bluetooth device scanning and connection

## Usage

### Connecting Devices
1. Click the settings gear icon to open the device panel
2. Click "Scan for Devices" to discover BLE fitness equipment
3. Click "Connect" on your heart rate monitor or power meter
4. Real-time data will appear in the overlay

### Heart Rate Zones
1. Click the target icon to configure HR zones
2. Set your age and resting heart rate
3. Choose your target training zone
4. The display will show current zone and highlight when you're in target

### Timer
- Use the timer controls to track your training sessions
- Start/pause/reset functionality with visual feedback

## Architecture

- **Frontend**: Electron with native BLE support via `@abandonware/noble`
- **BLE Service**: Main process BLE handling with IPC communication
- **UI**: Transparent overlay with device management panels
- **Data Flow**: BLE → Main Process → IPC → Renderer → Display

## Supported Devices

- **Heart Rate Monitors**: Any BLE device with Heart Rate Service (UUID: 180d)
- **Cycling Power Meters**: Any BLE device with Cycling Power Service (UUID: 1818)
- **Tested**: COOSPO H6 heart rate monitor

## Development

```bash
# Start with dev tools and live reload
npm run dev

# Run tests
npm test
npm run test:ui
```

## Dependencies

- **Electron**: Desktop app framework
- **@abandonware/noble**: Native BLE support
- **Playwright**: Testing framework
- **Lucide**: Icon library

## Next Steps

- Add cadence and speed metrics
- Implement overlay positioning controls
- Add data logging and export
- Support for multiple simultaneous devices