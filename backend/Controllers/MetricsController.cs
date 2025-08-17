using Microsoft.AspNetCore.Mvc;
using BikeDataApi.Models;
using BikeDataApi.Services;
using BikeDataApi.Services.Bluetooth.Abstractions;

namespace BikeDataApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private readonly IBluetoothService _bluetoothService;
    
    public MetricsController(IBluetoothService bluetoothService)
    {
        _bluetoothService = bluetoothService;
    }
    
    [HttpGet("current")]
    public ActionResult<CyclingMetrics> GetCurrentMetrics()
    {
        if (_bluetoothService.IsConnected)
        {
            return _bluetoothService.GetCurrentMetrics();
        }
        
        // Return empty/zero data when not connected to real device
        return new CyclingMetrics
        {
            Watts = 0,
            Cadence = 0,
            Speed = 0,
            HeartRate = 0
        };
    }
    
    [HttpGet("connection/status")]
    public ActionResult<object> GetConnectionStatus()
    {
        return new
        {
            IsConnected = _bluetoothService.IsConnected,
            DeviceName = _bluetoothService.ConnectedDeviceName,
            Timestamp = DateTime.UtcNow
        };
    }
    
    [HttpPost("connection/connect")]
    public async Task<ActionResult<object>> ConnectToTrainer()
    {
        try
        {
            var success = await _bluetoothService.ScanAndConnectAsync();
            return new
            {
                Success = success,
                IsConnected = _bluetoothService.IsConnected,
                DeviceName = _bluetoothService.ConnectedDeviceName,
                Message = success ? "Successfully connected to trainer" : "Failed to connect to trainer"
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Success = false,
                IsConnected = false,
                Message = $"Connection error: {ex.Message}"
            });
        }
    }

    [HttpPost("connection/connect/{deviceId}")]
    public async Task<ActionResult<object>> ConnectToSpecificDevice(string deviceId)
    {
        try
        {
            var success = await _bluetoothService.ConnectToDeviceAsync(deviceId);
            return new
            {
                Success = success,
                IsConnected = _bluetoothService.IsConnected,
                DeviceName = _bluetoothService.ConnectedDeviceName,
                ConnectedDevices = _bluetoothService.ConnectedDevices.Count,
                Message = success ? $"Successfully connected to device" : $"Failed to connect to device {deviceId}"
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Success = false,
                IsConnected = false,
                Message = $"Connection error: {ex.Message}"
            });
        }
    }
    
    [HttpPost("connection/disconnect")]
    public async Task<ActionResult<object>> DisconnectFromTrainer()
    {
        try
        {
            await _bluetoothService.DisconnectAsync();
            return new
            {
                Success = true,
                IsConnected = _bluetoothService.IsConnected,
                Message = "Disconnected from trainer"
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Success = false,
                Message = $"Disconnect error: {ex.Message}"
            });
        }
    }
    
    [HttpGet("devices/scan")]
    public async Task<ActionResult<object>> ScanForBluetoothDevices([FromQuery] int timeoutSeconds = 15)
    {
        try
        {
            var timeout = TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 5, 60));
            var devices = await _bluetoothService.ScanForDevicesAsync(timeout);
            
            return new
            {
                Success = true,
                DeviceCount = devices.Count,
                ScanTimeout = timeout.TotalSeconds,
                Devices = devices.Select(d => new
                {
                    Id = d.DeviceId,
                    Name = d.Name,
                    IsConnected = d.IsConnected,
                    DeviceType = "Fitness Device",
                    DeviceInfo = d.DeviceInfo != null ? new
                    {
                        d.DeviceInfo.ManufacturerName,
                        d.DeviceInfo.ModelNumber,
                        d.DeviceInfo.SerialNumber,
                        d.DeviceInfo.FirmwareRevision,
                        MachineType = d.DeviceInfo.MachineType.ToString()
                    } : null
                }).ToArray(),
                Message = $"Found {devices.Count} Bluetooth fitness devices"
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Success = false,
                DeviceCount = 0,
                ScanTimeout = timeoutSeconds,
                Devices = Array.Empty<object>(),
                Message = $"Scan error: {ex.Message}"
            });
        }
    }
    
    [HttpGet("devices/list")]
    public async Task<ActionResult<object>> ListAvailableDevices()
    {
        try
        {
            var devices = await _bluetoothService.ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            
            var deviceList = devices.Select(d => {
                var isConnected = _bluetoothService.ConnectedDevices.ContainsKey(d.DeviceId);
                return new
                {
                    Id = d.DeviceId,
                    Name = d.Name,
                    Type = "Fitness Device",
                    IsConnected = isConnected,
                    CanConnect = !isConnected,
                    Status = isConnected ? "Connected" : "Available",
                    LastSeen = DateTime.UtcNow,
                    DeviceInfo = d.DeviceInfo != null ? new
                    {
                        Manufacturer = d.DeviceInfo.ManufacturerName ?? "Unknown",
                        Model = d.DeviceInfo.ModelNumber ?? "Unknown",
                        Type = d.DeviceInfo.MachineType.ToString()
                    } : new
                    {
                        Manufacturer = "Unknown",
                        Model = "Unknown", 
                        Type = "Unknown"
                    }
                };
            }).ToArray();
            
            return new
            {
                Success = true,
                DeviceCount = deviceList.Length,
                Devices = deviceList,
                ScanTimestamp = DateTime.UtcNow,
                Message = deviceList.Length > 0 
                    ? $"Found {deviceList.Length} fitness devices" 
                    : "No fitness devices found. Make sure your devices are turned on and in pairing mode."
            };
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Success = false,
                DeviceCount = 0,
                Devices = Array.Empty<object>(),
                Message = $"Device listing error: {ex.Message}"
            });
        }
    }
}