namespace BikeDataApi.Services.Bluetooth.Abstractions;

public interface IPlatformBluetoothResolver
{
    IPlatformBluetoothFactory GetPlatformFactory();
    IBleDeviceScanner CreateDeviceScanner();
}