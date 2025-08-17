namespace BikeDataOverlayMaui.Models;

public class BluetoothDevice
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "Fitness Device";
    public bool IsConnected { get; set; }
    public bool CanConnect { get; set; } = true;
    public string Status { get; set; } = "Available";
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    public DeviceInfo DeviceInfo { get; set; } = new();
}

public class DeviceInfo
{
    public string Manufacturer { get; set; } = "Unknown";
    public string Model { get; set; } = "Unknown";
    public string Type { get; set; } = "Unknown";
}