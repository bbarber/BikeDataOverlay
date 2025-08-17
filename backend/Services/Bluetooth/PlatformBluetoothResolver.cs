using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using BikeDataApi.Services.Bluetooth.Abstractions;
using BikeDataApi.Services.Bluetooth.Platforms;

namespace BikeDataApi.Services.Bluetooth;

public class PlatformBluetoothResolver : IPlatformBluetoothResolver
{
    private readonly List<IPlatformBluetoothFactory> _factories;
    private IPlatformBluetoothFactory? _selectedFactory;

    public PlatformBluetoothResolver()
    {
        _factories = new List<IPlatformBluetoothFactory>
        {
            new WindowsBluetoothFactory(),
            new MacOsBluetoothFactory()
        };
    }

    public IPlatformBluetoothFactory GetPlatformFactory()
    {
        if (_selectedFactory != null)
        {
            return _selectedFactory;
        }

        _selectedFactory = _factories.FirstOrDefault(f => f.IsPlatformSupported);
        
        if (_selectedFactory == null)
        {
            var currentPlatform = GetCurrentPlatform();
            throw new PlatformNotSupportedException(
                $"No Bluetooth implementation available for platform: {currentPlatform}. " +
                $"Supported platforms: {string.Join(", ", _factories.Select(f => f.SupportedPlatform))}");
        }

        Console.WriteLine($"Selected Bluetooth implementation for platform: {_selectedFactory.SupportedPlatform}");
        return _selectedFactory;
    }

    public IBleDeviceScanner CreateDeviceScanner()
    {
        return GetPlatformFactory().CreateDeviceScanner();
    }

    private static string GetCurrentPlatform()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return "Windows";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return "macOS";
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            return "Linux";
        
        return RuntimeInformation.OSDescription;
    }
}