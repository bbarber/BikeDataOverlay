using BikeDataApi.Models;
using System.Collections.Concurrent;
using BikeDataApi.Services.Bluetooth;
using BikeDataApi.Services.Bluetooth.Models;
using BikeDataApi.Services.Bluetooth.Protocols;

namespace BikeDataApi.Services;

public class BluetoothTrainerService : IDisposable
{
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
    private IBleDevice? _connectedDevice;
    
    public event EventHandler<CyclingMetrics>? MetricsUpdated;
    public event EventHandler<bool>? ConnectionStatusChanged;
    
    public bool IsConnected => _isConnected;
    public string? ConnectedDeviceName => _connectedDeviceName;
    
    public BluetoothTrainerService()
    {
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
            Console.WriteLine("=== Real Bluetooth FTMS Trainer Connection ===");
            
            // Ensure we're not already connected
            if (_isConnected)
            {
                Console.WriteLine("Already connected to a trainer");
                return true;
            }

            // Disconnect any existing device first
            if (_connectedDevice != null)
            {
                await _connectedDevice.DisconnectAsync();
                _connectedDevice = null;
            }

            Console.WriteLine("Scanning for FTMS devices...");
            var devices = await ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            
            if (!devices.Any())
            {
                Console.WriteLine("No FTMS devices found. Falling back to simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }

            // Try to connect to the first available device
            var targetDevice = devices.First();
            Console.WriteLine($"Attempting to connect to: {targetDevice.Name}");
            
            var connected = await targetDevice.ConnectAsync(cancellationToken);
            if (!connected)
            {
                Console.WriteLine($"Failed to connect to {targetDevice.Name}. Falling back to simulation mode.");
                return await StartSimulationMode(cancellationToken);
            }

            _connectedDevice = targetDevice;
            _isConnected = true;
            _connectedDeviceName = targetDevice.Name;
            _deviceInfo = targetDevice.DeviceInfo;

            // Set up data reception from real device
            _connectedDevice.DataReceived += OnRealDeviceDataReceived;
            _connectedDevice.ConnectionChanged += OnDeviceConnectionChanged;

            // Start notifications for real data
            var notificationsStarted = await _connectedDevice.StartNotificationsAsync(cancellationToken);
            if (!notificationsStarted)
            {
                Console.WriteLine("Failed to start notifications, but connection is established");
            }
            
            ConnectionStatusChanged?.Invoke(this, true);
            Console.WriteLine($"Successfully connected to real FTMS trainer: {_connectedDeviceName}");
            
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Real connection failed: {ex.Message}");
            Console.WriteLine("Falling back to simulation mode.");
            return await StartSimulationMode(cancellationToken);
        }
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
            if (!e.IsConnected)
            {
                Console.WriteLine($"Device {e.DeviceName} disconnected: {e.ErrorMessage}");
                _isConnected = false;
                _connectedDeviceName = null;
                _connectedDevice = null;
                ConnectionStatusChanged?.Invoke(this, false);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error handling connection change: {ex.Message}");
        }
    }

    private void CheckConnection(object? state)
    {
        // Check if real device is still connected
        if (_connectedDevice != null && !_connectedDevice.IsConnected)
        {
            Console.WriteLine("Real device connection lost, updating status");
            _isConnected = false;
            _connectedDeviceName = null;
            _connectedDevice = null;
            ConnectionStatusChanged?.Invoke(this, false);
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
    
    public async Task DisconnectAsync()
    {
        try
        {
            if (_isConnected)
            {
                Console.WriteLine($"Disconnecting from trainer: {_connectedDeviceName}");
                
                // Disconnect real device if connected
                if (_connectedDevice != null)
                {
                    _connectedDevice.DataReceived -= OnRealDeviceDataReceived;
                    _connectedDevice.ConnectionChanged -= OnDeviceConnectionChanged;
                    await _connectedDevice.DisconnectAsync();
                    _connectedDevice = null;
                }
                
                _isConnected = false;
                _connectedDeviceName = null;
                _deviceInfo = null;
                
                ConnectionStatusChanged?.Invoke(this, false);
                Console.WriteLine("Trainer disconnected successfully");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Disconnect error: {ex.Message}");
        }
    }
    
    public async Task<List<IBleDevice>> ScanForDevicesAsync(TimeSpan? timeout = null)
    {
        try
        {
            Console.WriteLine("Starting Bluetooth device scan...");
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
            
            // Create a new scanner for this operation
            _deviceScanner = new WindowsBleDeviceScanner();
            
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
            
            Console.WriteLine($"Bluetooth scan finished. Found {_discoveredDevices.Count} fitness devices.");
            
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
            Console.WriteLine($"Error during Bluetooth scan: {ex.Message}");
            // Return empty list instead of throwing to be more graceful
            return new List<IBleDevice>();
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
            
            // Dispose the connected device specifically
            if (_connectedDevice != null)
            {
                _connectedDevice.DataReceived -= OnRealDeviceDataReceived;
                _connectedDevice.ConnectionChanged -= OnDeviceConnectionChanged;
                _connectedDevice.Dispose();
                _connectedDevice = null;
            }
            
            // Dispose discovered devices
            foreach (var device in _discoveredDevices)
            {
                device?.Dispose();
            }
            _discoveredDevices.Clear();
            
            _isConnected = false;
            Console.WriteLine("BluetoothTrainerService disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during BluetoothTrainerService disposal: {ex.Message}");
        }
    }
}