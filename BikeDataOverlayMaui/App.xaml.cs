#if MACCATALYST
using UIKit;
using Foundation;
using ObjCRuntime;
using System.Runtime.InteropServices;
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
				// Make window always on top
				uiWindow.WindowLevel = UIKit.UIWindowLevel.StatusBar + 1;
				
				// Configure the window scene and titlebar more aggressively
				var windowScene = uiWindow.WindowScene;
				if (windowScene?.Titlebar != null)
				{
					var titlebar = windowScene.Titlebar;
					
					// Hide all titlebar elements
					titlebar.TitleVisibility = UIKit.UITitlebarTitleVisibility.Hidden;
					titlebar.Toolbar = null;
					
					// Try to use the separator style to minimize the titlebar
					if (UIDevice.CurrentDevice.CheckSystemVersion(16, 0))
					{
						// iOS 16+ has TitlebarSeparatorStyle
						try
						{
							// Use reflection to access TitlebarSeparatorStyle if available
							var separatorProperty = titlebar.GetType().GetProperty("TitlebarSeparatorStyle");
							if (separatorProperty != null)
							{
								// Set to None (value 1) to remove the separator line
								separatorProperty.SetValue(titlebar, 1);
							}
						}
						catch { }
					}
				}
				
				// ALTERNATIVE APPROACH: Since true borderless isn't possible in Mac Catalyst,
				// let's make the window look as minimal as possible
				Task.Delay(500).ContinueWith(_ =>
				{
					MainThread.BeginInvokeOnMainThread(() =>
					{
						try
						{
							// Get the content view and try to expand it to cover the entire window
							if (uiWindow.RootViewController?.View != null)
							{
								var rootView = uiWindow.RootViewController.View;
								rootView.BackgroundColor = UIKit.UIColor.Clear;
								
								// Try to access the window's contentView and modify its frame
								var nsWindow = GetNSWindowHandle(uiWindow);
								if (nsWindow != IntPtr.Zero)
								{
									// Try to at least hide the title and minimize the chrome
									objc_msgSend(nsWindow, sel_registerName("setTitleVisibility:"), (IntPtr)1); // NSWindowTitleHidden
									objc_msgSend(nsWindow, sel_registerName("setTitlebarAppearsTransparent:"), (IntPtr)1);
									
									// Try setting a minimal style mask that removes as much as possible while staying within Mac Catalyst limits
									// NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable
									var minimalStyle = (IntPtr)(1 | 2 | 8); // Keep minimal functionality
									objc_msgSend(nsWindow, sel_registerName("setStyleMask:"), minimalStyle);
								}
							}
						}
						catch (Exception ex)
						{
							System.Diagnostics.Debug.WriteLine($"Fallback configuration failed: {ex}");
						}
					});
				});
			}
		};
	}
	
	private static IntPtr GetNSWindowHandle(UIWindow uiWindow)
	{
		try
		{
			// Method 1: Try direct NSWindow property
			var nsWindowSel = sel_registerName("nsWindow");
			var nsWindow = objc_msgSend(uiWindow.Handle, nsWindowSel);
			if (nsWindow != IntPtr.Zero)
				return nsWindow;
			
			// Method 2: Try through the view hierarchy
			if (uiWindow.RootViewController?.View != null)
			{
				var windowSel = sel_registerName("window");
				var window = objc_msgSend(uiWindow.RootViewController.View.Handle, windowSel);
				if (window != IntPtr.Zero)
				{
					nsWindow = objc_msgSend(window, nsWindowSel);
					if (nsWindow != IntPtr.Zero)
						return nsWindow;
				}
			}
			
			// Method 3: Get all windows and find ours
			var sharedApp = objc_msgSend(objc_getClass("NSApplication"), sel_registerName("sharedApplication"));
			if (sharedApp != IntPtr.Zero)
			{
				var windows = objc_msgSend(sharedApp, sel_registerName("windows"));
				if (windows != IntPtr.Zero)
				{
					var count = objc_msgSend(windows, sel_registerName("count"));
					for (int i = 0; i < (int)count; i++)
					{
						var windowAtIndex = objc_msgSend(windows, sel_registerName("objectAtIndex:"), (IntPtr)i);
						if (windowAtIndex != IntPtr.Zero)
						{
							// Check if this window matches our UIWindow somehow
							return windowAtIndex;
						}
					}
				}
			}
			
			return IntPtr.Zero;
		}
		catch
		{
			return IntPtr.Zero;
		}
	}
	
	// Objective-C runtime functions
	[DllImport("/usr/lib/libobjc.dylib")]
	private static extern IntPtr objc_getClass(string name);
	
	[DllImport("/usr/lib/libobjc.dylib")]
	private static extern IntPtr sel_registerName(string name);
	
	[DllImport("/usr/lib/libobjc.dylib")]
	private static extern IntPtr objc_msgSend(IntPtr target, IntPtr selector);
	
	[DllImport("/usr/lib/libobjc.dylib")]
	private static extern IntPtr objc_msgSend(IntPtr target, IntPtr selector, IntPtr arg1);
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
