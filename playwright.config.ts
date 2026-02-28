// Playwright configuration for end-to-end tests.

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',

  // Sequential within a file (journey steps read top-to-bottom), parallel across files.
  fullyParallel: false,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    [
      'monocart-reporter',
      {
        name: 'Daylog Coverage Report',
        outputFile: 'coverage/index.html',
        coverage: {
          reports: ['v8', 'console-details'],
          sourceFilter: (sourcePath: string) =>
            sourcePath.search(/src\//) !== -1 &&
            !sourcePath.includes('node_modules'),
        },
      },
    ],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
