# Bike Data Overlay

A minimal cycling statistics overlay application built with Electron frontend and .NET backend.

## Quick Start

```bash
./start.sh
```

This will:
1. Start the .NET Web API backend (port 5000)
2. Install frontend dependencies
3. Launch the Electron overlay window

## Manual Start

### Backend
```bash
cd backend
dotnet run
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Features

- Transparent overlay window showing Watts
- Mock data for testing (random power values)
- Always-on-top positioning
- Electron + .NET (Windows only for bluetooth reasons)

## Architecture

- **Backend**: .NET 8 Web API with mock cycling metrics
- **Frontend**: Electron with transparent overlay window
- **Communication**: HTTP REST API between frontend and backend

## Next Steps

- Replace mock data with real Bluetooth trainer communication
- Add more metrics (cadence, speed, heart rate)
- Implement overlay positioning controls
- Add configuration UI