using System;
using System.Text;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth.Protocols;

public static class DeviceInformationService
{
    /// <summary>
    /// Parses manufacturer name from Device Information Service
    /// </summary>
    /// <param name="data">Raw bytes from manufacturer name characteristic</param>
    /// <returns>Manufacturer name as string</returns>
    public static string ParseManufacturerName(byte[] data)
    {
        if (data == null || data.Length == 0)
        {
            return string.Empty;
        }

        try
        {
            return Encoding.UTF8.GetString(data).Trim('\0');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing manufacturer name: {ex.Message}");
            return string.Empty;
        }
    }

    /// <summary>
    /// Parses model number from Device Information Service
    /// </summary>
    /// <param name="data">Raw bytes from model number characteristic</param>
    /// <returns>Model number as string</returns>
    public static string ParseModelNumber(byte[] data)
    {
        if (data == null || data.Length == 0)
        {
            return string.Empty;
        }

        try
        {
            return Encoding.UTF8.GetString(data).Trim('\0');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing model number: {ex.Message}");
            return string.Empty;
        }
    }

    /// <summary>
    /// Parses serial number from Device Information Service
    /// </summary>
    /// <param name="data">Raw bytes from serial number characteristic</param>
    /// <returns>Serial number as string</returns>
    public static string ParseSerialNumber(byte[] data)
    {
        if (data == null || data.Length == 0)
        {
            return string.Empty;
        }

        try
        {
            return Encoding.UTF8.GetString(data).Trim('\0');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing serial number: {ex.Message}");
            return string.Empty;
        }
    }

    /// <summary>
    /// Parses firmware revision from Device Information Service
    /// </summary>
    /// <param name="data">Raw bytes from firmware revision characteristic</param>
    /// <returns>Firmware revision as string</returns>
    public static string ParseFirmwareRevision(byte[] data)
    {
        if (data == null || data.Length == 0)
        {
            return string.Empty;
        }

        try
        {
            return Encoding.UTF8.GetString(data).Trim('\0');
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing firmware revision: {ex.Message}");
            return string.Empty;
        }
    }

    /// <summary>
    /// Creates a complete DeviceInformation object from individual characteristics
    /// </summary>
    public static DeviceInformation CreateDeviceInformation(
        byte[]? manufacturerData = null,
        byte[]? modelData = null,
        byte[]? serialData = null,
        byte[]? firmwareData = null,
        uint supportedFeatures = 0,
        FitnessMachineType machineType = FitnessMachineType.IndoorBike)
    {
        return new DeviceInformation
        {
            ManufacturerName = manufacturerData != null ? ParseManufacturerName(manufacturerData) : string.Empty,
            ModelNumber = modelData != null ? ParseModelNumber(modelData) : string.Empty,
            SerialNumber = serialData != null ? ParseSerialNumber(serialData) : string.Empty,
            FirmwareRevision = firmwareData != null ? ParseFirmwareRevision(firmwareData) : string.Empty,
            SupportedFeatures = supportedFeatures,
            MachineType = machineType
        };
    }
}