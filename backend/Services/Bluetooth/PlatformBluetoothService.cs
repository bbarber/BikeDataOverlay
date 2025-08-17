using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BikeDataApi.Models;
using BikeDataApi.Services.Bluetooth.Abstractions;
using BikeDataApi.Services.Bluetooth.Models;
using BikeDataApi.Services.Bluetooth.Protocols;

namespace BikeDataApi.Services.Bluetooth;

public class PlatformBluetoothService : IBluetoothService
{
    private readonly IPlatformBluetoothResolver _bluetoothResolver;
    private readonly ConcurrentQueue<CyclingMetrics> _metricsQueue = new();
    private CyclingMetrics _currentMetrics = new();
    private readonly Timer _connectionCheckTimer;
    private bool _isConnected = false;
    private string? _connectedDeviceName;
    
    // FTMS simulation components
    private TrainerData _currentTrainerData = new();
    private DeviceInformation? _deviceInfo;
    
    // Real Bluetooth scanning components
    private IBleDeviceScanner? _deviceScanner;
    private readonly List<IBleDevice> _discoveredDevices = new();
    private readonly Dictionary<string, IBleDevice> _connectedDevices = new();
    
    public event EventHandler<CyclingMetrics>? MetricsUpdated;
    public event EventHandler<bool>? ConnectionStatusChanged;
    
    public bool IsConnected => _isConnected;
    public string? ConnectedDeviceName => _connectedDevices.Any() ? string.Join(", ", _connectedDevices.Values.Select(d => d.Name)) : _connectedDeviceName;
    public IReadOnlyDictionary<string, IBleDevice> ConnectedDevices => _connectedDevices;

    public PlatformBluetoothService(IPlatformBluetoothResolver bluetoothResolver)
    {
        _bluetoothResolver = bluetoothResolver ?? throw new ArgumentNullException(nameof(bluetoothResolver));
        _connectionCheckTimer = new Timer(CheckConnection, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));
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
            Console.WriteLine("=== Platform-Agnostic Bluetooth FTMS Trainer Connection ===");
            
            // Ensure we're not already connected
            if (_isConnected)
            {
                Console.WriteLine("Already connected to a trainer");
                return true;
            }

            // Disconnect any existing devices first
            if (_connectedDevices.Any())
            {
                await DisconnectAsync();
            }

