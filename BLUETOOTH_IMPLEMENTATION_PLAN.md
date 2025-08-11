# Bluetooth Low Energy Implementation Plan for BikeDataOverlay

## Current State Analysis

The application currently has:
- ✅ A mock `BluetoothTrainerService` with simulated data
- ✅ Complete API controller endpoints for connection management
- ✅ Event-driven architecture for metrics updates
- ✅ Frontend consuming real-time data from the backend

## Bluetooth Protocol Requirements

### Primary Protocol to Implement

**Fitness Machine Service (FTMS)** 
- Service UUID: `0x1826`
- Modern standard for smart trainers
- Provides comprehensive cycling data and trainer control

### Key GATT Characteristics to Implement

**FTMS Service:**
- `0x2ACC` - Fitness Machine Feature (read)
- `0x2ADA` - Fitness Machine Status (notify)
- `0x2AD9` - Fitness Machine Control Point (write/indicate)
- `0x2AD3` - Training Status (read/notify)
- `0x2AD2` - Indoor Bike Data (notify)

## Implementation Architecture

### 1. NuGet Dependencies to Add (Cross-Platform)
```xml
<PackageReference Include="InTheHand.BluetoothLE" Version="4.0.1" />
<PackageReference Include="System.Reactive" Version="*" />
```

**Alternative Cross-Platform Options:**
- **InTheHand.BluetoothLE**: Cross-platform BLE library supporting Windows, macOS, Linux
- **Plugin.BLE**: Xamarin-based cross-platform BLE (if using MAUI)
- **DotNetBlueZ**: Linux-specific option via BlueZ stack

### 2. New Service Classes Structure

```
backend/Services/
├── BluetoothTrainerService.cs (existing - to be refactored)
├── Bluetooth/
│   ├── IBleDevice.cs
│   ├── BleDeviceScanner.cs
│   ├── BleGattClient.cs
│   ├── Protocols/
│   │   ├── FitnessMachineService.cs
│   │   └── DeviceInformationService.cs
│   └── Models/
│       ├── BleServiceDefinitions.cs
│       └── TrainerData.cs
```

### 3. Core Implementation Steps

#### Phase 1: Bluetooth Infrastructure
1. **BLE Device Scanner**
   - Scan for devices advertising CPS or FTMS services
   - Filter by service UUIDs
   - Handle device discovery and connection management

2. **GATT Client Implementation**
   - Connect to discovered devices
   - Subscribe to notifications
   - Handle disconnections and reconnections

#### Phase 2: Protocol Implementation
1. **FTMS Service Client**
   - Parse indoor bike data (watts, cadence, speed, resistance)
   - Handle trainer control commands
   - Support resistance/power target setting
   - Implement proper data validation

#### Phase 3: Service Integration
1. **Refactor BluetoothTrainerService**
   - Replace mock implementation with real BLE
   - Maintain existing API contract
   - Add proper error handling and logging

## Detailed Implementation Plan

### Step 1: Create Bluetooth Infrastructure (Estimated: 2-3 hours)

**File: `backend/Services/Bluetooth/BleDeviceScanner.cs`**
- Use `InTheHand.BluetoothLE.Bluetooth` APIs for cross-platform support
- Scan for devices with FTMS (`0x1826`) service
- Implement device discovery events
- Handle platform-specific Bluetooth adapter access

**File: `backend/Services/Bluetooth/BleGattClient.cs`**
- Use `InTheHand.BluetoothLE` GATT APIs for cross-platform support
- Handle connection establishment and management
- Implement characteristic read/write/notify operations
- Abstract platform differences (Windows vs macOS)

### Step 2: Implement FTMS Protocol Parser (Estimated: 2-3 hours)

**File: `backend/Services/Bluetooth/Protocols/FitnessMachineService.cs`**
```csharp
// Indoor Bike Data parsing
// Speed: uint16 (0.01 km/h resolution)
// Cadence: uint16 (0.5 RPM resolution)  
// Resistance Level: sint16
// Power: sint16 (1 watt resolution)
```

### Step 3: Refactor BluetoothTrainerService (Estimated: 2-3 hours)

**Enhanced BluetoothTrainerService.cs:**
- Replace `StartSimulatedDataStream()` with real BLE connection
- Implement proper scanning with `ScanAndConnectAsync()`
- Add device-specific connection handling
- Maintain existing event-driven architecture

### Step 4: Add Configuration & Error Handling (Estimated: 1-2 hours)

**Configuration Options:**
- Preferred device types (CPS vs FTMS)
- Connection timeout settings  
- Auto-reconnection policies
- Logging levels

**Error Handling:**
- Bluetooth adapter not available
- Device out of range
- Connection drops during workout
- Invalid/corrupted data packets

### Step 5: Testing & Validation (Estimated: 2-3 hours)

**Unit Tests:**
- Protocol data parsing accuracy
- Device connection/disconnection flows
- Error condition handling

**Integration Tests:**
- Real device connectivity
- Data accuracy validation
- Performance under load

## Device Compatibility

### Supported Smart Trainers (FTMS)
- Wahoo KICKR series
- Tacx Neo series  
- Elite Direto/Drivo series
- Saris H3/M2
- Kurt Kinetic series
- CycleOps/Saris Magnus series

### Cross-Platform Considerations
**macOS:**
- Requires Bluetooth permissions in Info.plist
- Uses Core Bluetooth framework via InTheHand wrapper
- May require user permission prompts

**Windows:**
- Uses WinRT Bluetooth APIs via InTheHand wrapper
- Requires Windows 10+ for reliable BLE support
- May need Bluetooth capability in app manifest

## Configuration Files

### appsettings.json additions:
```json
{
  "Bluetooth": {
    "ScanTimeoutMs": 10000,
    "ConnectionTimeoutMs": 5000,
    "AutoReconnect": true,
    "PreferredProtocol": "FTMS",
    "LogLevel": "Information"
  }
}
```

## Rollout Strategy

### Phase 1 - Infrastructure (Week 1)
- Implement BLE scanning and connection
- Basic GATT operations
- Device discovery UI updates

### Phase 2 - Protocol Support (Week 2)  
- CPS implementation and testing
- FTMS implementation and testing
- Data validation and error handling

### Phase 3 - Integration (Week 3)
- Replace mock service with real implementation
- End-to-end testing with real devices
- Performance optimization

### Phase 4 - Polish (Week 4)
- Enhanced error messages and logging
- Configuration options
- Documentation and troubleshooting guides

## Success Metrics

- ✅ Successfully connects to real BLE cycling devices
- ✅ Accurately parses and displays power data
- ✅ Maintains stable connection during workouts
- ✅ Handles connection drops gracefully
- ✅ Supports multiple device types (trainers and power meters)
- ✅ Provides clear error messages for troubleshooting

## Risk Mitigation

### Technical Risks
1. **Cross-platform Bluetooth compatibility** - Test on both Windows and macOS
2. **Device-specific implementations** - Validate with popular trainer brands  
3. **Connection stability** - Implement robust reconnection logic
4. **Performance overhead** - Profile BLE operations impact
5. **Platform permissions** - Handle Bluetooth access permissions properly

### User Experience Risks
1. **Setup complexity** - Provide clear device pairing instructions
2. **Connection failures** - Implement helpful troubleshooting UI
3. **Data accuracy** - Validate against known-good sources

## Future Enhancements

- Multi-device support (power meter + heart rate monitor)
- Device-specific calibration routines
- Historical connection management
- Advanced trainer control (ERG mode, simulation parameters)
- Bluetooth 5.0+ features (improved range/reliability)