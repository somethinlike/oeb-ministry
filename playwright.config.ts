import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // E2E tests live in their own directory, separate from unit tests.
  testDir: "./tests/e2e",

  // Run tests one at a time to avoid interference between test sessions.
  fullyParallel: false,

  // Fail the CI build if test.only() is accidentally committed.
  forbidOnly: !!process.env.CI,

  // Retry flaky tests once in CI, never locally (flaky = needs fixing).
  retries: process.env.CI ? 1 : 0,

  // Single worker to avoid port conflicts with the dev server.
  workers: 1,

  // HTML report for visual debugging after test runs.
  reporter: "html",

  use: {
    // All tests navigate relative to this URL.
    baseURL: "http://localhost:4321",

    // Capture a screenshot when a test fails so we can see what went wrong.
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  // Start the Astro dev server before running E2E tests.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
