using BikeDataOverlayMaui.Models;

namespace BikeDataOverlayMaui.Services;

public interface IHeartRateZoneService
{
    HeartRateConfig Config { get; }
    List<HeartRateZone> Zones { get; }
    
    void UpdateConfig(int age, int restingHR, int targetZone);
    HeartRateZoneInfo GetZoneForHeartRate(double heartRate);
    void SaveConfig();
    void LoadConfig();
}

public class HeartRateZoneService : IHeartRateZoneService
{
    private HeartRateConfig _config;
    private List<HeartRateZone> _zones;
    private const string ConfigKey = "BikeDataHrConfig";

    public HeartRateConfig Config => _config;
    public List<HeartRateZone> Zones => _zones;

    public HeartRateZoneService()
    {
        _config = new HeartRateConfig();
        _zones = new List<HeartRateZone>();
        LoadConfig();
        CalculateZones();
    }

    public void UpdateConfig(int age, int restingHR, int targetZone)
    {
        _config.Age = age;
        _config.RestingHR = restingHR;
        _config.TargetZone = targetZone;
        CalculateZones();
        SaveConfig();
    }

    public HeartRateZoneInfo GetZoneForHeartRate(double heartRate)
    {
        for (int i = 0; i < _zones.Count; i++)
        {
            var zone = _zones[i];
            if (heartRate >= zone.MinBpm && heartRate <= zone.MaxBpm)
            {
                return new HeartRateZoneInfo
                {
                    Zone = zone.ZoneNumber,
                    Name = zone.Name,
                    InTarget = zone.ZoneNumber == _config.TargetZone
                };
            }
        }
        
        // If HR is below zone 1, still return zone 1
        if (heartRate < _zones[0].MinBpm)
        {
            return new HeartRateZoneInfo 
            { 
                Zone = 1, 
                Name = _zones[0].Name, 
                InTarget = _config.TargetZone == 1 
            };
        }
        
        // If HR is above zone 5, still return zone 5
        var lastZone = _zones.Last();
        return new HeartRateZoneInfo 
        { 
            Zone = lastZone.ZoneNumber, 
            Name = lastZone.Name, 
            InTarget = _config.TargetZone == lastZone.ZoneNumber 
        };
    }

    public void SaveConfig()
    {
        try
        {
            var json = System.Text.Json.JsonSerializer.Serialize(_config);
            Preferences.Set(ConfigKey, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error saving HR config: {ex.Message}");
        }
    }

    public void LoadConfig()
    {
        try
        {
            var json = Preferences.Get(ConfigKey, string.Empty);
            if (!string.IsNullOrEmpty(json))
            {
                var config = System.Text.Json.JsonSerializer.Deserialize<HeartRateConfig>(json);
                if (config != null)
                {
                    _config = config;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading HR config: {ex.Message}");
            _config = new HeartRateConfig(); // Reset to default
        }
    }

    private void CalculateZones()
    {
        // Calculate max HR using improved formula: 208 - 0.7 * age
        var maxHR = (int)Math.Round(208 - 0.7 * _config.Age);
        
        // Calculate HR Reserve (Karvonen method)
        var hrReserve = maxHR - _config.RestingHR;
        
        _zones.Clear();
        
        // Calculate 5 zones based on % of HR Reserve + resting HR
        _zones.Add(new HeartRateZone
        {
            ZoneNumber = 1,
            Name = "Recovery",
            MinBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.50),
            MaxBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.60),
            Description = "Active recovery, very light",
            IsTargetZone = _config.TargetZone == 1
        });
        
        _zones.Add(new HeartRateZone
        {
            ZoneNumber = 2,
            Name = "Aerobic",
            MinBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.60),
            MaxBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.70),
            Description = "Fat burning, endurance",
            IsTargetZone = _config.TargetZone == 2
        });
        
        _zones.Add(new HeartRateZone
        {
            ZoneNumber = 3,
            Name = "Moderate",
            MinBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.70),
            MaxBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.80),
            Description = "Aerobic fitness",
            IsTargetZone = _config.TargetZone == 3
        });
        
        _zones.Add(new HeartRateZone
        {
            ZoneNumber = 4,
            Name = "Hard",
            MinBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.80),
            MaxBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.90),
            Description = "Lactate threshold",
            IsTargetZone = _config.TargetZone == 4
        });
        
        _zones.Add(new HeartRateZone
        {
            ZoneNumber = 5,
            Name = "Maximal",
            MinBpm = (int)Math.Round(_config.RestingHR + hrReserve * 0.90),
            MaxBpm = maxHR,
            Description = "VO2 max, very hard",
            IsTargetZone = _config.TargetZone == 5
        });
    }
}