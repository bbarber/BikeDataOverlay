/**
 * Playwright Demo Script for Bike Data Overlay
 * 
 * This script demonstrates how to use Playwright to interact with the Electron UI
 * You can run this via the Playwright MCP server with Claude Code
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function demoElectronInteraction() {
  console.log('🚀 Starting Electron app automation demo...');
  
  // Launch the Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, 'main.js'), '--dev'],
    executablePath: require('electron')
  });

  try {
    // Get the main window
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);

    console.log('✅ App launched successfully');

    // Take a screenshot of the initial state
    await window.screenshot({ path: 'initial-state.png' });
    console.log('📸 Screenshot saved: initial-state.png');

    // Check if the toggle button is visible
    const toggleButton = window.locator('#toggleDevicePanel');
    if (await toggleButton.isVisible()) {
      console.log('✅ Device panel toggle button is visible');
      
      // Click to open the device panel
      await toggleButton.click();
      console.log('🔄 Clicked toggle button to open device panel');
      
      await window.waitForTimeout(500);
      
      // Take a screenshot with panel open
      await window.screenshot({ path: 'panel-open.png' });
      console.log('📸 Screenshot saved: panel-open.png');
      
      // Check if scan button is visible and click it
      const scanButton = window.locator('#scanDevicesBtn');
      if (await scanButton.isVisible()) {
        console.log('✅ Scan devices button is visible');
        await scanButton.click();
        console.log('🔄 Clicked scan devices button');
        
        await window.waitForTimeout(2000);
        
        // Take a screenshot during scanning
        await window.screenshot({ path: 'scanning.png' });
        console.log('📸 Screenshot saved: scanning.png');
      }
      
      // Close the panel
      await toggleButton.click();
      console.log('🔄 Closed device panel');
      
    } else {
      console.log('❌ Device panel toggle button not found');
    }

    // Monitor the watts display for a few seconds
    console.log('👁️ Monitoring watts display...');
    for (let i = 0; i < 5; i++) {
      const wattsValue = await window.locator('#watts').textContent();
      console.log(`⚡ Current watts value: ${wattsValue}`);
      await window.waitForTimeout(1000);
    }

  } catch (error) {
    console.error('❌ Error during automation:', error);
  } finally {
    // Close the app
    await electronApp.close();
    console.log('🛑 App closed');
  }
}

// Export for use with Playwright MCP
module.exports = { demoElectronInteraction };

// Run directly if this file is executed
if (require.main === module) {
  demoElectronInteraction().catch(console.error);
}