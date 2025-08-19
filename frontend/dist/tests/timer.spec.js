"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
test_1.test.describe('Timer Functionality Tests', () => {
    let electronApp;
    let window;
    test_1.test.beforeEach(async () => {
        electronApp = await playwright_1._electron.launch({
            args: [path.join(__dirname, '..', 'main.js')],
            executablePath: require('electron')
        });
        window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');
        await window.waitForSelector('.time-container', { timeout: 10000 });
        await window.waitForTimeout(2000);
    });
    test_1.test.afterEach(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('timer should display initial time as 00:00', async () => {
        await (0, test_1.expect)(window.locator('#totalTime')).toHaveText('00:00');
        await (0, test_1.expect)(window.locator('.time-container .metric-label')).toHaveText('TIME');
    });
    (0, test_1.test)('timer controls should be hidden by default', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        const timerControls = window.locator('.timer-controls');
        await (0, test_1.expect)(timerControls).toHaveCSS('opacity', '0');
        await (0, test_1.expect)(timerControls).toHaveCSS('pointer-events', 'none');
    });
    (0, test_1.test)('timer controls should appear on hover with correct visibility', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeHidden();
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
    });
    (0, test_1.test)('timer controls should have correct button icons', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#startTimer [data-lucide="play"]')).toBeVisible();
        await (0, test_1.expect)(window.locator('#resetTimer [data-lucide="rotate-ccw"]')).toBeVisible();
        await window.locator('#startTimer').click();
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#stopTimer [data-lucide="pause"]')).toBeVisible();
    });
    (0, test_1.test)('start button should start the timer', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1500);
        const timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).toMatch(/00:0[1-9]|00:[1-9][0-9]/);
    });
    (0, test_1.test)('stop button should pause the timer', async () => {
        await window.locator('.time-container').hover();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1500);
        await window.locator('#stopTimer').click();
        const stoppedTime = await window.locator('#totalTime').textContent();
        await window.waitForTimeout(1000);
        const currentTime = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(currentTime).toBe(stoppedTime);
    });
    (0, test_1.test)('reset button should reset timer to 00:00', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1500);
        let timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).not.toBe('00:00');
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
        await window.locator('#resetTimer').click();
        await (0, test_1.expect)(window.locator('#totalTime')).toHaveText('00:00');
    });
    (0, test_1.test)('timer should resume from stopped time when restarted', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1500);
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeVisible();
        await window.locator('#stopTimer').click();
        const stoppedTime = await window.locator('#totalTime').textContent();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1000);
        const newTime = await window.locator('#totalTime').textContent();
        const parseTime = (timeStr) => {
            if (!timeStr)
                return 0;
            const [minutes, seconds] = timeStr.split(':').map(Number);
            return minutes * 60 + seconds;
        };
        (0, test_1.expect)(parseTime(newTime)).toBeGreaterThan(parseTime(stoppedTime));
    });
    (0, test_1.test)('button visibility changes correctly during timer state changes', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeHidden();
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeHidden();
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeVisible();
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
        await window.waitForTimeout(1500);
        const timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).toMatch(/00:0[1-9]|00:[1-9][0-9]/);
    });
    (0, test_1.test)('timer formatting should be correct', async () => {
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(500);
        let timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).toMatch(/^\d{2}:\d{2}$/);
        await window.waitForTimeout(1000);
        timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).toMatch(/^\d{2}:\d{2}$/);
    });
    (0, test_1.test)('complete timer workflow should work correctly', async () => {
        await (0, test_1.expect)(window.locator('#totalTime')).toHaveText('00:00');
        await (0, test_1.expect)(window.locator('.time-container')).toBeVisible();
        await window.locator('.time-container').hover();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1200);
        let timeText = await window.locator('#totalTime').textContent();
        (0, test_1.expect)(timeText).toMatch(/00:0[1-9]/);
        await (0, test_1.expect)(window.locator('#stopTimer')).toBeVisible();
        await window.locator('#stopTimer').click();
        const pausedTime = await window.locator('#totalTime').textContent();
        await (0, test_1.expect)(window.locator('#startTimer')).toBeVisible();
        await window.locator('#startTimer').click();
        await window.waitForTimeout(1000);
        timeText = await window.locator('#totalTime').textContent();
        const parseTime = (timeStr) => {
            if (!timeStr)
                return 0;
            const [minutes, seconds] = timeStr.split(':').map(Number);
            return minutes * 60 + seconds;
        };
        (0, test_1.expect)(parseTime(timeText)).toBeGreaterThan(parseTime(pausedTime));
        await (0, test_1.expect)(window.locator('#resetTimer')).toBeVisible();
        await window.locator('#resetTimer').click();
        await (0, test_1.expect)(window.locator('#totalTime')).toHaveText('00:00');
    });
});
