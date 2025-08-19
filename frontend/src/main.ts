import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { BluetoothService } from './services/BluetoothService';
import { CyclingMetrics, ScanResult, ConnectionResult, ConnectionStatus } from './types/CyclingMetrics';

let overlayWindow: BrowserWindow | null = null;
let bluetoothService: BluetoothService | null = null;

function createOverlayWindow(): void {
  overlayWindow = new BrowserWindow({
    x: 50,
    y: 50,
    width: 800,
    height: 800,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    focusable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, '../../index.html'));

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });

    // Setup live reload in development mode
    const watcher = chokidar.watch([
      'index.html', 
      'styles.css',
      'dist/src/**/*.js',
      'src/**/*.ts'
    ], {
      cwd: path.join(__dirname, '..'),
      ignoreInitial: true
    });

    watcher.on('change', () => {
      console.log('File changed, reloading...');
      overlayWindow!.reload();
    });

    // Clean up watcher when window is closed
    overlayWindow.on('closed', () => {
      watcher.close();
    });
  }
}

function initializeBluetoothService(): void {
  bluetoothService = new BluetoothService();

  // Forward Bluetooth events to renderer process
  bluetoothService.on('metricsUpdate', (metrics: CyclingMetrics) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('metrics-update', metrics);
    }
  });

  bluetoothService.on('connectionStatusChanged', (status: { isConnected: boolean; deviceName: string | null }) => {
    if (overlayWindow) {
      overlayWindow.webContents.send('connection-status-changed', status);
    }
  });

  // Auto-start connection in simulation mode after a brief delay
  setTimeout(async () => {
    try {
      console.log('Auto-starting Bluetooth connection...');
      await bluetoothService?.scanAndConnect();
    } catch (error) {
      console.error('Auto-connection failed:', error);
    }
  }, 2000);
}

// IPC Handlers for Bluetooth API
ipcMain.handle('get-current-metrics', async (): Promise<CyclingMetrics> => {
  return bluetoothService?.getCurrentMetrics() || {
    watts: 0,
    cadence: 0,
    speed: 0,
    heartRate: 0,
    timestamp: new Date().toISOString()
  };
});

ipcMain.handle('get-connection-status', async (): Promise<ConnectionStatus> => {
  return bluetoothService?.getConnectionStatus() || {
    isConnected: false,
    deviceName: null,
    timestamp: new Date().toISOString()
  };
});

ipcMain.handle('scan-and-connect', async (): Promise<ConnectionResult> => {
  try {
    const success = await bluetoothService?.scanAndConnect();
    const status = bluetoothService?.getConnectionStatus();
    return {
      success: success || false,
      isConnected: status?.isConnected || false,
      deviceName: status?.deviceName || undefined,
      message: success ? 'Successfully connected to trainer' : 'Failed to connect to trainer'
    };
  } catch (error: any) {
    return {
      success: false,
      isConnected: false,
      message: `Connection error: ${error.message}`
    };
  }
});

ipcMain.handle('connect-to-device', async (event, deviceId: string): Promise<ConnectionResult> => {
  try {
    const success = await bluetoothService?.connectToDevice(deviceId);
    const status = bluetoothService?.getConnectionStatus();
    return {
      success: success || false,
      isConnected: status?.isConnected || false,
      deviceName: status?.deviceName || undefined,
      connectedDevices: bluetoothService?.getConnectedDevicesCount() || 0,
      message: success ? 'Successfully connected to device' : `Failed to connect to device ${deviceId}`
    };
  } catch (error: any) {
    return {
      success: false,
      isConnected: false,
      message: `Connection error: ${error.message}`
    };
  }
});

ipcMain.handle('disconnect', async (): Promise<ConnectionResult> => {
  try {
    await bluetoothService?.disconnect();
    return {
      success: true,
      isConnected: false,
      message: 'Disconnected from trainer'
    };
  } catch (error: any) {
    return {
      success: false,
      isConnected: false,
      message: `Disconnect error: ${error.message}`
    };
  }
});

ipcMain.handle('scan-for-devices', async (event, timeoutSeconds: number = 15): Promise<ScanResult> => {
  try {
    const timeout = Math.min(Math.max(timeoutSeconds, 5), 60) * 1000;
    const devices = await bluetoothService?.scanForDevices(timeout) || [];

    return {
      success: true,
      deviceCount: devices.length,
      devices: devices,
      scanTimeout: timeoutSeconds,
      message: `Found ${devices.length} Bluetooth fitness devices`
    };
  } catch (error: any) {
    return {
      success: false,
      deviceCount: 0,
      devices: [],
      scanTimeout: timeoutSeconds,
      message: `Scan error: ${error.message}`
    };
  }
});

ipcMain.handle('list-devices', async (): Promise<ScanResult> => {
  try {
    const devices = await bluetoothService?.scanForDevices(10000) || [];

    const deviceList = devices.map(device => {
      const isConnected = bluetoothService?.getConnectionStatus().isConnected &&
        bluetoothService?.getConnectionStatus().deviceName?.includes(device.name);
      return {
        ...device,
        isConnected: isConnected || false
      };
    });

    return {
      success: true,
      deviceCount: deviceList.length,
      devices: deviceList,
      scanTimestamp: new Date().toISOString(),
      message: deviceList.length > 0
        ? `Found ${deviceList.length} fitness devices`
        : 'No fitness devices found. Make sure your devices are turned on and in pairing mode.'
    };
  } catch (error: any) {
    return {
      success: false,
      deviceCount: 0,
      devices: [],
      message: `Device listing error: ${error.message}`
    };
  }
});

app.whenReady().then(() => {
  initializeBluetoothService();
  createOverlayWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createOverlayWindow();
  }
});

app.on('before-quit', async () => {
  console.log('App is quitting, cleaning up Bluetooth service...');
  if (bluetoothService) {
    await bluetoothService.disconnect();
  }
});

// Handle process signals to ensure proper cleanup
process.on('SIGINT', () => {
  console.log('Received SIGINT, quitting...');
  app.quit();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, quitting...');
  app.quit();
});

process.on('SIGHUP', () => {
  console.log('Received SIGHUP, quitting...');
  app.quit();
});
