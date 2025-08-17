using System.Timers;

namespace BikeDataOverlayMaui.Services;

public interface ITimerService
{
    bool IsRunning { get; }
    TimeSpan ElapsedTime { get; }
    string FormattedTime { get; }
    
    event EventHandler<TimeSpan>? TimerUpdated;
    
    void Start();
    void Stop();
    void Reset();
}

public class TimerService : ITimerService, IDisposable
{
    private System.Timers.Timer _timer;
    private DateTime _startTime;
    private TimeSpan _elapsedTime;
    private bool _isRunning;
    
    public event EventHandler<TimeSpan>? TimerUpdated;
    
    public bool IsRunning => _isRunning;
    public TimeSpan ElapsedTime => _elapsedTime + (_isRunning ? DateTime.Now - _startTime : TimeSpan.Zero);
    public string FormattedTime => FormatTime(ElapsedTime);

    public TimerService()
    {
        _timer = new System.Timers.Timer(100); // Update every 100ms
        _timer.Elapsed += OnTimerElapsed;
        _elapsedTime = TimeSpan.Zero;
    }

    public void Start()
    {
        if (!_isRunning)
        {
            _isRunning = true;
            _startTime = DateTime.Now.AddSeconds(-1); // Start 1 second back for immediate 00:01 display
            _timer.Start();
            
            // Force immediate update to show at least 00:01
            TimerUpdated?.Invoke(this, ElapsedTime);
            
            Console.WriteLine("Timer started");
        }
    }

    public void Stop()
    {
        if (_isRunning)
        {
            _isRunning = false;
            _elapsedTime += DateTime.Now - _startTime;
            _timer.Stop();
            
            TimerUpdated?.Invoke(this, ElapsedTime);
            Console.WriteLine("Timer stopped");
        }
    }

    public void Reset()
    {
        _isRunning = false;
        _elapsedTime = TimeSpan.Zero;
        _timer.Stop();
        
        TimerUpdated?.Invoke(this, ElapsedTime);
        Console.WriteLine("Timer reset");
    }

    private void OnTimerElapsed(object? sender, ElapsedEventArgs e)
    {
        if (_isRunning)
        {
            TimerUpdated?.Invoke(this, ElapsedTime);
        }
    }

    private static string FormatTime(TimeSpan time)
    {
        var totalSeconds = (int)time.TotalSeconds;
        var minutes = totalSeconds / 60;
        var seconds = totalSeconds % 60;
        return $"{minutes:D2}:{seconds:D2}";
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}