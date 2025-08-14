const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Bike Data Overlay Electron App', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js'), '--dev'],
      executablePath: require('electron')
    });

    // Get the first window that the app opens
    window = await electronApp.firstWindow();
    
    // Wait for the window to be ready and for the DOM to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000); // Extra wait for app initialization
  });

  test.afterEach(async () => {
    // Clean up
    await electronApp.close();
  });

  test('should display the main overlay with watts metric', async () => {
    // Verify the main metrics display is visible
    await expect(window.locator('.metric-display')).toBeVisible();
    await expect(window.locator('#watts')).toBeVisible();
    await expect(window.locator('.metric-label')).toHaveText('WATTS');
  });

  test('should show device panel toggle button', async () => {
    // Verify the toggle button is visible
    await expect(window.locator('#toggleDevicePanel')).toBeVisible();
    await expect(window.locator('#toggleDevicePanel')).toHaveText('📱');
  });

  test('should open and close device panel', async () => {
    // Initially, device panel should be hidden
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
    
    // Click toggle button to open panel
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should now be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    await expect(window.locator('.device-panel-header h3')).toHaveText('Bluetooth Devices');
    
    // Click toggle button again to close panel
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should be hidden again
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
  });

  test('should display device management controls when panel is open', async () => {
    // Open device panel
    await window.locator('#toggleDevicePanel').click();
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Verify device controls are present
    await expect(window.locator('#scanDevicesBtn')).toBeVisible();
    await expect(window.locator('#scanDevicesBtn')).toHaveText('Scan for Devices');
    await expect(window.locator('#refreshDevicesBtn')).toBeVisible();
    await expect(window.locator('#refreshDevicesBtn')).toHaveText('Refresh');
    
    // Verify device status area
    await expect(window.locator('#deviceStatus')).toBeVisible();
    await expect(window.locator('.status-text')).toHaveText('Ready to scan');
    
    // Verify device list area
    await expect(window.locator('#deviceList')).toBeVisible();
  });

  test('should interact with scan devices button', async () => {
    // Open device panel
    await window.locator('#toggleDevicePanel').click();
    
    // Click scan devices button
    await window.locator('#scanDevicesBtn').click();
    
    // The button should be disabled and show "Scanning..."
    await expect(window.locator('#scanDevicesBtn')).toBeDisabled();
    await expect(window.locator('#scanDevicesBtn')).toHaveText('Scanning...');
    
    // Status should indicate scanning
    await expect(window.locator('.status-text')).toHaveText('Scanning for Bluetooth devices...');
    
    // Wait for scan to complete (this might fail if backend is not running, but that's ok for UI testing)
    await window.waitForTimeout(2000);
  });

  test('should maintain window properties', async () => {
    // Verify window is always on top and has no frame using BrowserWindow methods
    const windowState = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows[0];
      return {
        isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
        isResizable: mainWindow.isResizable(),
        isMovable: mainWindow.isMovable()
      };
    });
    
    expect(windowState.isAlwaysOnTop).toBe(true);
    expect(windowState.isResizable).toBe(false);
  });
});