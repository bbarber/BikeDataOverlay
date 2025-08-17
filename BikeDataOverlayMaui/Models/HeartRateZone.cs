namespace BikeDataOverlayMaui.Models;

public class HeartRateZone
{
    public int ZoneNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MinBpm { get; set; }
    public int MaxBpm { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsTargetZone { get; set; }
}

public class HeartRateConfig
{
    public int Age { get; set; } = 30;
    public int RestingHR { get; set; } = 60;
    public int TargetZone { get; set; } = 2;
}

public class HeartRateZoneInfo
{
    public int Zone { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool InTarget { get; set; }
}