using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using InTheHand.Net.Bluetooth;
using InTheHand.Net.Bluetooth.Gatt;
using InTheHand.Net.Sockets;
using BikeDataApi.Services.Bluetooth.Models;
using BikeDataApi.Services.Bluetooth.Protocols;

namespace BikeDataApi.Services.Bluetooth;

/// <summary>
/// Real GATT client implementation using 32feet.NET for cross-platform BLE support
/// Supports Windows, macOS, and Linux
/// </summary>
public class Real32FeetGattClient : IBleDevice
{
    private BluetoothDeviceInfo? _deviceInfo;
    private GattDeviceService? _ftmsService;
    private GattCharacteristic? _indoorBikeDataCharacteristic;
    private GattCharacteristic? _ftmsFeatureCharacteristic;
    private bool _isConnected = false;
    private bool _disposed = false;

    public string DeviceId => _deviceInfo?.DeviceAddress.ToString() ?? "Unknown";
    public string Name => _deviceInfo?.DeviceName ?? "Unknown Device";
    public bool IsConnected => _isConnected;
    public DeviceInformation? DeviceInfo { get; private set; }

    public event EventHandler<BleConnectionEventArgs>? ConnectionChanged;
    public event EventHandler<TrainerDataEventArgs>? DataReceived;

    public Real32FeetGattClient(BluetoothDeviceInfo deviceInfo)
    {
        _deviceInfo = deviceInfo ?? throw new ArgumentNullException(nameof(deviceInfo));
    }

