using System;
using System.Linq;

namespace BikeDataApi.Services.Bluetooth.Models;

public static class BleServiceDefinitions
{
    // Fitness Equipment Services
    public static readonly Guid FitnessMachineServiceUuid = new("00001826-0000-1000-8000-00805F9B34FB");
    public static readonly Guid HeartRateServiceUuid = new("0000180D-0000-1000-8000-00805F9B34FB");
    public static readonly Guid CyclingPowerServiceUuid = new("00001818-0000-1000-8000-00805F9B34FB");
    public static readonly Guid CyclingSpeedAndCadenceServiceUuid = new("00001816-0000-1000-8000-00805F9B34FB");
    
    // FTMS Characteristics
    public static readonly Guid FitnessMachineFeatureCharacteristicUuid = new("00002ACC-0000-1000-8000-00805F9B34FB");
    public static readonly Guid IndoorBikeDataCharacteristicUuid = new("00002AD2-0000-1000-8000-00805F9B34FB");
    public static readonly Guid FitnessMachineStatusCharacteristicUuid = new("00002ADA-0000-1000-8000-00805F9B34FB");
    public static readonly Guid FitnessMachineControlPointCharacteristicUuid = new("00002AD9-0000-1000-8000-00805F9B34FB");
    public static readonly Guid TrainingStatusCharacteristicUuid = new("00002AD3-0000-1000-8000-00805F9B34FB");
    
    // Heart Rate Characteristics
    public static readonly Guid HeartRateMeasurementCharacteristicUuid = new("00002A37-0000-1000-8000-00805F9B34FB");
    
    // Cycling Power Characteristics
    public static readonly Guid CyclingPowerMeasurementCharacteristicUuid = new("00002A63-0000-1000-8000-00805F9B34FB");
    public static readonly Guid CyclingPowerFeatureCharacteristicUuid = new("00002A65-0000-1000-8000-00805F9B34FB");
    
    // Cycling Speed and Cadence Characteristics
    public static readonly Guid CSCMeasurementCharacteristicUuid = new("00002A5B-0000-1000-8000-00805F9B34FB");
    public static readonly Guid CSCFeatureCharacteristicUuid = new("00002A5C-0000-1000-8000-00805F9B34FB");
    
    // Device Information Service
    public static readonly Guid DeviceInformationServiceUuid = new("0000180A-0000-1000-8000-00805F9B34FB");
    public static readonly Guid ManufacturerNameCharacteristicUuid = new("00002A29-0000-1000-8000-00805F9B34FB");
    public static readonly Guid ModelNumberCharacteristicUuid = new("00002A24-0000-1000-8000-00805F9B34FB");
    public static readonly Guid SerialNumberCharacteristicUuid = new("00002A25-0000-1000-8000-00805F9B34FB");
    public static readonly Guid FirmwareRevisionCharacteristicUuid = new("00002A26-0000-1000-8000-00805F9B34FB");
    
    // Common Descriptors
    public static readonly Guid ClientCharacteristicConfigurationDescriptorUuid = new("00002902-0000-1000-8000-00805F9B34FB");
    
    // Helper method to check if a device advertises fitness services
    public static bool IsFitnessDevice(IEnumerable<Guid> advertisedServiceUuids)
    {
        var fitnessServices = new[]
        {
            FitnessMachineServiceUuid,
            HeartRateServiceUuid,
            CyclingPowerServiceUuid,
            CyclingSpeedAndCadenceServiceUuid
        };
        
        return advertisedServiceUuids.Any(uuid => fitnessServices.Contains(uuid));
    }
    
    // Get device type based on advertised services
    public static string GetDeviceType(IEnumerable<Guid> advertisedServiceUuids)
    {
        var services = advertisedServiceUuids.ToList();
        
        if (services.Contains(FitnessMachineServiceUuid))
            return "Smart Trainer";
        if (services.Contains(CyclingPowerServiceUuid))
            return "Power Meter";
        if (services.Contains(CyclingSpeedAndCadenceServiceUuid))
            return "Speed/Cadence Sensor";
        if (services.Contains(HeartRateServiceUuid))
            return "Heart Rate Monitor";
        
        return "Unknown Fitness Device";
    }
}

public static class FitnessMachineFeatures
{
    // Fitness Machine Features flags (based on FTMS spec)
    public const uint AverageSpeedSupported = 0x00000001;
    public const uint CadenceSupported = 0x00000002;
    public const uint TotalDistanceSupported = 0x00000004;
    public const uint InclinationSupported = 0x00000008;
    public const uint ElevationGainSupported = 0x00000010;
    public const uint PaceSupported = 0x00000020;
    public const uint StepCountSupported = 0x00000040;
    public const uint ResistanceLevelSupported = 0x00000080;
    public const uint StrideCountSupported = 0x00000100;
    public const uint ExpendedEnergySupported = 0x00000200;
    public const uint HeartRateMeasurementSupported = 0x00000400;
    public const uint MetabolicEquivalentSupported = 0x00000800;
    public const uint ElapsedTimeSupported = 0x00001000;
    public const uint RemainingTimeSupported = 0x00002000;
    public const uint PowerMeasurementSupported = 0x00004000;
    public const uint ForceOnBeltSupported = 0x00008000;
    public const uint PowerOutputSupported = 0x00010000;
}

public enum FitnessMachineType : byte
{
    Treadmill = 0x01,
    CrossTrainer = 0x02,
    StepClimber = 0x03,
    StairClimber = 0x04,
    Rower = 0x05,
    IndoorBike = 0x06
}

public enum TrainingStatusFlags : byte
{
    TrainingStatusStringPresent = 0x01,
    ExtendedStringPresent = 0x02
}

public enum TrainingStatus : byte
{
    Other = 0x00,
    Idle = 0x01,
    WarmingUp = 0x02,
    LowIntensityInterval = 0x03,
    HighIntensityInterval = 0x04,
    RecoveryInterval = 0x05,
    Isometric = 0x06,
    HeartRateControl = 0x07,
    FitnessTest = 0x08,
    SpeedOutsideControlRegion = 0x09,
    PowerOutsideControlRegion = 0x0A,
    HROutsideControlRegion = 0x0B,
    CoolDown = 0x0C,
    WattControl = 0x0D,
    QuickStart = 0x0E,
    PreWorkout = 0x0F,
    PostWorkout = 0x10
}