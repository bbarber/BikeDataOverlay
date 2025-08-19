import { app, BrowserWindow, ipcMain } from 'electron';
import chokidar from 'chokidar';
import BleService from './ble-service';
import { DeviceInfo, BluetoothData } from './types';

// BLE service instance
const ble = new BleService();

let overlayWindow: BrowserWindow | null = null;

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
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Note: Bluetooth permissions are handled differently in Electron
  // We'll use the BLE service in the main process instead

  overlayWindow.loadFile('index.html');

  // Forward BLE events to renderer
  ble.on('device', (device: DeviceInfo) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:device', device);
    }
  });
  
  ble.on('scan-started', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:scan-started');
    }
  });
  
  ble.on('scan-stopped', (devices: DeviceInfo[]) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:scan-stopped', devices);
    }
  });
  
  ble.on('connected', (device: DeviceInfo) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:connected', device);
    }
  });
  
  ble.on('disconnected', (device: DeviceInfo) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:disconnected', device);
    }
  });
  
  ble.on('data', (payload: BluetoothData) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('ble:data', payload);
    }
  });
  
  // Set up selective mouse event ignoring
  overlayWindow?.webContents.once('dom-ready', () => {
    overlayWindow?.webContents.executeJavaScript(`
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
            window.postMessage({ type: 'set-ignore-mouse-events', ignore: false }, '*');
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
            window.postMessage({ type: 'set-ignore-mouse-events', ignore: true }, '*');
            console.log('Mouse left interactive element, disabling mouse events');
          }
        }
      });
      
      // Initially ignore mouse events except for buttons
      window.postMessage({ type: 'set-ignore-mouse-events', ignore: true }, '*');
    `);
  });

  if (process.argv.includes('--dev')) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
    
    // Setup live reload in development mode
    const watcher = chokidar.watch(['index.html', 'renderer.js', 'styles.css'], {
      cwd: __dirname,
      ignoreInitial: true
    });
    
    watcher.on('change', () => {
      console.log('File changed, reloading...');
      overlayWindow?.reload();
    });
    
    // Clean up watcher when window is closed
    overlayWindow.on('closed', () => {
      watcher.close();
    });
  }
}

// Handle mouse event toggling from renderer process
ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// IPC: BLE control
ipcMain.handle('ble:init', async (): Promise<boolean> => {
  return await ble.init();
});

ipcMain.handle('ble:startScan', async (): Promise<DeviceInfo[]> => {
  await ble.init();
  await ble.startScan();
  return ble.getDevices();
});

ipcMain.handle('ble:stopScan', async (): Promise<DeviceInfo[]> => {
  await ble.stopScan();
  return ble.getDevices();
});

ipcMain.handle('ble:getDevices', async (): Promise<DeviceInfo[]> => {
  return ble.getDevices();
});

ipcMain.handle('ble:connect', async (_event, deviceId: string): Promise<void> => {
  await ble.connectToDevice(deviceId);
});

ipcMain.handle('ble:disconnect', async (): Promise<void> => {
  await ble.disconnectDevice();
});

ipcMain.handle('ble:isConnected', (): boolean => {
  return ble.isConnected();
});

ipcMain.handle('ble:getConnectedDevice', (): DeviceInfo | null => {
  return ble.getConnectedDevice();
});

// App event handlers
app.whenReady().then(() => {
  createOverlayWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (ble.isConnected()) {
    await ble.disconnectDevice();
  }
});
