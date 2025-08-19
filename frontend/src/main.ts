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

  overlayWindow.loadFile(path.join(__dirname, '../index.html'));
  
  // Set up selective mouse event ignoring
  overlayWindow.webContents.once('dom-ready', () => {
    overlayWindow!.webContents.executeJavaScript(`
      const { ipcRenderer } = require('electron');
      let mouseOverButton = false;
      
      // Track when mouse is over interactive elements
      document.addEventListener('mouseover', (e) => {
        const isInteractive = e.target.matches('button, input, label, .toggle-btn, .btn-primary, .btn-secondary, .btn-connect, .timer-btn, .zone-option') ||
                            e.target.closest('button') ||
                            e.target.closest('.device-panel') ||
                            e.target.closest('.hr-zone-panel') ||
                            e.target.closest('.timer-controls') ||
                            e.target.closest('.zone-option') ||
                            e.target.closest('label') ||
                            e.target.id === 'toggleDevicePanel' ||
                            e.target.id === 'toggleHrZonePanel';
                            
        if (isInteractive) {
          if (!mouseOverButton) {
            mouseOverButton = true;
            ipcRenderer.send('set-ignore-mouse-events', false);
            console.log('Mouse over interactive element, enabling mouse events');
          }
        }
      });
      
      // Track when mouse leaves interactive elements
      document.addEventListener('mouseout', (e) => {
        const isLeavingInteractive = !e.relatedTarget || 
          (!e.relatedTarget.matches('button, input, label, .toggle-btn, .btn-primary, .btn-secondary, .btn-connect, .timer-btn, .zone-option') &&
           !e.relatedTarget.closest('button') &&
           !e.relatedTarget.closest('.device-panel') &&
           !e.relatedTarget.closest('.hr-zone-panel') &&
           !e.relatedTarget.closest('.timer-controls') &&
           !e.relatedTarget.closest('.zone-option') &&
           !e.relatedTarget.closest('label') &&
           e.relatedTarget.id !== 'toggleDevicePanel' &&
           e.relatedTarget.id !== 'toggleHrZonePanel');
           
        if (isLeavingInteractive) {
          if (mouseOverButton) {
            mouseOverButton = false;
            ipcRenderer.send('set-ignore-mouse-events', true);
            console.log('Mouse left interactive element, disabling mouse events');
          }
        }
      });
      
      // Initially ignore mouse events except for buttons
      ipcRenderer.send('set-ignore-mouse-events', true);
    `);
  });
  
  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
    
    // Setup live reload in development mode
    const watcher = chokidar.watch(['index.html', 'renderer.js', 'styles.css'], {
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

// Handle mouse event toggling from renderer process
ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
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

// Force quit on Windows when parent process dies
if (process.platform === 'win32') {
  process.on('SIGHUP', () => {
    console.log('Received SIGHUP, quitting...');
    app.quit();
  });
  
  const checkParent = () => {
    if (process.ppid === 1) {
      console.log('Parent process died, quitting...');
      app.quit();
    }
  };
  
  setInterval(checkParent, 2000);
}