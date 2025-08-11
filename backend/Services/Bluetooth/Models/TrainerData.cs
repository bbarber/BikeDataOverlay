using System;
using BikeDataApi.Models;

namespace BikeDataApi.Services.Bluetooth.Models;

public class TrainerData
{
    public double Speed { get; set; } // km/h
    public int Cadence { get; set; } // RPM
    public int Power { get; set; } // Watts
    public int HeartRate { get; set; } // BPM
    public double Distance { get; set; } // meters
    public int ResistanceLevel { get; set; }
    public double ExpendedEnergy { get; set; } // calories
    public TimeSpan ElapsedTime { get; set; }
    public DateTime Timestamp { get; set; }
    public bool IsDataValid { get; set; }

    public TrainerData()
    {
        Timestamp = DateTime.UtcNow;
        IsDataValid = false;
    }

    public CyclingMetrics ToCyclingMetrics()
    {
        return new CyclingMetrics
        {
            Watts = Power,
            Cadence = Cadence,
            Speed = Speed,
            HeartRate = HeartRate,
            Timestamp = Timestamp
        };
    }
}

public class DeviceInformation
{
    public string ManufacturerName { get; set; } = string.Empty;
    public string ModelNumber { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public string FirmwareRevision { get; set; } = string.Empty;
    public FitnessMachineType MachineType { get; set; }
    public uint SupportedFeatures { get; set; }

    public bool SupportsFeature(uint feature)
    {
        return (SupportedFeatures & feature) == feature;
    }
}

public class BleConnectionEventArgs : EventArgs
{
    public bool IsConnected { get; }
    public string DeviceName { get; }
    public string? ErrorMessage { get; }

    public BleConnectionEventArgs(bool isConnected, string deviceName, string? errorMessage = null)
    {
        IsConnected = isConnected;
        DeviceName = deviceName;
        ErrorMessage = errorMessage;
    }
}

public class TrainerDataEventArgs : EventArgs
{
    public TrainerData Data { get; }

    public TrainerDataEventArgs(TrainerData data)
    {
        Data = data;
    }
}

// Indoor Bike Data flags (based on FTMS spec)
[Flags]
public enum IndoorBikeDataFlags : ushort
{
    MoreData = 0x0001,
    AverageSpeedPresent = 0x0002,
    InstantaneousCadencePresent = 0x0004,
    AverageCadencePresent = 0x0008,
    TotalDistancePresent = 0x0010,
    ResistanceLevelPresent = 0x0020,
    InstantaneousPowerPresent = 0x0040,
    AveragePowerPresent = 0x0080,
    ExpendedEnergyPresent = 0x0100,
    HeartRatePresent = 0x0200,
    MetabolicEquivalentPresent = 0x0400,
    ElapsedTimePresent = 0x0800,
    RemainingTimePresent = 0x1000
}