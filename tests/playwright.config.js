import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../test-results/html-report' }]],
  outputDir: '../test-results/artifacts',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port 1420 --strictPort',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    cwd: '..',
    env: {
      VITE_TEST_MODE: 'true',
    },
  },
})