            Console.WriteLine("Scanning for FTMS devices...");
            var devices = await ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            
            if (!devices.Any())
            {
                Console.WriteLine("No FTMS devices found. Falling back to simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }

            // Try to connect to all available devices
            var connectionResults = new List<bool>();
            foreach (var device in devices)
            {
                Console.WriteLine($"Attempting to connect to: {device.Name}");
                
                var connected = await device.ConnectAsync(cancellationToken);
                if (connected)
                {
                    _connectedDevices[device.DeviceId] = device;
                    _connectedDeviceName = ConnectedDeviceName; // Update combined name
                    
                    // Set up data reception from real device
                    device.DataReceived += OnRealDeviceDataReceived;
                    device.ConnectionChanged += OnDeviceConnectionChanged;
                    
                    Console.WriteLine($"Successfully connected to: {device.Name}");
                    connectionResults.Add(true);
                }
                else
                {
                    Console.WriteLine($"Failed to connect to: {device.Name}");
                    connectionResults.Add(false);
                }
            }

            // Check if any devices connected
            if (_connectedDevices.Any())
            {
                _isConnected = true;
                // Use device info from first connected device for compatibility
                _deviceInfo = _connectedDevices.Values.First().DeviceInfo;

                // Start notifications for all connected devices
                foreach (var device in _connectedDevices.Values)
                {
                    var notificationsStarted = await device.StartNotificationsAsync(cancellationToken);
                    if (!notificationsStarted)
                    {
                        Console.WriteLine($"Failed to start notifications for {device.Name}, but connection is established");
                    }
                    else
                    {
                        Console.WriteLine($"Started notifications for {device.Name}");
                    }
                }
                
                ConnectionStatusChanged?.Invoke(this, true);
                Console.WriteLine($"Successfully connected to {_connectedDevices.Count} device(s): {_connectedDeviceName}");
                
                return true;
            }
            else
            {
                Console.WriteLine("Failed to connect to any devices. Falling back to simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Real connection failed: {ex.Message}");
            Console.WriteLine("Falling back to simulation mode.");
            return await StartSimulationMode(cancellationToken);
        }
    }

    public async Task<List<IBleDevice>> ScanForDevicesAsync(TimeSpan? timeout = null)
    {
        try
        {
            Console.WriteLine("Starting platform-agnostic Bluetooth device scan...");
            Console.WriteLine($"Scan timeout: {timeout?.TotalSeconds ?? 15} seconds");
            
            // Properly dispose existing scanner if present to avoid conflicts
            if (_deviceScanner != null)
            {
                try
                {
                    if (_deviceScanner.IsScanning)
                    {
                        await _deviceScanner.StopScanAsync();
                    }
                    _deviceScanner.Dispose();
                }
                catch (Exception disposeEx)
                {
                    Console.WriteLine($"Warning: Error disposing previous scanner: {disposeEx.Message}");
                }
                _deviceScanner = null;
            }
            
            // Create a new scanner for this operation using the platform resolver
            _deviceScanner = _bluetoothResolver.CreateDeviceScanner();
            
            if (timeout.HasValue)
            {
                _deviceScanner.ScanTimeout = timeout.Value;
            }
            
            _discoveredDevices.Clear();
            
            var scanCompleted = false;
            var devicesFound = 0;
            string? errorMessage = null;
            
            // Set up event handlers
            _deviceScanner.DeviceDiscovered += (sender, e) =>
            {
                try
                {
                    _discoveredDevices.Add(e.Device);
                    Console.WriteLine($"Device discovered: {e.Device.Name} (Signal: {e.SignalStrength} dBm)");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error processing discovered device: {ex.Message}");
                }
            };
            
            _deviceScanner.ScanCompleted += (sender, e) =>
            {
                try
                {
                    devicesFound = e.DevicesFound;
                    errorMessage = e.ErrorMessage;
                    scanCompleted = true;
                    
                    if (!string.IsNullOrEmpty(e.ErrorMessage))
                    {
                        Console.WriteLine($"Scan completed with error: {e.ErrorMessage}");
                    }
                    else
                    {
                        Console.WriteLine($"Scan completed successfully. Found {devicesFound} devices.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in scan completed handler: {ex.Message}");
                    errorMessage = ex.Message;
                    scanCompleted = true;
                }
            };
            
            // Start scanning
            await _deviceScanner.StartScanAsync();
            
            // Wait for scan to complete
            var maxWaitTime = timeout ?? TimeSpan.FromSeconds(15);
            var waitStart = DateTime.UtcNow;
            
            while (!scanCompleted && DateTime.UtcNow - waitStart < maxWaitTime)
            {
                await Task.Delay(100);
            }
            
            // Ensure scan is stopped
            if (_deviceScanner?.IsScanning == true)
            {
                try
                {
                    await _deviceScanner.StopScanAsync();
                }
                catch (Exception stopEx)
                {
                    Console.WriteLine($"Warning: Error stopping scan: {stopEx.Message}");
                }
            }
            
            Console.WriteLine($"Platform-agnostic Bluetooth scan finished. Found {_discoveredDevices.Count} fitness devices.");
            
            // If we have an error, log it but return empty list instead of throwing
            if (!string.IsNullOrEmpty(errorMessage))
            {
                Console.WriteLine($"Bluetooth scan completed with error: {errorMessage}");
                return new List<IBleDevice>(); // Return empty list instead of throwing
            }
            
            return new List<IBleDevice>(_discoveredDevices);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during platform-agnostic Bluetooth scan: {ex.Message}");
            // Return empty list instead of throwing to be more graceful
            return new List<IBleDevice>();
        }
    }

    public async Task<bool> ConnectToDeviceAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        try
        {
            // First scan for devices to find the target device
            var devices = await ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            var targetDevice = devices.FirstOrDefault(d => d.DeviceId == deviceId);
            
            if (targetDevice == null)
            {
                Console.WriteLine($"Device with ID {deviceId} not found");
                return false;
            }
            
            // Check if already connected
            if (_connectedDevices.ContainsKey(deviceId))
            {
                Console.WriteLine($"Device {targetDevice.Name} is already connected");
                return true;
            }
            
            Console.WriteLine($"Attempting to connect to specific device: {targetDevice.Name}");
            
            var connected = await targetDevice.ConnectAsync(cancellationToken);
            if (connected)
            {
                _connectedDevices[deviceId] = targetDevice;
                _connectedDeviceName = ConnectedDeviceName; // Update combined name
                _isConnected = true;
                
                // Set up data reception
                targetDevice.DataReceived += OnRealDeviceDataReceived;
                targetDevice.ConnectionChanged += OnDeviceConnectionChanged;
                
                // Start notifications
                var notificationsStarted = await targetDevice.StartNotificationsAsync(cancellationToken);
                if (!notificationsStarted)
                {
                    Console.WriteLine($"Failed to start notifications for {targetDevice.Name}, but connection is established");
                }
                else
                {
                    Console.WriteLine($"Started notifications for {targetDevice.Name}");
                }
                
                ConnectionStatusChanged?.Invoke(this, true);
                Console.WriteLine($"Successfully connected to: {targetDevice.Name}");
                
                return true;
            }
            else
            {
                Console.WriteLine($"Failed to connect to: {targetDevice.Name}");
                return false;
            }
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
                
                // Disconnect all connected devices
                foreach (var device in _connectedDevices.Values.ToList())
                {
                    device.DataReceived -= OnRealDeviceDataReceived;
                    device.ConnectionChanged -= OnDeviceConnectionChanged;
                    await device.DisconnectAsync();
                    Console.WriteLine($"Disconnected from {device.Name}");
                }
                
                _connectedDevices.Clear();
                _isConnected = false;
                _connectedDeviceName = null;
                _deviceInfo = null;
                
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

    private async Task<bool> StartSimulationMode(CancellationToken cancellationToken = default)
    {
        try
        {
            Console.WriteLine("Starting FTMS simulation mode...");
            
            // Create simulated device information using real FTMS structures
            _deviceInfo = new DeviceInformation
            {
                ManufacturerName = "Simulated",
                ModelNumber = "KICKR CORE",
                SerialNumber = "SIM-KC-2024-001",
                FirmwareRevision = "4.2.1",
                MachineType = FitnessMachineType.IndoorBike,
                SupportedFeatures = FitnessMachineFeatures.PowerMeasurementSupported |
                                   FitnessMachineFeatures.CadenceSupported |
                                   FitnessMachineFeatures.ResistanceLevelSupported
            };
            
            _connectedDeviceName = $"{_deviceInfo.ManufacturerName} {_deviceInfo.ModelNumber}";
            Console.WriteLine($"Simulation Device Info - {_connectedDeviceName} (FW: {_deviceInfo.FirmwareRevision})");
            
            // Start receiving simulated FTMS data
            StartFtmsDataSimulation();
            
            _isConnected = true;
            ConnectionStatusChanged?.Invoke(this, true);
            Console.WriteLine($"Successfully started simulation mode: {_connectedDeviceName}");
            
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Simulation mode failed: {ex.Message}");
            _isConnected = false;
            _connectedDeviceName = null;
            ConnectionStatusChanged?.Invoke(this, false);
            return false;
        }
    }

    private void StartFtmsDataSimulation()
    {
        // Simulate receiving realistic FTMS Indoor Bike Data
        Task.Run(async () =>
        {
            var random = new Random();
            var elapsedSeconds = 0;
            var totalDistance = 0.0;
            
            Console.WriteLine("Starting FTMS Indoor Bike Data simulation...");
            
            while (_isConnected)
            {
                try
                {
                    // Simulate realistic cycling workout data with variations
                    var timeOfDay = DateTime.Now.TimeOfDay.TotalHours;
                    var workoutIntensity = 0.7 + 0.3 * Math.Sin(elapsedSeconds / 30.0); // Vary intensity over time
                    
                    var basePower = 180 + (int)(50 * workoutIntensity);
                    var baseCadence = 85 + (int)(15 * workoutIntensity);
                    var baseSpeed = 28.0 + (8.0 * workoutIntensity);
                    
                    // Add realistic variations
                    var powerVariation = (int)(Math.Sin(elapsedSeconds / 10.0) * 15);
                    var cadenceVariation = (int)(Math.Cos(elapsedSeconds / 12.0) * 8);
                    var speedVariation = Math.Sin(elapsedSeconds / 15.0) * 3.0;
                    
                    // Create realistic FTMS trainer data
                    _currentTrainerData = new TrainerData
                    {
                        Power = Math.Max(0, basePower + powerVariation + random.Next(-8, 8)),
                        Cadence = Math.Max(0, baseCadence + cadenceVariation + random.Next(-3, 3)),
                        Speed = Math.Max(0, baseSpeed + speedVariation + random.NextDouble() * 2 - 1),
                        HeartRate = 135 + (int)(25 * workoutIntensity) + random.Next(-5, 8),
                        ResistanceLevel = 5 + (int)(3 * workoutIntensity),
                        Distance = totalDistance,
                        ElapsedTime = TimeSpan.FromSeconds(elapsedSeconds),
                        ExpendedEnergy = elapsedSeconds * 0.5 + random.NextDouble() * 0.2, // Rough calorie estimation
                        Timestamp = DateTime.UtcNow,
                        IsDataValid = true
                    };
                    
                    // Update cumulative values
                    elapsedSeconds++;
                    totalDistance += (_currentTrainerData.Speed / 3600.0); // Convert km/h to distance per second
                    
                    // Convert to CyclingMetrics and trigger update
                    _currentMetrics = _currentTrainerData.ToCyclingMetrics();
                    MetricsUpdated?.Invoke(this, _currentMetrics);
                    
                    // Log realistic FTMS data occasionally
                    if (elapsedSeconds % 10 == 0)
                    {
                        Console.WriteLine($"FTMS Data - Power: {_currentTrainerData.Power}W, " +
                                        $"Cadence: {_currentTrainerData.Cadence}RPM, " +
                                        $"Speed: {_currentTrainerData.Speed:F1}km/h, " +
                                        $"Distance: {_currentTrainerData.Distance:F2}km, " +
                                        $"Time: {_currentTrainerData.ElapsedTime}");
                    }
                    
                    await Task.Delay(1000); // Update every second (realistic FTMS frequency)
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in FTMS data simulation: {ex.Message}");
                }
            }
            
            Console.WriteLine("FTMS data simulation stopped");
        });
    }

    private void OnRealDeviceDataReceived(object? sender, TrainerDataEventArgs e)
    {
        try
        {
            // Convert trainer data to cycling metrics
            _currentMetrics = e.Data.ToCyclingMetrics();
            MetricsUpdated?.Invoke(this, _currentMetrics);
            
            Console.WriteLine($"Real Device Data - Power: {e.Data.Power}W, " +
                            $"Cadence: {e.Data.Cadence}RPM, " +
                            $"Speed: {e.Data.Speed:F1}km/h");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing real device data: {ex.Message}");
        }
    }

    private void OnDeviceConnectionChanged(object? sender, BleConnectionEventArgs e)
    {
        try
        {
            if (!e.IsConnected && sender is IBleDevice device)
            {
                Console.WriteLine($"Device {e.DeviceName} disconnected: {e.ErrorMessage}");
                
                // Remove from connected devices
                var deviceToRemove = _connectedDevices.FirstOrDefault(kvp => kvp.Value == device);
                if (!deviceToRemove.Equals(default(KeyValuePair<string, IBleDevice>)))
                {
                    _connectedDevices.Remove(deviceToRemove.Key);
                    _connectedDeviceName = ConnectedDeviceName; // Update combined name
                }
                
                // Update connection status
                if (!_connectedDevices.Any())
                {
                    _isConnected = false;
                    _connectedDeviceName = null;
                    ConnectionStatusChanged?.Invoke(this, false);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error handling connection change: {ex.Message}");
        }
    }

    private void CheckConnection(object? state)
    {
        // Check if any connected devices are still connected
        var disconnectedDevices = new List<string>();
        
        foreach (var kvp in _connectedDevices.ToList())
        {
            if (!kvp.Value.IsConnected)
            {
                Console.WriteLine($"Device {kvp.Value.Name} connection lost, updating status");
                disconnectedDevices.Add(kvp.Key);
            }
        }
        
        // Remove disconnected devices
        foreach (var deviceId in disconnectedDevices)
        {
            _connectedDevices.Remove(deviceId);
        }
        
        // Update overall connection status
        if (!_connectedDevices.Any() && _isConnected)
        {
            _isConnected = false;
            _connectedDeviceName = null;
            ConnectionStatusChanged?.Invoke(this, false);
        }
        else if (_connectedDevices.Any())
        {
            _connectedDeviceName = ConnectedDeviceName; // Update combined name
        }
    }

    public void Dispose()
    {
        try
        {
            _connectionCheckTimer?.Dispose();
            _deviceScanner?.Dispose();
            
            // Disconnect from any connected device
            if (_isConnected)
            {
                DisconnectAsync().Wait(TimeSpan.FromSeconds(2));
            }
            
            // Dispose all connected devices specifically
            foreach (var device in _connectedDevices.Values.ToList())
            {
                device.DataReceived -= OnRealDeviceDataReceived;
                device.ConnectionChanged -= OnDeviceConnectionChanged;
                device.Dispose();
            }
            _connectedDevices.Clear();
            
            // Dispose discovered devices
            foreach (var device in _discoveredDevices)
            {
                device?.Dispose();
            }
            _discoveredDevices.Clear();
            
            _isConnected = false;
            Console.WriteLine("PlatformBluetoothService disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during PlatformBluetoothService disposal: {ex.Message}");
        }
    }
}