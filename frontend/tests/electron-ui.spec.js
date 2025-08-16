const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Bike Data Overlay Electron App', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app without DevTools for testing
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')], // Remove --dev flag for tests
      executablePath: require('electron')
    });

    // Get the first window that the app opens
    window = await electronApp.firstWindow();
    
    // Wait for the window to be ready and for the DOM to load
    await window.waitForLoadState('domcontentloaded');
    
    // Wait for app initialization and make sure core elements are present
    await window.waitForSelector('.overlay-container', { timeout: 10000 });
    await window.waitForTimeout(2000); // Extra wait for app initialization
  });

  test.afterEach(async () => {
    // Clean up
    await electronApp.close();
  });

  test('should display the main overlay with watts metric', async () => {
    // Verify the main metrics display is visible - use first() to avoid strict mode violation
    await expect(window.locator('.metric-display').first()).toBeVisible();
    await expect(window.locator('#watts')).toBeVisible();
    await expect(window.locator('.metric-label').first()).toHaveText('WATTS');
  });

  test('should show device panel toggle button', async () => {
    // Hover over overlay container to make toggle button visible
    await window.locator('.overlay-container').first().hover();
    // Verify the toggle button is visible
    await expect(window.locator('#toggleDevicePanel')).toBeVisible();
    await expect(window.locator('#toggleDevicePanel [data-lucide="settings"]')).toBeVisible();
  });

  test('should open and close device panel', async () => {
    // Initially, device panel should be hidden
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
    
    // Hover to make toggle button visible, then click to open panel
    await window.locator('.overlay-container').first().hover();
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should now be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    await expect(window.locator('.device-panel-header h3')).toHaveText('Bluetooth Devices');
    
    // Click toggle button again to close panel
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should be hidden again
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
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