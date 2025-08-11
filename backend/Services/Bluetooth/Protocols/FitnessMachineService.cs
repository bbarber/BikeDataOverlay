using System;
using System.Linq;
using BikeDataApi.Services.Bluetooth.Models;

namespace BikeDataApi.Services.Bluetooth.Protocols;

public static class FitnessMachineService
{
    /// <summary>
    /// Parses Indoor Bike Data characteristic according to FTMS specification
    /// </summary>
    /// <param name="data">Raw bytes from the characteristic</param>
    /// <returns>Parsed trainer data</returns>
    public static TrainerData ParseIndoorBikeData(byte[] data)
    {
        var trainerData = new TrainerData();
        
        if (data == null || data.Length < 2)
        {
            return trainerData; // Invalid data
        }

        try
        {
            int offset = 0;
            
            // First 2 bytes are flags indicating which data fields are present
            var flags = (IndoorBikeDataFlags)BitConverter.ToUInt16(data, offset);
            offset += 2;

            // Instantaneous Speed (always present) - uint16, 0.01 km/h resolution
            if (offset + 2 <= data.Length)
            {
                var speedRaw = BitConverter.ToUInt16(data, offset);
                trainerData.Speed = speedRaw * 0.01; // Convert to km/h
                offset += 2;
            }

            // Average Speed (optional) - uint16, 0.01 km/h resolution
            if (flags.HasFlag(IndoorBikeDataFlags.AverageSpeedPresent) && offset + 2 <= data.Length)
            {
                offset += 2; // Skip average speed for now
            }

            // Instantaneous Cadence (optional) - uint16, 0.5 RPM resolution
            if (flags.HasFlag(IndoorBikeDataFlags.InstantaneousCadencePresent) && offset + 2 <= data.Length)
            {
                var cadenceRaw = BitConverter.ToUInt16(data, offset);
                trainerData.Cadence = (int)(cadenceRaw * 0.5); // Convert to RPM
                offset += 2;
            }

            // Average Cadence (optional) - uint16, 0.5 RPM resolution
            if (flags.HasFlag(IndoorBikeDataFlags.AverageCadencePresent) && offset + 2 <= data.Length)
            {
                offset += 2; // Skip average cadence for now
            }

            // Total Distance (optional) - uint24, 1 meter resolution
            if (flags.HasFlag(IndoorBikeDataFlags.TotalDistancePresent) && offset + 3 <= data.Length)
            {
                var distanceBytes = data.Skip(offset).Take(3).ToArray();
                var distanceRaw = distanceBytes[0] | (distanceBytes[1] << 8) | (distanceBytes[2] << 16);
                trainerData.Distance = distanceRaw; // meters
                offset += 3;
            }

            // Resistance Level (optional) - sint16, 1 unit resolution
            if (flags.HasFlag(IndoorBikeDataFlags.ResistanceLevelPresent) && offset + 2 <= data.Length)
            {
                trainerData.ResistanceLevel = BitConverter.ToInt16(data, offset);
                offset += 2;
            }

            // Instantaneous Power (optional) - sint16, 1 watt resolution
            if (flags.HasFlag(IndoorBikeDataFlags.InstantaneousPowerPresent) && offset + 2 <= data.Length)
            {
                trainerData.Power = BitConverter.ToInt16(data, offset);
                offset += 2;
            }

            // Average Power (optional) - sint16, 1 watt resolution
            if (flags.HasFlag(IndoorBikeDataFlags.AveragePowerPresent) && offset + 2 <= data.Length)
            {
                offset += 2; // Skip average power for now
            }

            // Expended Energy (optional) - uint16 total, uint16 per hour, uint8 per minute
            if (flags.HasFlag(IndoorBikeDataFlags.ExpendedEnergyPresent) && offset + 5 <= data.Length)
            {
                var totalEnergy = BitConverter.ToUInt16(data, offset);
                trainerData.ExpendedEnergy = totalEnergy; // calories
                offset += 5; // Skip per hour and per minute values
            }

            // Heart Rate (optional) - uint8, 1 BPM resolution
            if (flags.HasFlag(IndoorBikeDataFlags.HeartRatePresent) && offset + 1 <= data.Length)
            {
                trainerData.HeartRate = data[offset];
                offset += 1;
            }

            // Metabolic Equivalent (optional) - uint8, 0.1 MET resolution
            if (flags.HasFlag(IndoorBikeDataFlags.MetabolicEquivalentPresent) && offset + 1 <= data.Length)
            {
                offset += 1; // Skip MET for now
            }

            // Elapsed Time (optional) - uint16, 1 second resolution
            if (flags.HasFlag(IndoorBikeDataFlags.ElapsedTimePresent) && offset + 2 <= data.Length)
            {
                var elapsedSeconds = BitConverter.ToUInt16(data, offset);
                trainerData.ElapsedTime = TimeSpan.FromSeconds(elapsedSeconds);
                offset += 2;
            }

            // Remaining Time (optional) - uint16, 1 second resolution
            if (flags.HasFlag(IndoorBikeDataFlags.RemainingTimePresent) && offset + 2 <= data.Length)
            {
                offset += 2; // Skip remaining time for now
            }

            trainerData.IsDataValid = true;
            trainerData.Timestamp = DateTime.UtcNow;

            return trainerData;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing Indoor Bike Data: {ex.Message}");
            return trainerData; // Return invalid data
        }
    }

