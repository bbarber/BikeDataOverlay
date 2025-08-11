using Microsoft.AspNetCore.Mvc;
using BikeDataApi.Models;

namespace BikeDataApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MetricsController : ControllerBase
{
    private static readonly Random _random = new();
    
    [HttpGet("current")]
    public ActionResult<CyclingMetrics> GetCurrentMetrics()
    {
        return new CyclingMetrics
        {
            Watts = 150 + _random.Next(-30, 50),
            Cadence = 85 + _random.Next(-10, 15),
            Speed = 25.5 + _random.NextDouble() * 5,
            HeartRate = 140 + _random.Next(-15, 25)
        };
    }
}