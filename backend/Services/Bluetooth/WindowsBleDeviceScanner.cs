using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth;

public class WindowsBleDeviceScanner : IBleDeviceScanner
{
    private readonly BluetoothLEAdvertisementWatcher _watcher;
    private readonly Dictionary<ulong, IBleDevice> _discoveredDevices = new();
    private CancellationTokenSource? _scanCancellationTokenSource;
    private TaskCompletionSource<bool>? _scanCompletionSource;

    public bool IsScanning { get; private set; }
    public TimeSpan ScanTimeout { get; set; } = TimeSpan.FromSeconds(10);

    public event EventHandler<BleDeviceDiscoveredEventArgs>? DeviceDiscovered;
    public event EventHandler<BleScanCompleteEventArgs>? ScanCompleted;

    public WindowsBleDeviceScanner()
    {
        _watcher = new BluetoothLEAdvertisementWatcher
        {
            ScanningMode = BluetoothLEScanningMode.Active,
            AllowExtendedAdvertisements = true
        };

        // Don't filter by services initially - find all BLE devices
        // We'll filter later in the OnAdvertisementReceived method

        _watcher.Received += OnAdvertisementReceived;
        _watcher.Stopped += OnScanStopped;
    }

    public async Task StartScanAsync(CancellationToken cancellationToken = default)
    {
        if (IsScanning)
        {
            return;
        }

        try
        {
            Console.WriteLine("Starting Windows Bluetooth LE scan...");
            Console.WriteLine($"Scan timeout: {ScanTimeout.TotalSeconds} seconds");

            _discoveredDevices.Clear();
            _scanCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            _scanCompletionSource = new TaskCompletionSource<bool>();

            IsScanning = true;

            // Start the watcher
            _watcher.Start();

            // Set up timeout
            _ = Task.Delay(ScanTimeout, _scanCancellationTokenSource.Token)
                .ContinueWith(async _ =>
                {
                    if (IsScanning)
                    {
                        Console.WriteLine("Scan timeout reached");
                        await StopScanAsync();
                    }
                }, TaskScheduler.Default);

            Console.WriteLine("Bluetooth LE scan started successfully");
        }
        catch (Exception ex)
        {
            IsScanning = false;
            var errorMessage = $"Failed to start Bluetooth scan: {ex.Message}";
            Console.WriteLine(errorMessage);
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(0, errorMessage));
            throw;
        }
    }

    public async Task StopScanAsync()
    {
        if (!IsScanning)
        {
            return;
        }

        try
        {
            Console.WriteLine("Stopping Bluetooth LE scan...");
            
            _scanCancellationTokenSource?.Cancel();
            _watcher.Stop();

            IsScanning = false;
            
            var deviceCount = _discoveredDevices.Count;
            Console.WriteLine($"Bluetooth scan completed. Found {deviceCount} devices");
            
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(deviceCount));
            _scanCompletionSource?.SetResult(true);
        }
        catch (Exception ex)
        {
            IsScanning = false;
            var errorMessage = $"Error stopping Bluetooth scan: {ex.Message}";
            Console.WriteLine(errorMessage);
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(_discoveredDevices.Count, errorMessage));
            _scanCompletionSource?.SetException(ex);
        }
    }

    private async void OnAdvertisementReceived(BluetoothLEAdvertisementWatcher sender, BluetoothLEAdvertisementReceivedEventArgs args)
    {
        try
        {
            // Skip devices we've already discovered
            if (_discoveredDevices.ContainsKey(args.BluetoothAddress))
            {
                return;
            }

            // Try to get the device name
            var deviceName = args.Advertisement.LocalName;
            if (string.IsNullOrWhiteSpace(deviceName))
            {
                deviceName = $"Unknown Device ({args.BluetoothAddress:X12})";
            }

            Console.WriteLine($"Discovered BLE device: {deviceName} (Address: {args.BluetoothAddress:X12}, RSSI: {args.RawSignalStrengthInDBm} dBm)");

            // Log service UUIDs if available for debugging
            if (args.Advertisement.ServiceUuids.Any())
            {
                Console.WriteLine($"  Advertised Services: {string.Join(", ", args.Advertisement.ServiceUuids)}");
            }

            // Filter for fitness devices only
            if (!args.Advertisement.ServiceUuids.Any() || !BleServiceDefinitions.IsFitnessDevice(args.Advertisement.ServiceUuids))
            {
                Console.WriteLine($"  Skipping non-fitness device: {deviceName}");
                return;
            }

            var deviceType = BleServiceDefinitions.GetDeviceType(args.Advertisement.ServiceUuids);
            Console.WriteLine($"  Found fitness device: {deviceType}");

            var bleDevice = new WindowsBleDevice(args.BluetoothAddress, deviceName);
            _discoveredDevices[args.BluetoothAddress] = bleDevice;

            // Notify listeners
            DeviceDiscovered?.Invoke(this, new BleDeviceDiscoveredEventArgs(bleDevice, args.RawSignalStrengthInDBm));
            
            Console.WriteLine($"Added fitness device to discovered list: {deviceName} ({deviceType})");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error processing advertisement: {ex.Message}");
        }
    }

    private void OnScanStopped(BluetoothLEAdvertisementWatcher sender, BluetoothLEAdvertisementWatcherStoppedEventArgs args)
    {
        if (IsScanning)
        {
            Console.WriteLine($"Bluetooth scan stopped. Error: {args.Error}");
            IsScanning = false;
            
            var errorMessage = args.Error != BluetoothError.Success ? $"Scan stopped with error: {args.Error}" : null;
            ScanCompleted?.Invoke(this, new BleScanCompleteEventArgs(_discoveredDevices.Count, errorMessage));
        }
    }

    public void Dispose()
    {
        try
        {
            if (IsScanning)
            {
                StopScanAsync().Wait(TimeSpan.FromSeconds(2));
            }

            _scanCancellationTokenSource?.Dispose();
            _watcher?.Stop();
            
            // Dispose discovered devices
            foreach (var device in _discoveredDevices.Values)
            {
                device?.Dispose();
            }
            _discoveredDevices.Clear();

            Console.WriteLine("WindowsBleDeviceScanner disposed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error disposing WindowsBleDeviceScanner: {ex.Message}");
        }
    }
}