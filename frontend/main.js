const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const chokidar = require('chokidar');

let overlayWindow;

function createOverlayWindow() {
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

    overlayWindow.loadFile('index.html');
    
    // Set up selective mouse event ignoring
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
        
        // Setup live reload in development mode
        const watcher = chokidar.watch(['index.html', 'renderer.js', 'styles.css'], {
            cwd: __dirname,
            ignoreInitial: true
        });
        
        watcher.on('change', () => {
            console.log('File changed, reloading...');
            overlayWindow.reload();
        });
        
        // Clean up watcher when window is closed
        overlayWindow.on('closed', () => {
            watcher.close();
        });
    }
}

// Handle mouse event toggling from renderer process
ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setIgnoreMouseEvents(ignore, { forward: true });
    }
});

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
    
    // Check if parent process is still alive (Windows specific)
    const checkParent = () => {
        if (process.ppid === 1) {
            console.log('Parent process died, quitting...');
            app.quit();
        }
    };
    
    // Check every 2 seconds
    setInterval(checkParent, 2000);
}