    /// <summary>
    /// Parses Fitness Machine Feature characteristic
    /// </summary>
    /// <param name="data">Raw bytes from the characteristic</param>
    /// <returns>Supported features bitmask</returns>
    public static uint ParseFitnessMachineFeatures(byte[] data)
    {
        if (data == null || data.Length < 4)
        {
            return 0;
        }

        try
        {
            return BitConverter.ToUInt32(data, 0);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing Fitness Machine Features: {ex.Message}");
            return 0;
        }
    }

    /// <summary>
    /// Creates a request to set target power on the trainer
    /// </summary>
    /// <param name="targetWatts">Target power in watts</param>
    /// <returns>Command bytes to write to control point</returns>
    public static byte[] CreateSetTargetPowerCommand(int targetWatts)
    {
        if (targetWatts < 0 || targetWatts > 4000)
        {
            throw new ArgumentOutOfRangeException(nameof(targetWatts), "Target power must be between 0 and 4000 watts");
        }

        // FTMS Control Point: Set Target Power (0x05)
        var command = new byte[3];
        command[0] = 0x05; // Op Code for Set Target Power
        var powerBytes = BitConverter.GetBytes((short)targetWatts);
        command[1] = powerBytes[0];
        command[2] = powerBytes[1];

        return command;
    }

    /// <summary>
    /// Creates a request to set target resistance on the trainer
    /// </summary>
    /// <param name="resistanceLevel">Resistance level (trainer-specific)</param>
    /// <returns>Command bytes to write to control point</returns>
    public static byte[] CreateSetTargetResistanceCommand(int resistanceLevel)
    {
        if (resistanceLevel < 0 || resistanceLevel > 200)
        {
            throw new ArgumentOutOfRangeException(nameof(resistanceLevel), "Resistance level must be between 0 and 200");
        }

        // FTMS Control Point: Set Target Resistance Level (0x04)
        var command = new byte[2];
        command[0] = 0x04; // Op Code for Set Target Resistance Level
        command[1] = (byte)resistanceLevel;

        return command;
    }

    /// <summary>
    /// Creates a request to start/resume training
    /// </summary>
    /// <returns>Command bytes to write to control point</returns>
    public static byte[] CreateStartTrainingCommand()
    {
        // FTMS Control Point: Start or Resume (0x07)
        return new byte[] { 0x07 };
    }

    /// <summary>
    /// Creates a request to stop/pause training
    /// </summary>
    /// <returns>Command bytes to write to control point</returns>
    public static byte[] CreateStopTrainingCommand()
    {
        // FTMS Control Point: Stop or Pause (0x08)
        return new byte[] { 0x08 };
    }

    /// <summary>
    /// Creates a request to reset the trainer
    /// </summary>
    /// <returns>Command bytes to write to control point</returns>
    public static byte[] CreateResetCommand()
    {
        // FTMS Control Point: Reset (0x01)
        return new byte[] { 0x01 };
    }
}