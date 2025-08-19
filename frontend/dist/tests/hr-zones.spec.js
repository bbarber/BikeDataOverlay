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
test_1.test.describe('Heart Rate Zones Tests', () => {
    let electronApp;
    let window;
    test_1.test.beforeEach(async () => {
        electronApp = await playwright_1._electron.launch({
            args: [path.join(__dirname, '..', 'main.js')],
            executablePath: require('electron')
        });
        window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');
        await window.waitForSelector('.heart-rate-container', { timeout: 10000 });
        await window.waitForTimeout(2000);
    });
    test_1.test.afterEach(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('heart rate container should be visible', async () => {
        await (0, test_1.expect)(window.locator('.heart-rate-container')).toBeVisible();
        await (0, test_1.expect)(window.locator('#heartRate')).toBeVisible();
        await (0, test_1.expect)(window.locator('#hrZoneLabel')).toBeVisible();
    });
    (0, test_1.test)('HR zone toggle button should be visible on hover', async () => {
        await window.locator('.heart-rate-container').hover();
        await (0, test_1.expect)(window.locator('#toggleHrZonePanel')).toBeVisible();
    });
    (0, test_1.test)('HR zone panel should open when toggle clicked', async () => {
        await window.locator('.heart-rate-container').hover();
        await window.locator('#toggleHrZonePanel').click();
        await (0, test_1.expect)(window.locator('#hrZonePanel')).toHaveClass(/visible/);
        await (0, test_1.expect)(window.locator('#userAge')).toBeVisible();
        await (0, test_1.expect)(window.locator('#restingHR')).toBeVisible();
    });
    (0, test_1.test)('HR zone configuration should work', async () => {
        await window.locator('.heart-rate-container').hover();
        await window.locator('#toggleHrZonePanel').click();
        await (0, test_1.expect)(window.locator('#hrZonePanel')).toHaveClass(/visible/);
        await window.locator('#userAge').fill('25');
        await window.locator('#restingHR').fill('50');
        await window.locator('#zone3').click();
        await (0, test_1.expect)(window.locator('#zone3')).toBeChecked();
        await (0, test_1.expect)(window.locator('#zone3Range')).toBeVisible();
    });
    (0, test_1.test)('heart rate should show correct zone and color', async () => {
        await (0, test_1.expect)(window.locator('#hrZoneLabel')).toBeVisible();
        const zoneText = await window.locator('#hrZoneLabel').textContent();
        (0, test_1.expect)(zoneText).toMatch(/Zone [1-5]/);
        await (0, test_1.expect)(window.locator('#heartRate')).toBeVisible();
        const hrText = await window.locator('#heartRate').textContent();
        (0, test_1.expect)(hrText).toBe('--');
    });
});
