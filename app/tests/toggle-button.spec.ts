import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('Toggle Button Behavior Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    // Launch Electron app using helper
    const setup = await setupElectronTest();
    electronApp = setup.electronApp;
    window = setup.window;
    
    // Wait for app initialization and make sure core elements are present
    await waitForAppInitialization(window, '.overlay-container');
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
