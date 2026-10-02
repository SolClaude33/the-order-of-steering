import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '.local/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5180',
    channel: 'msedge',
    viewport: { width: 1440, height: 960 },
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node --experimental-strip-types tests/support/api.ts',
      url: 'http://127.0.0.1:5181/api/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180',
      url: 'http://127.0.0.1:5180',
      env: { ORDER_API_PROXY: 'http://127.0.0.1:5181' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
