using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BikeDataApi.Models;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth.Abstractions;

public interface IBluetoothService : IDisposable
{
    bool IsConnected { get; }
    string? ConnectedDeviceName { get; }
    IReadOnlyDictionary<string, IBleDevice> ConnectedDevices { get; }
    
    event EventHandler<CyclingMetrics>? MetricsUpdated;
    event EventHandler<bool>? ConnectionStatusChanged;
    
    Task<bool> ScanAndConnectAsync(CancellationToken cancellationToken = default);
    Task<bool> ConnectToDeviceAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<List<IBleDevice>> ScanForDevicesAsync(TimeSpan? timeout = null);
    Task DisconnectAsync();
    
    CyclingMetrics GetCurrentMetrics();
}