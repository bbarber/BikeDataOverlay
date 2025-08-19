import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    actionTimeout: 5000,
    navigationTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Playwright will launch Electron with this configuration
        // Note: Test files will need to specify the main entry point
      },
    },
  ],
});
