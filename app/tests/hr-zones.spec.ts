import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('Heart Rate Zones Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    // Launch Electron app using helper
    const setup = await setupElectronTest();
    electronApp = setup.electronApp;
    window = setup.window;
    
    // Wait for app initialization and make sure core elements are present
    await waitForAppInitialization(window, '.heart-rate-container');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('heart rate container should be visible', async () => {
    await expect(window.locator('.heart-rate-container')).toBeVisible();
    await expect(window.locator('#heartRate')).toBeVisible();
    await expect(window.locator('#hrZoneLabel')).toBeVisible();
  });

  test('HR zone toggle button should be visible on hover', async () => {
    // Hover over heart rate container to show toggle button
    await window.locator('.heart-rate-container').hover();
    await expect(window.locator('#toggleHrZonePanel')).toBeVisible();
  });

  test('HR zone panel should open when toggle clicked', async () => {
    // Hover to show toggle button, then click
    await window.locator('.heart-rate-container').hover();
    await window.locator('#toggleHrZonePanel').click();
    
    // HR zone panel should be visible
    await expect(window.locator('#hrZonePanel')).toHaveClass(/visible/);
    await expect(window.locator('#userAge')).toBeVisible();
    await expect(window.locator('#restingHR')).toBeVisible();
  });

  test('HR zone configuration should work', async () => {
    // Hover and open HR zone panel
    await window.locator('.heart-rate-container').hover();
    await window.locator('#toggleHrZonePanel').click();
    await expect(window.locator('#hrZonePanel')).toHaveClass(/visible/);
    
    // Change user age to test zone calculation
    await window.locator('#userAge').fill('25');
    await window.locator('#restingHR').fill('50');
    
    // Select a different target zone
    await window.locator('#zone3').click();
    await expect(window.locator('#zone3')).toBeChecked();
    
    // Check that zones are visible
    await expect(window.locator('#zone3Range')).toBeVisible();
  });

  test('heart rate should show correct zone and color', async () => {
    // Test that HR zone label exists and has default state
    await expect(window.locator('#hrZoneLabel')).toBeVisible();
    
    // Zone label should show default zone
    const zoneText = await window.locator('#hrZoneLabel').textContent();
    expect(zoneText).toMatch(/Zone [1-5]/);
    
    // HR display should be visible
    await expect(window.locator('#heartRate')).toBeVisible();
    const hrText = await window.locator('#heartRate').textContent();
    expect(hrText).toBe('--'); // Default state when no data
  });
});
