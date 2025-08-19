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
test_1.test.describe('Toggle Button Behavior Tests', () => {
    let electronApp;
    let window;
    test_1.test.beforeEach(async () => {
        electronApp = await playwright_1._electron.launch({
            args: [path.join(__dirname, '..', 'main.js')],
            executablePath: require('electron')
        });
        window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');
        await window.waitForSelector('.overlay-container', { timeout: 10000 });
        await window.waitForTimeout(2000);
    });
    test_1.test.afterEach(async () => {
        await electronApp.close();
    });
    (0, test_1.test)('toggle button should work with simple click', async () => {
        await (0, test_1.expect)(window.locator('#devicePanel')).not.toHaveClass(/visible/);
        await window.locator('.overlay-container').first().hover();
        await window.locator('#toggleDevicePanel').click();
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
        await window.locator('#toggleDevicePanel').click();
        await (0, test_1.expect)(window.locator('#devicePanel')).not.toHaveClass(/visible/);
    });
    (0, test_1.test)('toggle button should stay responsive after multiple clicks', async () => {
        await window.locator('.overlay-container').first().hover();
        for (let i = 0; i < 5; i++) {
            await window.locator('#toggleDevicePanel').click();
            await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
            await window.locator('#toggleDevicePanel').click();
            await (0, test_1.expect)(window.locator('#devicePanel')).not.toHaveClass(/visible/);
        }
    });
    (0, test_1.test)('device panel should stay open after opening', async () => {
        await window.locator('.overlay-container').first().hover();
        await window.locator('#toggleDevicePanel').click();
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
        await window.waitForTimeout(2000);
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
        await (0, test_1.expect)(window.locator('.device-panel-header h3')).toHaveText('Bluetooth Devices');
        await (0, test_1.expect)(window.locator('#scanDevicesBtn')).toBeVisible();
        await (0, test_1.expect)(window.locator('#refreshDevicesBtn')).toBeVisible();
    });
    (0, test_1.test)('device panel mouse interaction should work', async () => {
        await window.locator('.overlay-container').first().hover();
        await window.locator('#toggleDevicePanel').click();
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
        await window.locator('#devicePanel').hover();
        await window.waitForTimeout(500);
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
        await window.locator('.device-panel-header').click();
        await window.waitForTimeout(500);
        await (0, test_1.expect)(window.locator('#devicePanel')).toHaveClass(/visible/);
    });
});
