import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('Settings and Analytics Panel Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    const setup = await setupElectronTest();
    electronApp = setup.electronApp;
    window = setup.window;
    
    await waitForAppInitialization(window, '.overlay-container');
    await window.waitForTimeout(3000); // Wait for React to fully render
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('settings button should open and close settings panel', async () => {
    // Find the first settings button (in watts container)
    const settingsButton = window.locator('.toggle-btn').first();
    await expect(settingsButton).toBeVisible();
    
    // Initially, settings panel should not exist
    await expect(window.locator('.settings-panel')).toHaveCount(0);
    
    // Click to open settings panel
    await settingsButton.click();
    await window.waitForTimeout(500);
    
    // Settings panel should now be visible
    await expect(window.locator('.settings-panel.visible')).toBeVisible();
    await expect(window.locator('.settings-panel-header h3')).toHaveText('Settings');
    
    // Click close button to close panel
    await window.locator('.close-btn').first().click();
    await window.waitForTimeout(500);
    
    // Panel should be gone
    await expect(window.locator('.settings-panel')).toHaveCount(0);
  });

  test('analytics button should open and close analytics panel', async () => {
    // Find the analytics button (in heart rate container)
    const analyticsButton = window.locator('.heart-rate-container .toggle-btn');
    await expect(analyticsButton).toBeVisible();
    
    // Initially, analytics panel should not exist
    await expect(window.locator('.hr-analytics-panel')).toHaveCount(0);
    
    // Click to open analytics panel
    await analyticsButton.click();
    await window.waitForTimeout(500);
    
    // Analytics panel should now be visible
    await expect(window.locator('.hr-analytics-panel.visible')).toBeVisible();
    await expect(window.locator('.analytics-panel-header h3')).toHaveText('HR Zone Analytics');
    
    // Should show empty state initially
    await expect(window.locator('.analytics-empty-state')).toBeVisible();
    await expect(window.locator('.empty-title')).toHaveText('No HR Data Yet');
  });

  test('settings panel tabs should work', async () => {
    // Open settings panel
    await window.locator('.toggle-btn').first().click();
    await window.waitForTimeout(500);
    
    // Verify devices tab is active by default
    await expect(window.locator('.tab-button').first()).toHaveClass(/active/);
    await expect(window.locator('.tab-content.active')).toBeVisible();
    
    // Click HR Zones tab
    await window.locator('.tab-button').nth(1).click();
    await window.waitForTimeout(300);
    
    // HR Zones tab should now be active
    await expect(window.locator('.tab-button').nth(1)).toHaveClass(/active/);
    
    // Should show HR zone configuration
    await expect(window.locator('#userAge')).toBeVisible();
    await expect(window.locator('#restingHR')).toBeVisible();
  });

  test('timer controls should be visible and functional', async () => {
    // Timer container should be visible
    await expect(window.locator('.time-container')).toBeVisible();
    await expect(window.locator('.timer-controls')).toBeVisible();
    
    // Should have start, stop (hidden), and reset buttons
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#stopTimer')).toHaveClass(/hidden/);
    await expect(window.locator('#resetTimer')).toBeVisible();
  });
});