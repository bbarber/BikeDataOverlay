const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 1000,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'test-results' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Playwright will launch Electron with this configuration
      },
    },
  ],
});