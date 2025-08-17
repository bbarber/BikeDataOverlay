using Microsoft.Extensions.Logging;
using BikeDataOverlayMaui.Services;
using BikeDataOverlayMaui.ViewModels;
using CommunityToolkit.Maui;

namespace BikeDataOverlayMaui;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.UseMauiCommunityToolkit()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

		// Register services
		builder.Services.AddSingleton<IBluetoothService, BluetoothService>();
		builder.Services.AddSingleton<IHeartRateZoneService, HeartRateZoneService>();
		builder.Services.AddSingleton<ITimerService, TimerService>();
		builder.Services.AddSingleton<IWindowService, WindowService>();

		// Register ViewModels
		builder.Services.AddTransient<MainViewModel>();

		// Register Views
		builder.Services.AddTransient<MainPage>();

#if DEBUG
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}
}
