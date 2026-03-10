/**
 * Vitest global test setup.
 *
 * Runs before every test file. Sets up:
 * - jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 * - Web Crypto API polyfill for Node.js/jsdom environment
 */

import "@testing-library/jest-dom/vitest";

// Node.js exposes Web Crypto at `globalThis.crypto` since v19+, but
// older Node / some jsdom setups may not have `crypto.subtle`. Ensure
// the full Web Crypto API is available for tests that use it.
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}
