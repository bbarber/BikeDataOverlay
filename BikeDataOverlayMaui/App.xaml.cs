#if MACCATALYST
using UIKit;
#endif
using BikeDataOverlayMaui.Services;

namespace BikeDataOverlayMaui;

public partial class App : Application
{
	public App()
	{
		InitializeComponent();

		MainPage = new AppShell();
	}
	
	protected override Window CreateWindow(IActivationState? activationState)
	{
		var window = base.CreateWindow(activationState);
		
		// Configure window for overlay behavior
		window.Title = "Bike Data Overlay";
		
		// Set initial window size and position
		window.Width = 400;
		window.Height = 800;
		window.X = 100;
		window.Y = 100;
		
		// Configure window properties for overlay behavior
		ConfigurePlatformWindow(window);
		
		// Initialize window service
		var windowService = Handler?.MauiContext?.Services?.GetService<IWindowService>() as WindowService;
		windowService?.Initialize(window);
		
		return window;
	}
	
	private static void ConfigurePlatformWindow(Window window)
	{
#if MACCATALYST
		ConfigureMacWindow(window);
#elif WINDOWS
		ConfigureWindowsWindow(window);
#endif
	}
	
#if MACCATALYST
	private static void ConfigureMacWindow(Window window)
	{
		// Configure Mac-specific window properties
		window.Created += (s, e) =>
		{
			if (window.Handler?.PlatformView is UIKit.UIWindow uiWindow)
			{
				// Make window always on top and frameless
				if (uiWindow.RootViewController?.View != null)
				{
					uiWindow.WindowLevel = UIKit.UIWindowLevel.StatusBar + 1;
				}
			}
		};
	}
#endif

#if WINDOWS
	private static void ConfigureWindowsWindow(Window window)
	{
		// Configure Windows-specific window properties
		window.Created += (s, e) =>
		{
			if (window.Handler?.PlatformView is Microsoft.UI.Xaml.Window winUIWindow)
			{
				var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(winUIWindow);
				
				// Remove window decorations (frameless)
				var style = GetWindowLong(hwnd, GWL_STYLE);
				style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
				SetWindowLong(hwnd, GWL_STYLE, style);
				
				// Make window topmost
				SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED);
			}
		};
	}
	
	// Windows API constants and functions
	private const int GWL_STYLE = -16;
	private const int WS_CAPTION = 0x00C00000;
	private const int WS_THICKFRAME = 0x00040000;
	private const int WS_MINIMIZEBOX = 0x00020000;
	private const int WS_MAXIMIZEBOX = 0x00010000;
	private const int WS_SYSMENU = 0x00080000;
	private const int SWP_NOMOVE = 0x0002;
	private const int SWP_NOSIZE = 0x0001;
	private const int SWP_FRAMECHANGED = 0x0020;
	private static readonly IntPtr HWND_TOPMOST = new(-1);
	
	[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
	private static extern int GetWindowLong(IntPtr hWnd, int nIndex);
	
	[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
	private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
	
	[System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
	private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
#endif
}
