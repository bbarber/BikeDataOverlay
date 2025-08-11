using Microsoft.AspNetCore.Mvc;
using BikeDataApi.Models;
using BikeDataApi.Services;

namespace BikeDataApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private static readonly Random _random = new();
    private readonly BluetoothTrainerService _bluetoothService;
    
    public MetricsController(BluetoothTrainerService bluetoothService)
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
        
        // Fallback to mock data when not connected
        return new CyclingMetrics
        {
            Watts = 150 + _random.Next(-30, 50),
            Cadence = 85 + _random.Next(-10, 15),
            Speed = 25.5 + _random.NextDouble() * 5,
            HeartRate = 140 + _random.Next(-15, 25)
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
}