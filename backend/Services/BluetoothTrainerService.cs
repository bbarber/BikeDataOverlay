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
            Console.WriteLine("=== FTMS Trainer Connection Simulation ===");
            Console.WriteLine("NOTE: Real BLE implementation requires platform-specific libraries.");
            Console.WriteLine("This simulation demonstrates FTMS protocol data structures.");
            Console.WriteLine();
            
            // Ensure we're not already connected
            if (_isConnected)
            {
                Console.WriteLine("Already connected to a trainer");
                return true;
            }

            Console.WriteLine("Simulating BLE scan for FTMS devices...");
            await Task.Delay(1000, cancellationToken); // Simulate scanning time
            
            Console.WriteLine("Found simulated FTMS device: Wahoo KICKR CORE (RSSI: -45 dBm)");
            await Task.Delay(500, cancellationToken);
            
            Console.WriteLine("Connecting to simulated trainer...");
            await Task.Delay(1000, cancellationToken); // Simulate connection time
            
            // Create simulated device information using real FTMS structures
            _deviceInfo = new DeviceInformation
            {
                ManufacturerName = "Wahoo Fitness",
                ModelNumber = "KICKR CORE",
                SerialNumber = "WF-KC-2024-001",
                FirmwareRevision = "4.2.1",
                MachineType = FitnessMachineType.IndoorBike,
                SupportedFeatures = FitnessMachineFeatures.PowerMeasurementSupported |
                                   FitnessMachineFeatures.CadenceSupported |
                                   FitnessMachineFeatures.ResistanceLevelSupported
            };
            
            _connectedDeviceName = $"{_deviceInfo.ManufacturerName} {_deviceInfo.ModelNumber}";
            Console.WriteLine($"Device Info - {_connectedDeviceName} (FW: {_deviceInfo.FirmwareRevision})");
            Console.WriteLine($"Supported FTMS Features: Power={_deviceInfo.SupportsFeature(FitnessMachineFeatures.PowerMeasurementSupported)}, " +
                             $"Cadence={_deviceInfo.SupportsFeature(FitnessMachineFeatures.CadenceSupported)}");
            
            // Start receiving simulated FTMS data
            StartFtmsDataSimulation();
            
            _isConnected = true;
            ConnectionStatusChanged?.Invoke(this, true);
            Console.WriteLine($"Successfully connected to simulated FTMS trainer: {_connectedDeviceName}");
            Console.WriteLine("Receiving realistic FTMS Indoor Bike Data...");
            
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Connection failed: {ex.Message}");
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
    
    private void CheckConnection(object? state)
    {
        // Connection status is maintained internally for now
        // In a real implementation, this would check the actual Bluetooth connection
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
                Console.WriteLine($"Disconnecting from simulated trainer: {_connectedDeviceName}");
                
                _isConnected = false;
                _connectedDeviceName = null;
                _deviceInfo = null;
                
                // Simulate disconnect time
                await Task.Delay(300);
                
                ConnectionStatusChanged?.Invoke(this, false);
                Console.WriteLine("Simulated trainer disconnected successfully");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Disconnect error: {ex.Message}");
        }
    }
    
    public void Dispose()
    {
        try
        {
            _connectionCheckTimer?.Dispose();
            
            // Disconnect from any connected device
            if (_isConnected)
            {
                DisconnectAsync().Wait(TimeSpan.FromSeconds(2));
            }
            
            _isConnected = false;
            Console.WriteLine("BluetoothTrainerService disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during BluetoothTrainerService disposal: {ex.Message}");
        }
    }
}