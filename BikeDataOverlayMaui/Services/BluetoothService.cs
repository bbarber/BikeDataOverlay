using Plugin.BLE;
using Plugin.BLE.Abstractions.Contracts;
using Plugin.BLE.Abstractions.EventArgs;
using Plugin.BLE.Abstractions.Exceptions;
using BikeDataOverlayMaui.Models;
using System.Collections.ObjectModel;

namespace BikeDataOverlayMaui.Services;

public class BluetoothService : IBluetoothService
{
    private readonly IBluetoothLE _bluetoothLE;
    private readonly List<BluetoothDevice> _connectedDevices = new();
    private readonly List<ICharacteristic> _notificationCharacteristics = new();
    private CyclingMetrics _currentMetrics = new();
    private bool _isConnected = false;
    private string? _connectedDeviceName;
    
    // FTMS Service UUIDs
    private readonly Guid FitnessMachineServiceUuid = new("00001826-0000-1000-8000-00805f9b34fb");
    private readonly Guid IndoorBikeDataCharacteristicUuid = new("00002ad2-0000-1000-8000-00805f9b34fb");
    private readonly Guid HeartRateServiceUuid = new("0000180d-0000-1000-8000-00805f9b34fb");
    private readonly Guid HeartRateCharacteristicUuid = new("00002a37-0000-1000-8000-00805f9b34fb");
    
    public event EventHandler<CyclingMetrics>? MetricsUpdated;
    public event EventHandler<bool>? ConnectionStatusChanged;
    
    public bool IsConnected => _isConnected;
    public string? ConnectedDeviceName => _connectedDeviceName;
    public IReadOnlyList<BluetoothDevice> ConnectedDevices => _connectedDevices.AsReadOnly();

    public BluetoothService()
    {
        _bluetoothLE = CrossBluetoothLE.Current;
        _currentMetrics = new CyclingMetrics
        {
            Watts = 0,
            Cadence = 0,
            Speed = 0,
            HeartRate = 0,
            Timestamp = DateTime.UtcNow
        };
    }

    public async Task<bool> ScanAndConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            Console.WriteLine("=== MAUI Bluetooth FTMS Trainer Connection ===");
            
            if (_isConnected)
            {
                Console.WriteLine("Already connected to a trainer");
                return true;
            }

            await DisconnectAsync();

