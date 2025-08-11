using System;
using System.Threading;
using System.Threading.Tasks;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth;

public interface IBleDevice : IDisposable
{
    string DeviceId { get; }
    string Name { get; }
    bool IsConnected { get; }
    DeviceInformation? DeviceInfo { get; }

    event EventHandler<BleConnectionEventArgs> ConnectionChanged;
    event EventHandler<TrainerDataEventArgs> DataReceived;

    Task<bool> ConnectAsync(CancellationToken cancellationToken = default);
    Task DisconnectAsync();
    Task<bool> StartNotificationsAsync(CancellationToken cancellationToken = default);
    Task StopNotificationsAsync();
    Task<DeviceInformation?> ReadDeviceInformationAsync(CancellationToken cancellationToken = default);
}

public interface IBleDeviceScanner : IDisposable
{
    bool IsScanning { get; }
    TimeSpan ScanTimeout { get; set; }
    
    event EventHandler<BleDeviceDiscoveredEventArgs> DeviceDiscovered;
    event EventHandler<BleScanCompleteEventArgs> ScanCompleted;

    Task StartScanAsync(CancellationToken cancellationToken = default);
    Task StopScanAsync();
}

public class BleDeviceDiscoveredEventArgs : EventArgs
{
    public IBleDevice Device { get; }
    public int SignalStrength { get; }

    public BleDeviceDiscoveredEventArgs(IBleDevice device, int signalStrength)
    {
        Device = device;
        SignalStrength = signalStrength;
    }
}

public class BleScanCompleteEventArgs : EventArgs
{
    public int DevicesFound { get; }
    public string? ErrorMessage { get; }

    public BleScanCompleteEventArgs(int devicesFound, string? errorMessage = null)
    {
        DevicesFound = devicesFound;
        ErrorMessage = errorMessage;
    }
}