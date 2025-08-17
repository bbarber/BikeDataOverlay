using BikeDataOverlayMaui.ViewModels;

namespace BikeDataOverlayMaui;

public partial class MainPage : ContentPage
{
	private double _startX, _startY;
	private double _originalHeight = 800;
	
	public MainPage(MainViewModel viewModel)
	{
		InitializeComponent();
		BindingContext = viewModel;
	}
	
	private void OnDragHandlePanUpdated(object? sender, PanUpdatedEventArgs e)
	{
		var window = this.Window;
		if (window == null) return;
		
		switch (e.StatusType)
		{
			case GestureStatus.Started:
				_startX = window.X;
				_startY = window.Y;
				break;
				
			case GestureStatus.Running:
				window.X = _startX + e.TotalX;
				window.Y = _startY + e.TotalY;
				break;
				
			case GestureStatus.Completed:
			case GestureStatus.Canceled:
				// Optionally save window position to preferences
				break;
		}
	}
	
	private void OnMinimizeClicked(object? sender, EventArgs e)
	{
		// Minimize the window (platform-specific implementation would be needed)
		// For now, we'll hide the window content or make it very small
		var window = this.Window;
		if (window != null)
		{
			_originalHeight = window.Height;
			window.Height = 35; // Just show the title bar
		}
	}
	
	private void OnDragHandleDoubleTapped(object? sender, TappedEventArgs e)
	{
		// Restore window size on double-click
		var window = this.Window;
		if (window != null)
		{
			if (window.Height <= 35)
			{
				// Restore to original size
				window.Height = _originalHeight;
			}
			else
			{
				// Minimize
				_originalHeight = window.Height;
				window.Height = 35;
			}
		}
	}
	
	private void OnCloseClicked(object? sender, EventArgs e)
	{
		// Close the application
		Application.Current?.Quit();
	}
}

