const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Heart Rate Zones Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')],
      executablePath: require('electron')
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForSelector('.heart-rate-container', { timeout: 10000 });
    await window.waitForTimeout(2000);
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
    await expect(window.locator('#targetZoneMin')).toBeVisible();
    await expect(window.locator('#targetZoneMax')).toBeVisible();
  });

  test('HR zone configuration should work', async () => {
    // Hover and open HR zone panel
    await window.locator('.heart-rate-container').hover();
    await window.locator('#toggleHrZonePanel').click();
    await expect(window.locator('#hrZonePanel')).toHaveClass(/visible/);
    
    // Change target zone values
    await window.locator('#targetZoneMin').fill('130');
    await window.locator('#targetZoneMax').fill('170');
    
    // Save zones
    await window.locator('#saveHrZones').click();
    
    // Check that zone ranges updated
    await expect(window.locator('#zone2Range')).toHaveText('130-170 BPM');
  });

  test('test mode should simulate heart rate data', async () => {
    // Hover and open HR zone panel
    await window.locator('.heart-rate-container').hover();
    await window.locator('#toggleHrZonePanel').click();
    await expect(window.locator('#hrZonePanel')).toHaveClass(/visible/);
    
    // Enable test mode
    await window.locator('#toggleTestMode').click();
    await expect(window.locator('#toggleTestMode')).toHaveText('Test Mode: ON');
    
    // Wait for simulated data to appear
    await window.waitForTimeout(2000);
    
    // Heart rate should show a number (not --)
    const hrText = await window.locator('#heartRate').textContent();
    expect(hrText).not.toBe('--');
    expect(parseInt(hrText)).toBeGreaterThan(0);
  });

  test('heart rate should show correct zone and color', async () => {
    // Hover and open HR zone panel, enable test mode
    await window.locator('.heart-rate-container').hover();
    await window.locator('#toggleHrZonePanel').click();
    await window.locator('#toggleTestMode').click();
    
    // Wait for simulated data
    await window.waitForTimeout(2000);
    
    // Zone label should be visible and show a zone
    const zoneText = await window.locator('#hrZoneLabel').textContent();
    expect(zoneText).toMatch(/Zone [1-3]/);
    
    // HR value should have color class
    const hrElement = window.locator('#heartRate');
    const hasColorClass = await hrElement.evaluate(el => 
      el.classList.contains('hr-in-zone') || el.classList.contains('hr-out-of-zone')
    );
    expect(hasColorClass).toBe(true);
  });
});