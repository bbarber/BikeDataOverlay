import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { setupElectronTest, waitForAppInitialization } from './test-helpers';

test.describe('Timer Functionality Tests', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    // Launch Electron app using helper
    const setup = await setupElectronTest();
    electronApp = setup.electronApp;
    window = setup.window;
    
    // Wait for app initialization and make sure core elements are present
    await waitForAppInitialization(window, '.time-container');
  });

  test.afterEach(async () => {
    // Clean up
    await electronApp.close();
  });

  test('timer should display initial time as 00:00', async () => {
    // Check initial timer display
    await expect(window.locator('#totalTime')).toHaveText('00:00');
    await expect(window.locator('.time-container .metric-label')).toHaveText('TIME');
  });

  test('timer controls should be hidden by default', async () => {
    // First ensure timer container is visible
    await expect(window.locator('.time-container')).toBeVisible();
    
    // Timer controls should not be visible initially (without hover)
    const timerControls = window.locator('.timer-controls');
    await expect(timerControls).toHaveCSS('opacity', '0');
    await expect(timerControls).toHaveCSS('pointer-events', 'none');
  });

  test('timer controls should appear on hover with correct visibility', async () => {
    // First ensure timer container is visible
    await expect(window.locator('.time-container')).toBeVisible();
    
    // Hover over the timer container
    await window.locator('.time-container').hover();
    
    // Wait for hover effect and check correct buttons are visible (timer stopped: show Play + Reset)
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#stopTimer')).toBeHidden();
    await expect(window.locator('#resetTimer')).toBeVisible();
  });

  test('timer controls should have correct buttons visible', async () => {
    // Ensure timer container is visible first
    await expect(window.locator('.time-container')).toBeVisible();
    
    // Hover to make buttons visible
    await window.locator('.time-container').hover();
    
    // Wait for correct buttons to be visible (timer stopped: show Play + Reset)
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Check that buttons have SVG icons
    await expect(window.locator('#startTimer svg')).toBeVisible();
    await expect(window.locator('#resetTimer svg')).toBeVisible();
    
    // Start the timer to check pause button appears
    await window.locator('#startTimer').click();
    await expect(window.locator('#stopTimer')).toBeVisible();
    await expect(window.locator('#stopTimer svg')).toBeVisible();
  });

  test('start button should start the timer', async () => {
    // Ensure timer container is visible and hover
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    
    // Wait a bit and check that time has changed
    await window.waitForTimeout(1500);
    const timeText = await window.locator('#totalTime').textContent();
    
    // Should show some elapsed time (at least 1 second)
    expect(timeText).toMatch(/00:0[1-9]|00:[1-9][0-9]/);
  });

  test('stop button should pause the timer', async () => {
    // Start the timer
    await window.locator('.time-container').hover();
    await window.locator('#startTimer').click();
    
    // Wait for some time to elapse
    await window.waitForTimeout(1500);
    
    // Stop the timer and get the time
    await window.locator('#stopTimer').click();
    const stoppedTime = await window.locator('#totalTime').textContent();
    
    // Wait a bit more and verify time hasn't changed
    await window.waitForTimeout(1000);
    const currentTime = await window.locator('#totalTime').textContent();
    
    expect(currentTime).toBe(stoppedTime);
  });

  test('reset button should reset timer to 00:00', async () => {
    // Start timer and let it run
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    await window.waitForTimeout(1500);
    
    // Verify time has elapsed
    const timeText = await window.locator('#totalTime').textContent();
    expect(timeText).not.toBe('00:00');
    
    // Reset the timer
    await expect(window.locator('#resetTimer')).toBeVisible();
    await window.locator('#resetTimer').click();
    
    // Should be back to 00:00
    await expect(window.locator('#totalTime')).toHaveText('00:00');
  });

  test('timer should resume from stopped time when restarted', async () => {
    // Start timer and let it run
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    await window.waitForTimeout(1500);
    
    // Stop the timer
    await expect(window.locator('#stopTimer')).toBeVisible();
    await window.locator('#stopTimer').click();
    const stoppedTime = await window.locator('#totalTime').textContent();
    
    // Start again and wait a bit
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    await window.waitForTimeout(1000);
    
    // Time should be greater than the stopped time
    const newTime = await window.locator('#totalTime').textContent();
    
    // Parse times for comparison
    const parseTime = (timeStr: string | null): number => {
      if (!timeStr) return 0;
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    };
    
    expect(parseTime(newTime)).toBeGreaterThan(parseTime(stoppedTime));
  });

  test('button visibility changes correctly during timer state changes', async () => {
    // Hover and verify initial state (timer stopped: show Play + Reset)
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#stopTimer')).toBeHidden();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Start timer and verify running state (show Pause + Reset)
    await window.locator('#startTimer').click();
    await expect(window.locator('#startTimer')).toBeHidden();
    await expect(window.locator('#stopTimer')).toBeVisible();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Wait and verify timer is working
    await window.waitForTimeout(1500);
    const timeText = await window.locator('#totalTime').textContent();
    expect(timeText).toMatch(/00:0[1-9]|00:[1-9][0-9]/);
  });

  test('timer formatting should be correct', async () => {
    // Start timer
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    
    // Wait for various time intervals and check formatting
    await window.waitForTimeout(500);
    let timeText = await window.locator('#totalTime').textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
    
    await window.waitForTimeout(1000);
    timeText = await window.locator('#totalTime').textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
  });

  test('complete timer workflow should work correctly', async () => {
    // 1. Initial state
    await expect(window.locator('#totalTime')).toHaveText('00:00');
    
    // 2. Start timer
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    await window.waitForTimeout(1200);
    
    // 3. Verify running
    let timeText = await window.locator('#totalTime').textContent();
    expect(timeText).toMatch(/00:0[1-9]/);
    
    // 4. Pause
    await expect(window.locator('#stopTimer')).toBeVisible();
    await window.locator('#stopTimer').click();
    const pausedTime = await window.locator('#totalTime').textContent();
    
    // 5. Resume
    await expect(window.locator('#startTimer')).toBeVisible();
    await window.locator('#startTimer').click();
    await window.waitForTimeout(1000);
    timeText = await window.locator('#totalTime').textContent();
    
    // 6. Verify resumed and time increased
    const parseTime = (timeStr: string | null): number => {
      if (!timeStr) return 0;
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    };
    expect(parseTime(timeText)).toBeGreaterThan(parseTime(pausedTime));
    
    // 7. Reset
    await expect(window.locator('#resetTimer')).toBeVisible();
    await window.locator('#resetTimer').click();
    await expect(window.locator('#totalTime')).toHaveText('00:00');
  });
});
