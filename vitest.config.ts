import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom simulates a browser environment so we can test React
    // components that use DOM APIs (like document.querySelector).
    environment: "jsdom",

    // Makes describe/it/expect available globally without importing —
    // matches the style most testing tutorials use.
    globals: true,

    // Load jest-dom matchers (like .toBeInTheDocument()) for every test
    // so we don't need to import them in each file.
    setupFiles: ["./src/test-setup.ts"],

    // Only look for test files in src/ (not node_modules, dist, etc.)
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