    public async Task<bool> ConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_isConnected || _deviceInfo == null)
            {
                return _isConnected;
            }

            Console.WriteLine($"Connecting to FTMS device: {Name} ({DeviceId})");

            // Create GATT client connection
            var gattClient = await BluetoothLEDevice.FromBluetoothAddressAsync(_deviceInfo.DeviceAddress);
            
            if (gattClient == null)
            {
                throw new InvalidOperationException("Failed to create GATT client connection");
            }

            // Discover FTMS service
            var servicesResult = await gattClient.GetGattServicesForUuidAsync(BleServiceDefinitions.FitnessMachineServiceUuid);
            
            if (servicesResult.Status != GattCommunicationStatus.Success || !servicesResult.Services.Any())
            {
                throw new InvalidOperationException("FTMS service not found on device");
            }

            _ftmsService = servicesResult.Services.First();
            Console.WriteLine("Connected to FTMS service");

            // Get Indoor Bike Data characteristic
            var characteristicsResult = await _ftmsService.GetCharacteristicsForUuidAsync(BleServiceDefinitions.IndoorBikeDataCharacteristicUuid);
            
            if (characteristicsResult.Status != GattCommunicationStatus.Success || !characteristicsResult.Characteristics.Any())
            {
                throw new InvalidOperationException("Indoor Bike Data characteristic not found");
            }

            _indoorBikeDataCharacteristic = characteristicsResult.Characteristics.First();
            Console.WriteLine("Found Indoor Bike Data characteristic");

            // Get FTMS Feature characteristic (optional)
            try
            {
                var featureResult = await _ftmsService.GetCharacteristicsForUuidAsync(BleServiceDefinitions.FitnessMachineFeatureCharacteristicUuid);
                if (featureResult.Status == GattCommunicationStatus.Success && featureResult.Characteristics.Any())
                {
                    _ftmsFeatureCharacteristic = featureResult.Characteristics.First();
                    Console.WriteLine("Found FTMS Feature characteristic");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"FTMS Feature characteristic not available: {ex.Message}");
            }

            _isConnected = true;
            ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(true, Name));
            Console.WriteLine($"Successfully connected to FTMS trainer: {Name}");

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error connecting to device {Name}: {ex.Message}");
            ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(false, Name, ex.Message));
            return false;
        }
    }

    public async Task DisconnectAsync()
    {
        try
        {
            if (_isConnected)
            {
                Console.WriteLine($"Disconnecting from FTMS trainer: {Name}");

                await StopNotificationsAsync();

                _ftmsService?.Dispose();
                _ftmsService = null;
                
                _isConnected = false;
                ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(false, Name));
                Console.WriteLine($"Disconnected from FTMS trainer: {Name}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error disconnecting from device {Name}: {ex.Message}");
        }
    }

    public async Task<bool> StartNotificationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_indoorBikeDataCharacteristic == null)
            {
                Console.WriteLine("Indoor Bike Data characteristic not available");
                return false;
            }

            Console.WriteLine("Starting Indoor Bike Data notifications...");

            // Check if notifications are supported
            var properties = _indoorBikeDataCharacteristic.CharacteristicProperties;
            if (!properties.HasFlag(GattCharacteristicProperties.Notify))
            {
                Console.WriteLine("Device does not support notifications for Indoor Bike Data");
                return false;
            }

            // Subscribe to value changed notifications
            _indoorBikeDataCharacteristic.ValueChanged += OnCharacteristicValueChanged;

            // Enable notifications by writing to CCCD (Client Characteristic Configuration Descriptor)
            var status = await _indoorBikeDataCharacteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                GattClientCharacteristicConfigurationDescriptorValue.Notify);

            if (status != GattCommunicationStatus.Success)
            {
                throw new InvalidOperationException($"Failed to enable notifications: {status}");
            }

            Console.WriteLine("Indoor Bike Data notifications started successfully");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error starting notifications: {ex.Message}");
            return false;
        }
    }

    public async Task StopNotificationsAsync()
    {
        try
        {
            if (_indoorBikeDataCharacteristic != null)
            {
                Console.WriteLine("Stopping Indoor Bike Data notifications...");

                // Disable notifications
                await _indoorBikeDataCharacteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.None);

                _indoorBikeDataCharacteristic.ValueChanged -= OnCharacteristicValueChanged;
                Console.WriteLine("Indoor Bike Data notifications stopped");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error stopping notifications: {ex.Message}");
        }
    }

    public async Task<DeviceInformation?> ReadDeviceInformationAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var deviceInfo = new DeviceInformation
            {
                ManufacturerName = _deviceInfo?.DeviceName ?? "Unknown",
                ModelNumber = "Smart Trainer",
                MachineType = FitnessMachineType.IndoorBike
            };

            // Read FTMS features if available
            if (_ftmsFeatureCharacteristic != null)
            {
                try
                {
                    var result = await _ftmsFeatureCharacteristic.ReadValueAsync();
                    if (result.Status == GattCommunicationStatus.Success)
                    {
                        var featureData = result.Value.ToArray();
                        deviceInfo.SupportedFeatures = FitnessMachineService.ParseFitnessMachineFeatures(featureData);
                        Console.WriteLine($"FTMS Features: 0x{deviceInfo.SupportedFeatures:X8}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Could not read FTMS features: {ex.Message}");
                }
            }

            DeviceInfo = deviceInfo;
            Console.WriteLine($"Device Info - {deviceInfo.ManufacturerName} {deviceInfo.ModelNumber}");
            return deviceInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading device information: {ex.Message}");
            return null;
        }
    }

    private void OnCharacteristicValueChanged(GattCharacteristic sender, GattValueChangedEventArgs args)
    {
        try
        {
            var data = args.CharacteristicValue.ToArray();
            if (data.Length > 0)
            {
                var trainerData = FitnessMachineService.ParseIndoorBikeData(data);
                
                if (trainerData.IsDataValid)
                {
                    DataReceived?.Invoke(this, new TrainerDataEventArgs(trainerData));
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing Indoor Bike Data: {ex.Message}");
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        try
        {
            DisconnectAsync().Wait(TimeSpan.FromSeconds(2));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during GATT client disposal: {ex.Message}");
        }

        _disposed = true;
    }
}

/// <summary>
/// GATT scanner for discovering FTMS devices using 32feet.NET
/// </summary>
public class Real32FeetDeviceScanner : IBleDeviceScanner
{
    private readonly List<IBleDevice> _discoveredDevices = new();
    private bool _isScanning = false;
    private bool _disposed = false;

    public bool IsScanning => _isScanning;
    public TimeSpan ScanTimeout { get; set; } = TimeSpan.FromSeconds(10);

    public event EventHandler<BleDeviceDiscoveredEventArgs>? DeviceDiscovered;
    public event EventHandler<BleScanCompleteEventArgs>? ScanCompleted;

    public async Task StartScanAsync(CancellationToken cancellationToken = default)
    {
        if (_isScanning)
        {
            throw new InvalidOperationException("Scan is already in progress");
        }

        try
        {
            _isScanning = true;
            _discoveredDevices.Clear();

            Console.WriteLine("Starting BLE scan for FTMS devices using 32feet.NET...");

            // Use 32feet.NET discovery for Bluetooth LE devices
            var bluetoothClient = new BluetoothClient();
            var devices = bluetoothClient.DiscoverDevices(255, true, false, true);

            var devicesFound = 0;

            await Task.Run(() =>
            {
                foreach (var device in devices)
                {
                    if (cancellationToken.IsCancellationRequested)
                        break;

                    try
                    {
                        // Check if device supports FTMS (this is a simplified check)
                        // In a full implementation, we'd need to connect and check services
                        if (!string.IsNullOrEmpty(device.DeviceName) && 
                            (device.DeviceName.ToLower().Contains("trainer") ||
                             device.DeviceName.ToLower().Contains("kickr") ||
                             device.DeviceName.ToLower().Contains("tacx") ||
                             device.DeviceName.ToLower().Contains("wahoo")))
                        {
                            var bleDevice = new Real32FeetGattClient(device);
                            _discoveredDevices.Add(bleDevice);

                            DeviceDiscovered?.Invoke(this, new BleDeviceDiscoveredEventArgs(bleDevice, -60)); // Default RSSI
                            Console.WriteLine($"Discovered potential FTMS device: {device.DeviceName} ({device.DeviceAddress})");
                            devicesFound++;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing device {device.DeviceName}: {ex.Message}");
                    }
                }
            }, cancellationToken);

            Console.WriteLine($"BLE scan completed. Found {devicesFound} potential FTMS devices.");
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(devicesFound));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during BLE scan: {ex.Message}");
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(0, ex.Message));
        }
        finally
        {
            _isScanning = false;
        }
    }

    public async Task StopScanAsync()
    {
        if (_isScanning)
        {
            _isScanning = false;
            await Task.Delay(100); // Give time for scan to stop
            Console.WriteLine("BLE scan stopped");
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        try
        {
            StopScanAsync().Wait(TimeSpan.FromSeconds(1));
            
            foreach (var device in _discoveredDevices)
            {
                device?.Dispose();
            }
            
            _discoveredDevices.Clear();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during scanner disposal: {ex.Message}");
        }

        _disposed = true;
    }
}