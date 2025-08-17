using BikeDataOverlayMaui.Models;

namespace BikeDataOverlayMaui.Services;

public interface IBluetoothService : IDisposable
{
    bool IsConnected { get; }
    string? ConnectedDeviceName { get; }
    IReadOnlyList<BluetoothDevice> ConnectedDevices { get; }
    
    event EventHandler<CyclingMetrics>? MetricsUpdated;
    event EventHandler<bool>? ConnectionStatusChanged;
    
    Task<bool> ScanAndConnectAsync(CancellationToken cancellationToken = default);
    Task<bool> ConnectToDeviceAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<List<BluetoothDevice>> ScanForDevicesAsync(TimeSpan? timeout = null);
    Task DisconnectAsync();
    
    CyclingMetrics GetCurrentMetrics();
}