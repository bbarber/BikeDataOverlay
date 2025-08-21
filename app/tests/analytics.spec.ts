import { test, expect } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('HR Zone Analytics', () => {
  test('should show analytics button in HR zone panel', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Click the HR zone panel toggle to open it
    await window.click('#toggleHrZonePanel');
    
    // Wait for the panel to be visible
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    
    // Check that the analytics button is present
    const analyticsButton = await window.locator('#toggleAnalyticsPanel');
    await expect(analyticsButton).toBeVisible();
    await expect(analyticsButton).toContainText('Session Stats');

    await electronApp.close();
  });

  test('should open analytics panel when button is clicked', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open HR zone panel first
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    
    // Click the analytics button
    await window.click('#toggleAnalyticsPanel');
    
    // Check that analytics panel opens
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Verify analytics panel content
    await expect(window.locator('.analytics-panel-header h3')).toContainText('HR Zone Analytics');
    await expect(window.locator('#analyticsSessionTime')).toBeVisible();
    await expect(window.locator('.zone-histogram')).toBeVisible();

    await electronApp.close();
  });

  test('should show empty state when no HR data', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open analytics panel
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    await window.click('#toggleAnalyticsPanel');
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Check empty state is visible
    await expect(window.locator('#analyticsEmptyState')).toBeVisible();
    await expect(window.locator('.empty-title')).toContainText('No HR Data Yet');
    
    // Check histogram is hidden
    await expect(window.locator('.zone-histogram')).toHaveCSS('display', 'none');

    await electronApp.close();
  });

  test('should close analytics panel with close button', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open analytics panel
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    await window.click('#toggleAnalyticsPanel');
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Click close button
    await window.click('#closeAnalyticsPanel');
    
    // Check that analytics panel is closed
    await window.waitForSelector('.hr-analytics-panel:not(.visible)', { timeout: 5000 });

    await electronApp.close();
  });

  test('should display histogram bars with correct zone colors', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open analytics panel
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    await window.click('#toggleAnalyticsPanel');
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Check that all 5 zone bars are present
    for (let i = 1; i <= 5; i++) {
      const barContainer = window.locator(`.histogram-bar-container[data-zone="${i}"]`);
      await expect(barContainer).toBeVisible();
      
      const bar = barContainer.locator('.histogram-bar');
      await expect(bar).toHaveClass(new RegExp(`zone-${i}`));
      
      const zoneName = barContainer.locator('.zone-name');
      await expect(zoneName).toContainText(`Zone ${i}`);
      
      const zoneTime = barContainer.locator('.zone-time');
      await expect(zoneTime).toContainText('00:00');
    }

    await electronApp.close();
  });

  test('should update zone ranges when HR config changes', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open HR zone panel and change age
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    
    // Change age to trigger zone recalculation
    await window.fill('#userAge', '25');
    
    // Open analytics panel
    await window.click('#toggleAnalyticsPanel');
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Check that zone ranges are updated in analytics
    const zone1Range = await window.locator('#analyticsZone1Range').textContent();
    expect(zone1Range).toMatch(/\d+-\d+ BPM/);

    await electronApp.close();
  });

  test('should show session time in analytics panel', async () => {
    const { electronApp, window } = await setupElectronTest();
    await waitForAppInitialization(window);

    // Open analytics panel
    await window.click('#toggleHrZonePanel');
    await window.waitForSelector('.hr-zone-panel.visible', { timeout: 5000 });
    await window.click('#toggleAnalyticsPanel');
    await window.waitForSelector('.hr-analytics-panel.visible', { timeout: 5000 });
    
    // Check initial session time
    await expect(window.locator('#analyticsSessionTime')).toContainText('00:00');
    
    // Start timer
    await window.click('#startTimer');
    
    // Wait a bit and check session time updates
    await window.waitForTimeout(2000);
    const sessionTime = await window.locator('#analyticsSessionTime').textContent();
    expect(sessionTime).not.toBe('00:00');

    await electronApp.close();
  });
});