            Console.WriteLine("Scanning for FTMS devices...");
            var devices = await ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            
            if (!devices.Any())
            {
                Console.WriteLine("No FTMS devices found. Starting simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }

            // Try to connect to the first available device
            var device = devices.First();
            var connected = await ConnectToDeviceAsync(device.Id, cancellationToken);
            
            if (!connected)
            {
                Console.WriteLine("Failed to connect to any devices. Starting simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Real connection failed: {ex.Message}");
            Console.WriteLine("Starting simulation mode.");
            return await StartSimulationMode(cancellationToken);
        }
    }

    public async Task<List<BluetoothDevice>> ScanForDevicesAsync(TimeSpan? timeout = null)
    {
        var devices = new List<BluetoothDevice>();
        
        try
        {
            Console.WriteLine("Starting Bluetooth device scan...");
            
            var state = _bluetoothLE.State;
            if (state != BluetoothState.On)
            {
                Console.WriteLine($"Bluetooth is not on. Current state: {state}");
                return devices;
            }

            var adapter = _bluetoothLE.Adapter;
            var scanTimeout = timeout ?? TimeSpan.FromSeconds(10);

            var scanResults = new List<Plugin.BLE.Abstractions.Contracts.IDevice>();
            
            adapter.DeviceDiscovered += (s, e) =>
            {
                var device = e.Device;
                if (!string.IsNullOrEmpty(device.Name) && 
                    (device.Name.ToLower().Contains("trainer") || 
                     device.Name.ToLower().Contains("bike") ||
                     device.Name.ToLower().Contains("kickr") ||
                     device.Name.ToLower().Contains("zwift")))
                {
                    scanResults.Add(device);
                    Console.WriteLine($"Device discovered: {device.Name} (RSSI: {device.Rssi})");
                }
            };

            await adapter.StartScanningForDevicesAsync();
            
            // Wait for scan timeout
            await Task.Delay(scanTimeout);
            
            // Stop scanning
            await adapter.StopScanningForDevicesAsync();

            foreach (var result in scanResults)
            {
                devices.Add(new BluetoothDevice
                {
                    Id = result.Id.ToString(),
                    Name = result.Name ?? "Unknown Device",
                    DeviceType = "Fitness Device",
                    IsConnected = result.State == Plugin.BLE.Abstractions.DeviceState.Connected,
                    CanConnect = true,
                    Status = result.State == Plugin.BLE.Abstractions.DeviceState.Connected ? "Connected" : "Available",
                    LastSeen = DateTime.UtcNow,
                    DeviceInfo = new Models.DeviceInfo
                    {
                        Manufacturer = "Unknown",
                        Model = result.Name ?? "Unknown",
                        Type = "Fitness Device"
                    }
                });
            }
            
            Console.WriteLine($"Bluetooth scan finished. Found {devices.Count} fitness devices.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during Bluetooth scan: {ex.Message}");
        }
        
        return devices;
    }

    public async Task<bool> ConnectToDeviceAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            var adapter = _bluetoothLE.Adapter;
            var deviceGuid = Guid.Parse(deviceId);
            
            Console.WriteLine($"Attempting to connect to device: {deviceId}");
            
            var device = await adapter.ConnectToKnownDeviceAsync(deviceGuid, cancellationToken: cancellationToken);
            
            if (device == null || device.State != Plugin.BLE.Abstractions.DeviceState.Connected)
            {
                Console.WriteLine("Failed to connect to device");
                return false;
            }

            Console.WriteLine($"Successfully connected to: {device.Name}");
            
            // Get FTMS service
            var services = await device.GetServicesAsync();
            var ftmsService = services.FirstOrDefault(s => s.Id == FitnessMachineServiceUuid);
            
            if (ftmsService != null)
            {
                var characteristics = await ftmsService.GetCharacteristicsAsync();
                var indoorBikeChar = characteristics.FirstOrDefault(c => c.Id == IndoorBikeDataCharacteristicUuid);
                
                if (indoorBikeChar != null && indoorBikeChar.CanRead)
                {
                    indoorBikeChar.ValueUpdated += OnIndoorBikeDataReceived;
                    await indoorBikeChar.StartUpdatesAsync();
                    _notificationCharacteristics.Add(indoorBikeChar);
                    Console.WriteLine("Started notifications for Indoor Bike Data");
                }
            }

            // Get Heart Rate service
            var hrService = services.FirstOrDefault(s => s.Id == HeartRateServiceUuid);
            if (hrService != null)
            {
                var characteristics = await hrService.GetCharacteristicsAsync();
                var hrChar = characteristics.FirstOrDefault(c => c.Id == HeartRateCharacteristicUuid);
                
                if (hrChar != null && hrChar.CanRead)
                {
                    hrChar.ValueUpdated += OnHeartRateDataReceived;
                    await hrChar.StartUpdatesAsync();
                    _notificationCharacteristics.Add(hrChar);
                    Console.WriteLine("Started notifications for Heart Rate");
                }
            }

            var bluetoothDevice = new BluetoothDevice
            {
                Id = deviceId,
                Name = device.Name ?? "Unknown Device",
                DeviceType = "Fitness Device",
                IsConnected = true,
                Status = "Connected",
                LastSeen = DateTime.UtcNow
            };

            _connectedDevices.Add(bluetoothDevice);
            _connectedDeviceName = device.Name;
            _isConnected = true;
            
            ConnectionStatusChanged?.Invoke(this, true);
            Console.WriteLine($"Successfully connected to: {device.Name}");
            
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error connecting to device {deviceId}: {ex.Message}");
            return false;
        }
    }

    public async Task DisconnectAsync()
    {
        try
        {
            if (_isConnected)
            {
                Console.WriteLine($"Disconnecting from devices: {_connectedDeviceName}");
                
                // Stop all notifications
                foreach (var characteristic in _notificationCharacteristics)
                {
                    try
                    {
                        await characteristic.StopUpdatesAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error stopping updates for characteristic: {ex.Message}");
                    }
                }
                _notificationCharacteristics.Clear();

                var adapter = _bluetoothLE.Adapter;
                foreach (var device in adapter.ConnectedDevices)
                {
                    await adapter.DisconnectDeviceAsync(device);
                    Console.WriteLine($"Disconnected from {device.Name}");
                }
                
                _connectedDevices.Clear();
                _isConnected = false;
                _connectedDeviceName = null;
                
                ConnectionStatusChanged?.Invoke(this, false);
                Console.WriteLine("All devices disconnected successfully");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Disconnect error: {ex.Message}");
        }
    }

    public CyclingMetrics GetCurrentMetrics()
    {
        return new CyclingMetrics
        {
            Watts = _currentMetrics.Watts,
            Cadence = _currentMetrics.Cadence,
            Speed = _currentMetrics.Speed,
            HeartRate = _currentMetrics.HeartRate,
            Timestamp = _currentMetrics.Timestamp
        };
    }

    private Task<bool> StartSimulationMode(CancellationToken cancellationToken = default)
    {
        try
        {
            Console.WriteLine("Starting FTMS simulation mode...");
            
            _connectedDeviceName = "Simulated KICKR CORE";
            Console.WriteLine($"Simulation Device: {_connectedDeviceName}");
            
            // Start receiving simulated FTMS data
            StartFtmsDataSimulation();
            
            _isConnected = true;
            ConnectionStatusChanged?.Invoke(this, true);
            Console.WriteLine($"Successfully started simulation mode: {_connectedDeviceName}");
            
            return Task.FromResult(true);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Simulation mode failed: {ex.Message}");
            _isConnected = false;
            _connectedDeviceName = null;
            ConnectionStatusChanged?.Invoke(this, false);
            return Task.FromResult(false);
        }
    }

    private void StartFtmsDataSimulation()
    {
        Task.Run(async () =>
        {
            var random = new Random();
            var elapsedSeconds = 0;
            
            Console.WriteLine("Starting FTMS Indoor Bike Data simulation...");
            
            while (_isConnected)
            {
                try
                {
                    // Simulate realistic cycling workout data with variations
                    var workoutIntensity = 0.7 + 0.3 * Math.Sin(elapsedSeconds / 30.0);
                    
                    var basePower = 180 + (int)(50 * workoutIntensity);
                    var baseCadence = 85 + (int)(15 * workoutIntensity);
                    var baseSpeed = 28.0 + (8.0 * workoutIntensity);
                    
                    // Add realistic variations
                    var powerVariation = (int)(Math.Sin(elapsedSeconds / 10.0) * 15);
                    var cadenceVariation = (int)(Math.Cos(elapsedSeconds / 12.0) * 8);
                    var speedVariation = Math.Sin(elapsedSeconds / 15.0) * 3.0;
                    
                    _currentMetrics = new CyclingMetrics
                    {
                        Watts = Math.Max(0, basePower + powerVariation + random.Next(-8, 8)),
                        Cadence = Math.Max(0, baseCadence + cadenceVariation + random.Next(-3, 3)),
                        Speed = Math.Max(0, baseSpeed + speedVariation + random.NextDouble() * 2 - 1),
                        HeartRate = 135 + (int)(25 * workoutIntensity) + random.Next(-5, 8),
                        Timestamp = DateTime.UtcNow
                    };
                    
                    elapsedSeconds++;
                    MetricsUpdated?.Invoke(this, _currentMetrics);
                    
                    if (elapsedSeconds % 10 == 0)
                    {
                        Console.WriteLine($"Simulated Data - Power: {_currentMetrics.Watts}W, " +
                                        $"Cadence: {_currentMetrics.Cadence}RPM, " +
                                        $"Speed: {_currentMetrics.Speed:F1}km/h, " +
                                        $"HR: {_currentMetrics.HeartRate}BPM");
                    }
                    
                    await Task.Delay(1000);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in FTMS data simulation: {ex.Message}");
                }
            }
            
            Console.WriteLine("FTMS data simulation stopped");
        });
    }

    private void OnIndoorBikeDataReceived(object? sender, CharacteristicUpdatedEventArgs e)
    {
        try
        {
            var data = e.Characteristic.Value;
            if (data != null && data.Length >= 4)
            {
                // Parse FTMS Indoor Bike Data (simplified)
                var flags = BitConverter.ToUInt16(data, 0);
                var dataIndex = 2;
                
                if ((flags & 0x01) != 0 && data.Length >= dataIndex + 2)
                {
                    _currentMetrics.Speed = BitConverter.ToUInt16(data, dataIndex) / 100.0;
                    dataIndex += 2;
                }
                
                if ((flags & 0x02) != 0 && data.Length >= dataIndex + 2)
                {
                    _currentMetrics.Cadence = BitConverter.ToUInt16(data, dataIndex) / 2.0;
                    dataIndex += 2;
                }
                
                if ((flags & 0x04) != 0 && data.Length >= dataIndex + 2)
                {
                    _currentMetrics.Watts = BitConverter.ToUInt16(data, dataIndex);
                    dataIndex += 2;
                }
                
                _currentMetrics.Timestamp = DateTime.UtcNow;
                MetricsUpdated?.Invoke(this, _currentMetrics);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing indoor bike data: {ex.Message}");
        }
    }

    private void OnHeartRateDataReceived(object? sender, CharacteristicUpdatedEventArgs e)
    {
        try
        {
            var data = e.Characteristic.Value;
            if (data != null && data.Length >= 2)
            {
                // Parse Heart Rate data
                var flags = data[0];
                var heartRate = (flags & 0x01) == 0 ? data[1] : BitConverter.ToUInt16(data, 1);
                
                _currentMetrics.HeartRate = heartRate;
                _currentMetrics.Timestamp = DateTime.UtcNow;
                MetricsUpdated?.Invoke(this, _currentMetrics);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing heart rate data: {ex.Message}");
        }
    }

    public void Dispose()
    {
        try
        {
            if (_isConnected)
            {
                DisconnectAsync().Wait(TimeSpan.FromSeconds(2));
            }
            
            _connectedDevices.Clear();
            _notificationCharacteristics.Clear();
            _isConnected = false;
            Console.WriteLine("BluetoothService disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during BluetoothService disposal: {ex.Message}");
        }
    }
}