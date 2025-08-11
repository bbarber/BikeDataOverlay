const { app, BrowserWindow } = require('electron');
const path = require('path');

let overlayWindow;

function createOverlayWindow() {
    overlayWindow = new BrowserWindow({
        width: 250,
        height: 100,
        x: 50,
        y: 50,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        resizable: false,
        focusable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    overlayWindow.loadFile('index.html');
    
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    
    if (process.argv.includes('--dev')) {
        overlayWindow.webContents.openDevTools({ mode: 'detach' });
    }
}

app.whenReady().then(createOverlayWindow);

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