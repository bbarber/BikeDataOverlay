using System.Runtime.InteropServices;
using BikeDataApi.Services.Bluetooth.Abstractions;

namespace BikeDataApi.Services.Bluetooth.Platforms;

public class MacOsBluetoothFactory : IPlatformBluetoothFactory
{
    public OSPlatform SupportedPlatform => OSPlatform.OSX;
    
    public bool IsPlatformSupported => RuntimeInformation.IsOSPlatform(OSPlatform.OSX);

    public IBleDeviceScanner CreateDeviceScanner()
    {
        if (!IsPlatformSupported)
        {
            throw new PlatformNotSupportedException("macOS Bluetooth is only supported on macOS platform");
        }
        
        // TODO: Implement macOS-specific BLE scanner when ready
        throw new NotImplementedException("macOS Bluetooth support not yet implemented");
    }
}