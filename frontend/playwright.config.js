const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'test-results' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'e2e-tests',
      testDir: './tests/e2e',
      use: {
        // End-to-end application tests
      },
    },
    {
      name: 'feature-tests', 
      testDir: './tests/features',
      use: {
        // Feature-specific functionality tests
      },
    },
  ],
});