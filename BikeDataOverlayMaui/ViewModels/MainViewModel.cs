using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using BikeDataOverlayMaui.Models;
using BikeDataOverlayMaui.Services;
using System.Collections.ObjectModel;

namespace BikeDataOverlayMaui.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IBluetoothService _bluetoothService;
    private readonly IHeartRateZoneService _heartRateZoneService;
    private readonly ITimerService _timerService;
    
    [ObservableProperty]
    private double watts = 0;
    
    [ObservableProperty]
    private double heartRate = 0;
    
    [ObservableProperty]
    private string heartRateZoneText = "Zone 1";
    
    [ObservableProperty]
    private bool isHeartRateInZone = false;
    
    [ObservableProperty]
    private string totalTime = "00:00";
    
    [ObservableProperty]
    private bool isTimerRunning = false;
    
    [ObservableProperty]
    private bool hasElapsedTime = false;
    
    [ObservableProperty]
    private bool isDevicePanelVisible = false;
    
    [ObservableProperty]
    private bool isHrZonePanelVisible = false;
    
    [ObservableProperty]
    private bool isScanning = false;
    
    [ObservableProperty]
    private string deviceStatusText = "Ready to scan";
    
    [ObservableProperty]
    private string connectionStatus = "Not Connected";
    
    [ObservableProperty]
    private int userAge = 30;
    
    [ObservableProperty]
    private int restingHR = 60;
    
    [ObservableProperty]
    private int selectedTargetZone = 2;
    
    public ObservableCollection<BluetoothDevice> AvailableDevices { get; } = new();
    public ObservableCollection<HeartRateZone> HeartRateZones { get; } = new();

    public MainViewModel(IBluetoothService bluetoothService, IHeartRateZoneService heartRateZoneService, ITimerService timerService)
    {
        _bluetoothService = bluetoothService;
        _heartRateZoneService = heartRateZoneService;
        _timerService = timerService;
        
        // Subscribe to service events
        _bluetoothService.MetricsUpdated += OnMetricsUpdated;
        _bluetoothService.ConnectionStatusChanged += OnConnectionStatusChanged;
        _timerService.TimerUpdated += OnTimerUpdated;
        
        // Initialize heart rate zones
        LoadHeartRateConfig();
        UpdateHeartRateZones();
        
        // Initialize timer display
        UpdateTimerDisplay();
    }

    [RelayCommand]
    private void ToggleDevicePanel()
    {
        if (IsHrZonePanelVisible)
        {
            IsHrZonePanelVisible = false;
        }
        
        IsDevicePanelVisible = !IsDevicePanelVisible;
        
        if (IsDevicePanelVisible)
        {
            LoadDevicesCommand.Execute(null);
        }
    }

    [RelayCommand]
    private void ToggleHrZonePanel()
    {
        if (IsDevicePanelVisible)
        {
            IsDevicePanelVisible = false;
        }
        
        IsHrZonePanelVisible = !IsHrZonePanelVisible;
    }

    [RelayCommand]
    private async Task ScanDevices()
    {
        if (IsScanning) return;
        
        IsScanning = true;
        DeviceStatusText = "Scanning for Bluetooth devices...";
        
        try
        {
            var devices = await _bluetoothService.ScanForDevicesAsync(TimeSpan.FromSeconds(10));
            
            AvailableDevices.Clear();
            foreach (var device in devices)
            {
                AvailableDevices.Add(device);
            }
            
            DeviceStatusText = devices.Count > 0 
                ? $"Found {devices.Count} fitness devices" 
                : "No fitness devices found. Make sure your devices are turned on and in pairing mode.";
        }
        catch (Exception ex)
        {
            DeviceStatusText = $"Scan error: {ex.Message}";
        }
        finally
        {
            IsScanning = false;
        }
    }

    [RelayCommand]
    private async Task LoadDevices()
    {
        DeviceStatusText = "Loading device list...";
        
        try
        {
            var devices = await _bluetoothService.ScanForDevicesAsync(TimeSpan.FromSeconds(5));
            
            AvailableDevices.Clear();
            foreach (var device in devices)
            {
                AvailableDevices.Add(device);
            }
            
            if (_bluetoothService.IsConnected)
            {
                DeviceStatusText = $"Connected! Device: {_bluetoothService.ConnectedDeviceName}";
                ConnectionStatus = "Connected";
            }
            else
            {
                DeviceStatusText = devices.Count > 0 
                    ? $"Found {devices.Count} devices. Select one to connect." 
                    : "No devices found. Click 'Scan for Devices' to search.";
                ConnectionStatus = "Not Connected";
            }
        }
        catch (Exception)
        {
            DeviceStatusText = "Backend not available - click 'Scan for Devices' when ready";
            ConnectionStatus = "Error";
        }
    }

    [RelayCommand]
    private async Task ConnectToDevice(string deviceId)
    {
        if (string.IsNullOrEmpty(deviceId)) return;
        
        DeviceStatusText = "Connecting to device...";
        
        try
        {
            var success = await _bluetoothService.ConnectToDeviceAsync(deviceId);
            
            if (success)
            {
                DeviceStatusText = $"Connected! Device: {_bluetoothService.ConnectedDeviceName}";
                ConnectionStatus = "Connected";
                await LoadDevices(); // Refresh device list to show connection status
            }
            else
            {
                DeviceStatusText = "Connection failed";
                ConnectionStatus = "Connection Failed";
            }
        }
        catch (Exception ex)
        {
            DeviceStatusText = $"Connection error: {ex.Message}";
            ConnectionStatus = "Error";
        }
    }

    [RelayCommand]
    private void StartTimer()
    {
        _timerService.Start();
    }

    [RelayCommand]
    private void StopTimer()
    {
        _timerService.Stop();
    }

    [RelayCommand]
    private void ResetTimer()
    {
        _timerService.Reset();
    }

    [RelayCommand]
    private void UpdateHeartRateConfig()
    {
        _heartRateZoneService.UpdateConfig(UserAge, RestingHR, SelectedTargetZone);
        UpdateHeartRateZones();
    }

    [RelayCommand]
    private void SelectTargetZone(int zoneNumber)
    {
        SelectedTargetZone = zoneNumber;
        _heartRateZoneService.UpdateConfig(UserAge, RestingHR, SelectedTargetZone);
        UpdateHeartRateZones();
    }

    private void OnMetricsUpdated(object? sender, CyclingMetrics metrics)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            Watts = Math.Round(metrics.Watts);
            HeartRate = Math.Round(metrics.HeartRate);
            
            if (metrics.HeartRate > 0)
            {
                var zoneInfo = _heartRateZoneService.GetZoneForHeartRate(metrics.HeartRate);
                HeartRateZoneText = $"Zone {zoneInfo.Zone} ({zoneInfo.Name})";
                IsHeartRateInZone = zoneInfo.InTarget;
            }
            else
            {
                HeartRateZoneText = "Zone 1";
                IsHeartRateInZone = false;
            }
        });
    }

    private void OnConnectionStatusChanged(object? sender, bool isConnected)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            ConnectionStatus = isConnected ? "Connected" : "Not Connected";
            
            if (isConnected)
            {
                DeviceStatusText = $"Connected! Device: {_bluetoothService.ConnectedDeviceName}";
            }
            else
            {
                DeviceStatusText = "Device disconnected";
            }
        });
    }

    private void OnTimerUpdated(object? sender, TimeSpan elapsedTime)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            TotalTime = _timerService.FormattedTime;
            IsTimerRunning = _timerService.IsRunning;
            HasElapsedTime = elapsedTime.TotalSeconds > 0;
        });
    }

    private void LoadHeartRateConfig()
    {
        _heartRateZoneService.LoadConfig();
        var config = _heartRateZoneService.Config;
        UserAge = config.Age;
        RestingHR = config.RestingHR;
        SelectedTargetZone = config.TargetZone;
    }

    private void UpdateHeartRateZones()
    {
        HeartRateZones.Clear();
        foreach (var zone in _heartRateZoneService.Zones)
        {
            HeartRateZones.Add(zone);
        }
    }

    private void UpdateTimerDisplay()
    {
        TotalTime = _timerService.FormattedTime;
        IsTimerRunning = _timerService.IsRunning;
        HasElapsedTime = _timerService.ElapsedTime.TotalSeconds > 0;
    }
}