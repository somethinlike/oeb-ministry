/**
 * Hydration Safety Scanner
 *
 * Scans all React component files (.tsx) for browser-only API usage
 * that could cause hydration mismatches between server and client.
 *
 * WHY: Astro SSR renders components on the server where browser APIs
 * (window, localStorage, caches, navigator, document) don't exist.
 * If a component's render output depends on these APIs, the server
 * HTML and client's first render will differ, causing React to throw
 * a hydration error and re-render the entire tree from scratch.
 *
 * SAFE patterns (won't cause mismatches):
 *   - Browser APIs inside useEffect / useCallback / event handlers
 *   - Browser APIs gated by useHydrated() hook
 *   - Browser APIs in utility functions that are only called from effects
 *
 * UNSAFE patterns (will cause mismatches):
 *   - typeof window/caches/document in JSX conditionals without useHydrated
 *   - window.innerWidth in useState initializers
 *   - localStorage.getItem in useState initializers
 *   - navigator.* in render logic
 *
 * HOW TO FIX a flagged file:
 *   1. Import useHydrated from "../hooks/useHydrated"
 *   2. Gate the browser-only JSX: {hydrated && <BrowserOnlyStuff />}
 *   3. Move browser-only state init into a useEffect
 *   4. If it's a false positive, add the file to AUDITED_FILES
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/** Recursive file finder (no glob dependency) */
function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext) && !entry.name.includes(".test.")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Browser-only patterns checked LINE BY LINE.
 *
 * "requiresHydratedImport" means the pattern is OK if the file imports
 * useHydrated (the hook provides the proper guard). Without the import,
 * the typeof check is likely an unguarded render-path conditional.
 */
const LINE_PATTERNS = [
  {
    pattern: /typeof\s+(caches|document)\s*(!==|===)\s*["']undefined["']/,
    name: "typeof caches/document check in render path",
    hint: "Import useHydrated and gate with: hydrated && typeof caches !== 'undefined'",
    requiresHydratedImport: true,
  },
  {
    // typeof window is common in utility code and effects — only flag in JSX conditionals
    // Look for the pattern at the START of a JSX expression: {typeof window
    pattern: /\{typeof\s+window\s*(!==|===)\s*["']undefined["']/,
    name: "typeof window check in JSX conditional",
    hint: "Import useHydrated and gate with: hydrated && ...",
    requiresHydratedImport: true,
  },
  {
    // window.innerWidth/innerHeight/screen in useState initializer (same line)
    pattern: /useState\([^)]*window\.(innerWidth|innerHeight|screen)/,
    name: "window dimensions in useState initializer",
    hint: "Initialize with a neutral default, set real value in useEffect",
    requiresHydratedImport: false,
  },
  {
    // localStorage/sessionStorage directly in useState call (same line)
    pattern: /useState\([^)]*\b(localStorage|sessionStorage)\b/,
    name: "localStorage/sessionStorage in useState initializer",
    hint: "Initialize with defaults, load from storage in useEffect",
    requiresHydratedImport: false,
  },
];

/**
 * Files that have been manually audited and confirmed safe despite
 * matching a pattern. Map of relative path -> list of pattern names
 * that are known safe in that file.
 *
 * Add a file here ONLY after verifying the matched pattern is actually
 * safe (e.g., it's in a function only called from useEffect, or the
 * component is client-only and never SSR'd).
 */
const AUDITED_FILES: Record<string, string[]> = {
  // Example:
  // "components/SomeClientOnly.tsx": ["typeof caches/document check in render path"],
};

const SRC_ROOT = path.resolve(__dirname, "..");

describe("Hydration Safety", () => {
  const tsxFiles = findFiles(
    path.join(SRC_ROOT, "components"),
    ".tsx",
  ).concat(findFiles(path.join(SRC_ROOT, "hooks"), ".tsx"));

  it("finds component files to scan", () => {
    expect(tsxFiles.length).toBeGreaterThan(0);
  });

  it("no unsafe browser API usage in component render paths", () => {
    const violations: string[] = [];

    for (const filePath of tsxFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relativePath = path.relative(SRC_ROOT, filePath);
      const auditedPatterns = AUDITED_FILES[relativePath] ?? [];
      const hasHydratedImport = /\buseHydrated\b/.test(content);

      for (const { pattern, name, hint, requiresHydratedImport } of LINE_PATTERNS) {
        if (auditedPatterns.includes(name)) continue;

        // If the pattern is safe when useHydrated is imported, skip it
        if (requiresHydratedImport && hasHydratedImport) continue;

        // Check each line individually (prevents cross-line false positives)
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(
              `${relativePath}:${i + 1} — ${name}\n  Fix: ${hint}`,
            );
            break; // one violation per pattern per file is enough
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} potential hydration mismatch(es):\n\n` +
          violations.join("\n\n") +
          "\n\nSee src/hooks/useHydrated.ts for the standard fix pattern.\n" +
          "If a match is a false positive, add it to AUDITED_FILES in this test.",
      );
    }
  });

  it("audited files still exist (no stale allowlist entries)", () => {
    for (const relativePath of Object.keys(AUDITED_FILES)) {
      const fullPath = path.join(SRC_ROOT, relativePath);
      expect(
        fs.existsSync(fullPath),
        `Stale AUDITED_FILES entry: ${relativePath} no longer exists — remove it`,
      ).toBe(true);
    }
  });
});
