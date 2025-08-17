namespace BikeDataOverlayMaui.Models;

public class CyclingMetrics
{
    public double Watts { get; set; }
    public double Cadence { get; set; }
    public double Speed { get; set; }
    public double HeartRate { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}