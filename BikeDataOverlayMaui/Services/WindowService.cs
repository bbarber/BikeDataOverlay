namespace BikeDataOverlayMaui.Services;

public interface IWindowService
{
    void SetWindowPosition(double x, double y);
    void SetWindowSize(double width, double height);
    void SetAlwaysOnTop(bool alwaysOnTop);
    void SetWindowOpacity(double opacity);
    (double X, double Y) GetWindowPosition();
    (double Width, double Height) GetWindowSize();
}

public class WindowService : IWindowService
{
    private Window? _window;
    
    public void Initialize(Window window)
    {
        _window = window;
    }
    
    public void SetWindowPosition(double x, double y)
    {
        if (_window != null)
        {
            _window.X = x;
            _window.Y = y;
        }
    }
    
    public void SetWindowSize(double width, double height)
    {
        if (_window != null)
        {
            _window.Width = width;
            _window.Height = height;
        }
    }
    
    public void SetAlwaysOnTop(bool alwaysOnTop)
    {
        // Platform-specific implementation would go here
        // For now, this is handled in the App.xaml.cs platform code
    }
    
    public void SetWindowOpacity(double opacity)
    {
        // Platform-specific implementation for window transparency
        if (_window != null)
        {
            // This would require platform-specific code
        }
    }
    
    public (double X, double Y) GetWindowPosition()
    {
        if (_window != null)
        {
            return (_window.X, _window.Y);
        }
        return (0, 0);
    }
    
    public (double Width, double Height) GetWindowSize()
    {
        if (_window != null)
        {
            return (_window.Width, _window.Height);
        }
        return (400, 800);
    }
}