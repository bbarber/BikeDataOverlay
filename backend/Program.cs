using BikeDataApi.Services;
using BikeDataApi.Services.Bluetooth;
using BikeDataApi.Services.Bluetooth.Abstractions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Register Bluetooth abstraction services
builder.Services.AddSingleton<IPlatformBluetoothResolver, PlatformBluetoothResolver>();
builder.Services.AddSingleton<IBluetoothService, PlatformBluetoothService>();

// Keep the old service for backward compatibility (will be removed later)
builder.Services.AddSingleton<BluetoothTrainerService>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.MapControllers();

app.Run("http://localhost:5000");