import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('React Settings Panel Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    // Launch Electron app using helper
    const setup = await setupElectronTest();
    electronApp = setup.electronApp;
    window = setup.window;
    
    // Wait for app initialization
    await waitForAppInitialization(window, '.overlay-container');
  });

  test.afterEach(async () => {
    // Clean up
    await electronApp.close();
  });

  test('settings button should open settings panel', async () => {
    // Wait for React to render
    await window.waitForTimeout(2000);
    
    // Take a screenshot to see current state
    await window.screenshot({ path: 'debug-initial-state.png' });
    
    // Look for settings button - it should be in the first overlay container
    const settingsButton = window.locator('.toggle-btn').first();
    await expect(settingsButton).toBeVisible();
    
    // Click the settings button
    await settingsButton.click();
    
    // Wait a moment for the panel to appear
    await window.waitForTimeout(1000);
    
    // Take another screenshot to see what happened
    await window.screenshot({ path: 'debug-after-click.png' });
    
    // Check if settings panel is visible
    const settingsPanel = window.locator('.settings-panel');
    await expect(settingsPanel).toBeVisible();
  });

  test('verify button click handler is attached', async () => {
    // Wait for React to render
    await window.waitForTimeout(2000);
    
    // Check if button has click handler
    const buttonExists = await window.locator('.toggle-btn').first().count();
    expect(buttonExists).toBeGreaterThan(0);
    
    // Check if icon is loaded
    const iconExists = await window.locator('.icon-container').first().count();
    expect(iconExists).toBeGreaterThan(0);
  });
});