using System.Runtime.InteropServices;
using BikeDataApi.Services.Bluetooth.Abstractions;

namespace BikeDataApi.Services.Bluetooth.Platforms;

public class WindowsBluetoothFactory : IPlatformBluetoothFactory
{
    public OSPlatform SupportedPlatform => OSPlatform.Windows;
    
    public bool IsPlatformSupported => RuntimeInformation.IsOSPlatform(OSPlatform.Windows);

    public IBleDeviceScanner CreateDeviceScanner()
    {
        if (!IsPlatformSupported)
        {
            throw new PlatformNotSupportedException("Windows Bluetooth is only supported on Windows platform");
        }
        
        return new WindowsBleDeviceScanner();
    }
}