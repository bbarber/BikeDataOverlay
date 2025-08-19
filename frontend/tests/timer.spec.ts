import { test, expect } from '@playwright/test';
import { _electron } from 'playwright';
import path from 'path';

const electron = _electron;

test.describe('Timer Functionality Tests', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    // Launch Electron app without DevTools for testing
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', '..', 'dist', 'main.js')], // Point to compiled main.js
      executablePath: require('electron')
    });

    // Get the first window that the app opens
    window = await electronApp.firstWindow();
    
    // Wait for the window to be ready and for the DOM to load
    await window.waitForLoadState('domcontentloaded');
    
    // Wait for app initialization and make sure core elements are present
    await window.waitForSelector('.time-container', { timeout: 10000 });
    await window.waitForTimeout(2000); // Extra wait for app initialization
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

  test('timer controls should have correct button icons', async () => {
    // Ensure timer container is visible first
    await expect(window.locator('.time-container')).toBeVisible();
    
    // Hover to make buttons visible
    await window.locator('.time-container').hover();
    
    // Wait for correct buttons to be visible (timer stopped: show Play + Reset)
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Check button icons using data-lucide attributes
    await expect(window.locator('#startTimer [data-lucide="play"]')).toBeVisible();
    await expect(window.locator('#resetTimer [data-lucide="rotate-ccw"]')).toBeVisible();
    
    // Start the timer to check pause button icon
    await window.locator('#startTimer').click();
    await expect(window.locator('#stopTimer')).toBeVisible();
    await expect(window.locator('#stopTimer [data-lucide="pause"]')).toBeVisible();
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
    
    // Wait for timer to start
    await window.waitForTimeout(1000);
    
    // Stop the timer
    await window.locator('#stopTimer').click();
    
    // Wait a bit more
    await window.waitForTimeout(1000);
    
    // Get the time when stopped
    const stoppedTime = await window.locator('#totalTime').textContent();
    
    // Start again and check it continues from where it left off
    await window.locator('#startTimer').click();
    await window.waitForTimeout(500);
    
    const continuedTime = await window.locator('#totalTime').textContent();
    
    // The continued time should be greater than or equal to the stopped time
    const stoppedSeconds = parseTimeToSeconds(stoppedTime || '00:00');
    const continuedSeconds = parseTimeToSeconds(continuedTime || '00:00');
    
    expect(continuedSeconds).toBeGreaterThanOrEqual(stoppedSeconds);
  });

  test('reset button should reset the timer to 00:00', async () => {
    // Start the timer
    await window.locator('.time-container').hover();
    await window.locator('#startTimer').click();
    
    // Wait for timer to start and run for a bit
    await window.waitForTimeout(2000);
    
    // Check that time has changed from 00:00
    const runningTime = await window.locator('#totalTime').textContent();
    expect(runningTime).not.toBe('00:00');
    
    // Reset the timer
    await window.locator('#resetTimer').click();
    
    // Check that time is back to 00:00
    await expect(window.locator('#totalTime')).toHaveText('00:00');
  });

  test('timer should maintain state across hover events', async () => {
    // Start the timer
    await window.locator('.time-container').hover();
    await window.locator('#startTimer').click();
    
    // Wait for timer to start
    await window.waitForTimeout(1000);
    
    // Move mouse away (timer controls should hide)
    await window.locator('body').click({ position: { x: 0, y: 0 } });
    
    // Wait a bit more
    await window.waitForTimeout(1000);
    
    // Hover back and check timer is still running
    await window.locator('.time-container').hover();
    
    // Get the current time
    const currentTime = await window.locator('#totalTime').textContent();
    
    // Should show more than 1 second has elapsed
    const elapsedSeconds = parseTimeToSeconds(currentTime || '00:00');
    expect(elapsedSeconds).toBeGreaterThan(1);
  });

  test('timer should handle rapid start/stop clicks gracefully', async () => {
    // Ensure timer container is visible and hover
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    
    // Rapidly click start multiple times
    for (let i = 0; i < 5; i++) {
      await window.locator('#startTimer').click();
      await window.waitForTimeout(100);
    }
    
    // Wait a bit and check timer is running
    await window.waitForTimeout(1000);
    const timeText = await window.locator('#totalTime').textContent();
    
    // Should show some elapsed time
    expect(timeText).toMatch(/00:0[1-9]|00:[1-9][0-9]/);
    
    // Rapidly click stop multiple times
    for (let i = 0; i < 5; i++) {
      await window.locator('#stopTimer').click();
      await window.waitForTimeout(100);
    }
    
    // Wait a bit and check timer is stopped
    await window.waitForTimeout(500);
    const stoppedTime = await window.locator('#totalTime').textContent();
    
    // Should show the same time (not running)
    await window.waitForTimeout(1000);
    const checkTime = await window.locator('#totalTime').textContent();
    
    expect(checkTime).toBe(stoppedTime);
  });

  test('timer should display correct button states during operation', async () => {
    // Ensure timer container is visible and hover
    await expect(window.locator('.time-container')).toBeVisible();
    await window.locator('.time-container').hover();
    
    // Initial state: start and reset visible, stop hidden
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#stopTimer')).toBeHidden();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Start timer
    await window.locator('#startTimer').click();
    
    // Running state: stop and reset visible, start hidden
    await expect(window.locator('#startTimer')).toBeHidden();
    await expect(window.locator('#stopTimer')).toBeVisible();
    await expect(window.locator('#resetTimer')).toBeVisible();
    
    // Stop timer
    await window.locator('#stopTimer').click();
    
    // Stopped state: start and reset visible, stop hidden
    await expect(window.locator('#startTimer')).toBeVisible();
    await expect(window.locator('#stopTimer')).toBeHidden();
    await expect(window.locator('#resetTimer')).toBeVisible();
  });

  test('timer should handle long running sessions', async () => {
    // Start the timer
    await window.locator('.time-container').hover();
    await window.locator('#startTimer').click();
    
    // Wait for 3 seconds
    await window.waitForTimeout(3000);
    
    // Check that time shows at least 3 seconds
    const timeText = await window.locator('#totalTime').textContent();
    const elapsedSeconds = parseTimeToSeconds(timeText || '00:00');
    
    expect(elapsedSeconds).toBeGreaterThanOrEqual(3);
    
    // Stop and check final time
    await window.locator('#stopTimer').click();
    const finalTime = await window.locator('#totalTime').textContent();
    
    // Should show the elapsed time
    expect(finalTime).not.toBe('00:00');
  });
});

// Helper function to parse MM:SS time format to seconds
function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}
