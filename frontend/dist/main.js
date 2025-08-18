"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const chokidar = __importStar(require("chokidar"));
const BluetoothService_1 = require("./services/BluetoothService");
let overlayWindow = null;
let bluetoothService = null;
function createOverlayWindow() {
    overlayWindow = new electron_1.BrowserWindow({
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
    overlayWindow.webContents.once('dom-ready', () => {
        overlayWindow.webContents.executeJavaScript(`
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
        const watcher = chokidar.watch(['index.html', 'renderer.js', 'styles.css'], {
            cwd: path.join(__dirname, '..'),
            ignoreInitial: true
        });
        watcher.on('change', () => {
            console.log('File changed, reloading...');
            overlayWindow.reload();
        });
        overlayWindow.on('closed', () => {
            watcher.close();
        });
    }
}
function initializeBluetoothService() {
    bluetoothService = new BluetoothService_1.BluetoothService();
    bluetoothService.on('metricsUpdate', (metrics) => {
        if (overlayWindow) {
            overlayWindow.webContents.send('metrics-update', metrics);
        }
    });
    bluetoothService.on('connectionStatusChanged', (status) => {
        if (overlayWindow) {
            overlayWindow.webContents.send('connection-status-changed', status);
        }
    });
    setTimeout(async () => {
        try {
            console.log('Auto-starting Bluetooth connection...');
            await bluetoothService?.scanAndConnect();
        }
        catch (error) {
            console.error('Auto-connection failed:', error);
        }
    }, 2000);
}
electron_1.ipcMain.handle('get-current-metrics', async () => {
    return bluetoothService?.getCurrentMetrics() || {
        watts: 0,
        cadence: 0,
        speed: 0,
        heartRate: 0,
        timestamp: new Date().toISOString()
    };
});
electron_1.ipcMain.handle('get-connection-status', async () => {
    return bluetoothService?.getConnectionStatus() || {
        isConnected: false,
        deviceName: null,
        timestamp: new Date().toISOString()
    };
});
electron_1.ipcMain.handle('scan-and-connect', async () => {
    try {
        const success = await bluetoothService?.scanAndConnect();
        const status = bluetoothService?.getConnectionStatus();
        return {
            success: success || false,
            isConnected: status?.isConnected || false,
            deviceName: status?.deviceName || null,
            message: success ? 'Successfully connected to trainer' : 'Failed to connect to trainer'
        };
    }
    catch (error) {
        return {
            success: false,
            isConnected: false,
            message: `Connection error: ${error.message}`
        };
    }
});
electron_1.ipcMain.handle('connect-to-device', async (event, deviceId) => {
    try {
        const success = await bluetoothService?.connectToDevice(deviceId);
        const status = bluetoothService?.getConnectionStatus();
        return {
            success: success || false,
            isConnected: status?.isConnected || false,
            deviceName: status?.deviceName || null,
            connectedDevices: bluetoothService?.getConnectedDevicesCount() || 0,
            message: success ? 'Successfully connected to device' : `Failed to connect to device ${deviceId}`
        };
    }
    catch (error) {
        return {
            success: false,
            isConnected: false,
            message: `Connection error: ${error.message}`
        };
    }
});
electron_1.ipcMain.handle('disconnect', async () => {
    try {
        await bluetoothService?.disconnect();
        return {
            success: true,
            isConnected: false,
            message: 'Disconnected from trainer'
        };
    }
    catch (error) {
        return {
            success: false,
            isConnected: false,
            message: `Disconnect error: ${error.message}`
        };
    }
});
electron_1.ipcMain.handle('scan-for-devices', async (event, timeoutSeconds = 15) => {
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
    }
    catch (error) {
        return {
            success: false,
            deviceCount: 0,
            devices: [],
            scanTimeout: timeoutSeconds,
            message: `Scan error: ${error.message}`
        };
    }
});
electron_1.ipcMain.handle('list-devices', async () => {
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
    }
    catch (error) {
        return {
            success: false,
            deviceCount: 0,
            devices: [],
            message: `Device listing error: ${error.message}`
        };
    }
});
electron_1.ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const win = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setIgnoreMouseEvents(ignore, { forward: true });
    }
});
electron_1.app.whenReady().then(() => {
    initializeBluetoothService();
    createOverlayWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createOverlayWindow();
    }
});
electron_1.app.on('before-quit', async () => {
    console.log('App is quitting, cleaning up Bluetooth service...');
    if (bluetoothService) {
        await bluetoothService.disconnect();
    }
});
process.on('SIGINT', () => {
    console.log('Received SIGINT, quitting...');
    electron_1.app.quit();
});
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, quitting...');
    electron_1.app.quit();
});
if (process.platform === 'win32') {
    process.on('SIGHUP', () => {
        console.log('Received SIGHUP, quitting...');
        electron_1.app.quit();
    });
    const checkParent = () => {
        if (process.ppid === 1) {
            console.log('Parent process died, quitting...');
            electron_1.app.quit();
        }
    };
    setInterval(checkParent, 2000);
}
