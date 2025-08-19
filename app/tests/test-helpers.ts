import { _electron as electron, ElectronApplication } from 'playwright';
import * as path from 'path';

/**
 * Launch Electron app for testing with correct Electron Forge structure
 */
export async function launchElectronApp(): Promise<ElectronApplication> {
  // First check if the app is already built
  const mainPath = path.join(__dirname, '..', '.vite', 'build', 'main.js');
  
  try {
    // Try to launch with the built main file
    return await electron.launch({
      args: [mainPath],
      executablePath: require('electron')
    });
  } catch (error) {
    console.log('Built app not found, building first...');
    
    // If built app doesn't exist, we need to build it first
    // For now, throw an error with instructions
    throw new Error(
      'Electron app not built. Please run "npm run package" or "npm start" once to build the app before running tests.'
    );
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
export async function waitForAppInitialization(window: any, containerSelector: string = '.overlay-container') {
  // Wait for app initialization and make sure core elements are present
  await window.waitForSelector(containerSelector, { timeout: 15000 });
  await window.waitForTimeout(3000); // Extra wait for app initialization and Bluetooth setup
}
