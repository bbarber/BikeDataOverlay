import { _electron as electron, ElectronApplication } from 'playwright';
import * as path from 'path';

/**
 * Launch Electron app for testing with correct Electron Forge structure
 */
export async function launchElectronApp(): Promise<ElectronApplication> {
  // Try to launch with the packaged app first
  const packagedAppPath = path.join(__dirname, '..', 'out', 'Bike Data Overlay-darwin-arm64', 'Bike Data Overlay.app', 'Contents', 'MacOS', 'bike-data-overlay');
  
  try {
    // Launch the packaged app
    return await electron.launch({
      executablePath: packagedAppPath
    });
  } catch (error) {
    console.log('Packaged app not found, trying .vite build...');
    
    // Fallback to .vite build
    const mainPath = path.join(__dirname, '..', '.vite', 'build', 'main.js');
    try {
      return await electron.launch({
        args: [mainPath],
        executablePath: require('electron')
      });
    } catch (error2) {
      console.log('Built app not found either, building first...');
      
      // If neither exists, we need to build first
      throw new Error(
        'Electron app not built. Please run "npm run package" or "npm start" once to build the app before running tests.'
      );
    }
  }
}

/**
 * Common setup for Electron tests
 */
export async function setupElectronTest() {
  const electronApp = await launchElectronApp();
  const window = await electronApp.firstWindow();
  
  // Wait for the window to be ready and for the DOM to load
  await window.waitForLoadState('domcontentloaded');
  
  return { electronApp, window };
}

/**
 * Wait for the app to be fully initialized
 */
export async function waitForAppInitialization(window: any, containerSelector = '.overlay-container') {
  // Wait for app initialization and make sure core elements are present
  await window.waitForSelector(containerSelector, { timeout: 15000 });
  await window.waitForTimeout(3000); // Extra wait for app initialization and Bluetooth setup
}
