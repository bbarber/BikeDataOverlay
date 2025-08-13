using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Storage.Streams;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth;

public class WindowsBleDevice : IBleDevice
{
    private readonly ulong _bluetoothAddress;
    private BluetoothLEDevice? _device;
    private GattDeviceService? _fitnessMachineService;
    private GattDeviceService? _deviceInfoService;
    private GattCharacteristic? _indoorBikeDataCharacteristic;
    private bool _isConnected;
    private bool _notificationsStarted;

    public string DeviceId => _bluetoothAddress.ToString("X12");
    public string Name { get; }
    public bool IsConnected => _isConnected;
    public DeviceInformation? DeviceInfo { get; private set; }

    public event EventHandler<BleConnectionEventArgs>? ConnectionChanged;
    public event EventHandler<TrainerDataEventArgs>? DataReceived;

    public WindowsBleDevice(ulong bluetoothAddress, string name)
    {
        _bluetoothAddress = bluetoothAddress;
        Name = name;
    }

    public async Task<bool> ConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            Console.WriteLine($"Connecting to device: {Name} ({DeviceId})");

            // Get the BluetoothLEDevice from the address
            _device = await BluetoothLEDevice.FromBluetoothAddressAsync(_bluetoothAddress);
            
            if (_device == null)
            {
                Console.WriteLine("Failed to create BluetoothLEDevice");
                return false;
            }

            Console.WriteLine($"Device connection state: {_device.ConnectionStatus}");

            // Get GATT services
            var gattResult = await _device.GetGattServicesAsync();
            
            if (gattResult.Status != GattCommunicationStatus.Success)
            {
                Console.WriteLine($"Failed to get GATT services: {gattResult.Status}");
                return false;
            }

            Console.WriteLine($"Found {gattResult.Services.Count} GATT services");

            // Look for fitness machine service
            foreach (var service in gattResult.Services)
            {
                Console.WriteLine($"Service UUID: {service.Uuid}");
                
                if (service.Uuid == BleServiceDefinitions.FitnessMachineServiceUuid)
                {
                    _fitnessMachineService = service;
                    Console.WriteLine("Found Fitness Machine Service");
                }
                else if (service.Uuid == BleServiceDefinitions.DeviceInformationServiceUuid)
                {
                    _deviceInfoService = service;
                    Console.WriteLine("Found Device Information Service");
                }
            }

            // Read device information if available
            if (_deviceInfoService != null)
            {
                DeviceInfo = await ReadDeviceInformationAsync(cancellationToken);
            }

