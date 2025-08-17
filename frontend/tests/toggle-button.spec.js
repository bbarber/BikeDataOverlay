const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Toggle Button Behavior Tests', () => {
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

  test('toggle button should work with simple click', async () => {
    // Initially, device panel should be hidden
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
    
    // Hover to make toggle button visible, then click to open panel
    await window.locator('.overlay-container').first().hover();
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should now be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Click toggle button again to close panel
    await window.locator('#toggleDevicePanel').click();
    
    // Device panel should be hidden again
    await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
  });

  test('toggle button should stay responsive after multiple clicks', async () => {
    // Test multiple toggle operations
    await window.locator('.overlay-container').first().hover();
    for (let i = 0; i < 5; i++) {
      // Open panel
      await window.locator('#toggleDevicePanel').click();
      await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
      
      // Close panel
      await window.locator('#toggleDevicePanel').click();
      await expect(window.locator('#devicePanel')).not.toHaveClass(/visible/);
    }
  });

  test('device panel should stay open after opening', async () => {
    // Open the device panel
    await window.locator('.overlay-container').first().hover();
    await window.locator('#toggleDevicePanel').click();
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Wait a bit to ensure it stays open
    await window.waitForTimeout(2000);
    
    // Panel should still be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Verify panel content is accessible
    await expect(window.locator('.device-panel-header h3')).toHaveText('Bluetooth Devices');
    await expect(window.locator('#scanDevicesBtn')).toBeVisible();
    await expect(window.locator('#refreshDevicesBtn')).toBeVisible();
  });

  test('device panel mouse interaction should work', async () => {
    // Open the device panel
    await window.locator('.overlay-container').first().hover();
    await window.locator('#toggleDevicePanel').click();
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Hover over the device panel (should not close it)
    await window.locator('#devicePanel').hover();
    await window.waitForTimeout(500);
    
    // Panel should still be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
    
    // Click inside the panel (should not close it)
    await window.locator('.device-panel-header').click();
    await window.waitForTimeout(500);
    
    // Panel should still be visible
    await expect(window.locator('#devicePanel')).toHaveClass(/visible/);
  });
});