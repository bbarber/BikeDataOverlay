using System.Runtime.InteropServices;

namespace BikeDataApi.Services.Bluetooth.Abstractions;

public interface IPlatformBluetoothFactory
{
    IBleDeviceScanner CreateDeviceScanner();
    bool IsPlatformSupported { get; }
    OSPlatform SupportedPlatform { get; }
}