            _isConnected = true;
            ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(true, Name));
            
            Console.WriteLine($"Successfully connected to {Name}");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Connection failed: {ex.Message}");
            ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(false, Name, ex.Message));
            return false;
        }
    }

    public async Task DisconnectAsync()
    {
        try
        {
            Console.WriteLine($"Disconnecting from {Name}");

            await StopNotificationsAsync();

            _fitnessMachineService?.Dispose();
            _deviceInfoService?.Dispose();
            _device?.Dispose();

            _fitnessMachineService = null;
            _deviceInfoService = null;
            _device = null;
            _isConnected = false;

            ConnectionChanged?.Invoke(this, new BleConnectionEventArgs(false, Name));
            Console.WriteLine($"Disconnected from {Name}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Disconnect error: {ex.Message}");
        }
    }

    public async Task<bool> StartNotificationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_fitnessMachineService == null)
            {
                Console.WriteLine("No fitness machine service available for notifications");
                return false;
            }

            // Get the indoor bike data characteristic
            var characteristicsResult = await _fitnessMachineService.GetCharacteristicsForUuidAsync(BleServiceDefinitions.IndoorBikeDataCharacteristicUuid);
            
            if (characteristicsResult.Status != GattCommunicationStatus.Success || !characteristicsResult.Characteristics.Any())
            {
                Console.WriteLine("Indoor bike data characteristic not found");
                return false;
            }

            _indoorBikeDataCharacteristic = characteristicsResult.Characteristics.First();

            // Check if notifications are supported
            if (!_indoorBikeDataCharacteristic.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Notify))
            {
                Console.WriteLine("Indoor bike data characteristic doesn't support notifications");
                return false;
            }

            // Subscribe to value changed events
            _indoorBikeDataCharacteristic.ValueChanged += OnCharacteristicValueChanged;

            // Write to the client characteristic configuration descriptor to enable notifications
            var status = await _indoorBikeDataCharacteristic.WriteClientCharacteristicConfigurationDescriptorAsync(GattClientCharacteristicConfigurationDescriptorValue.Notify);
            
            if (status != GattCommunicationStatus.Success)
            {
                Console.WriteLine($"Failed to enable notifications: {status}");
                return false;
            }

            _notificationsStarted = true;
            Console.WriteLine("Successfully started notifications for indoor bike data");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to start notifications: {ex.Message}");
            return false;
        }
    }

    public async Task StopNotificationsAsync()
    {
        try
        {
            if (_indoorBikeDataCharacteristic != null && _notificationsStarted)
            {
                _indoorBikeDataCharacteristic.ValueChanged -= OnCharacteristicValueChanged;
                
                await _indoorBikeDataCharacteristic.WriteClientCharacteristicConfigurationDescriptorAsync(GattClientCharacteristicConfigurationDescriptorValue.None);
                
                _notificationsStarted = false;
                Console.WriteLine("Stopped notifications for indoor bike data");
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
            if (_deviceInfoService == null)
            {
                return null;
            }

            var deviceInfo = new DeviceInformation();

            // Read manufacturer name
            deviceInfo.ManufacturerName = await ReadStringCharacteristicAsync(_deviceInfoService, BleServiceDefinitions.ManufacturerNameCharacteristicUuid) ?? "Unknown";
            
            // Read model number
            deviceInfo.ModelNumber = await ReadStringCharacteristicAsync(_deviceInfoService, BleServiceDefinitions.ModelNumberCharacteristicUuid) ?? "Unknown";
            
            // Read serial number
            deviceInfo.SerialNumber = await ReadStringCharacteristicAsync(_deviceInfoService, BleServiceDefinitions.SerialNumberCharacteristicUuid) ?? "Unknown";
            
            // Read firmware revision
            deviceInfo.FirmwareRevision = await ReadStringCharacteristicAsync(_deviceInfoService, BleServiceDefinitions.FirmwareRevisionCharacteristicUuid) ?? "Unknown";

            // Set default values for FTMS-related fields
            deviceInfo.MachineType = FitnessMachineType.IndoorBike;
            deviceInfo.SupportedFeatures = FitnessMachineFeatures.PowerMeasurementSupported | 
                                          FitnessMachineFeatures.CadenceSupported | 
                                          FitnessMachineFeatures.ResistanceLevelSupported;

            Console.WriteLine($"Device Info - Manufacturer: {deviceInfo.ManufacturerName}, Model: {deviceInfo.ModelNumber}");
            
            return deviceInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to read device information: {ex.Message}");
            return null;
        }
    }

    private async Task<string?> ReadStringCharacteristicAsync(GattDeviceService service, Guid characteristicUuid)
    {
        try
        {
            var characteristicsResult = await service.GetCharacteristicsForUuidAsync(characteristicUuid);
            
            if (characteristicsResult.Status != GattCommunicationStatus.Success || !characteristicsResult.Characteristics.Any())
            {
                return null;
            }

            var characteristic = characteristicsResult.Characteristics.First();
            var readResult = await characteristic.ReadValueAsync();

            if (readResult.Status != GattCommunicationStatus.Success)
            {
                return null;
            }

            var reader = DataReader.FromBuffer(readResult.Value);
            var bytes = new byte[readResult.Value.Length];
            reader.ReadBytes(bytes);

            return Encoding.UTF8.GetString(bytes).Trim('\0');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading characteristic {characteristicUuid}: {ex.Message}");
            return null;
        }
    }

    private void OnCharacteristicValueChanged(GattCharacteristic sender, GattValueChangedEventArgs args)
    {
        try
        {
            // Parse the indoor bike data according to FTMS specification
            var reader = DataReader.FromBuffer(args.CharacteristicValue);
            
            // This is a simplified parser - real FTMS data parsing is more complex
            var trainerData = new TrainerData
            {
                Timestamp = DateTime.UtcNow,
                IsDataValid = true
            };

            // Note: This is a basic implementation. Real FTMS parsing requires
            // proper handling of flags and data field interpretation
            
            DataReceived?.Invoke(this, new TrainerDataEventArgs(trainerData));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing characteristic value: {ex.Message}");
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

            _fitnessMachineService?.Dispose();
            _deviceInfoService?.Dispose();
            _device?.Dispose();

            Console.WriteLine($"WindowsBleDevice {Name} disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error disposing WindowsBleDevice {Name}: {ex.Message}");
        }
    }
}