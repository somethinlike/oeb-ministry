/**
 * E2E: Landing page — verifies the public-facing entry point.
 *
 * These tests run against the real app (not mocks) to verify
 * what users actually see when they visit the site.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("shows the hero heading and call to action", async ({ page }) => {
    await page.goto("/");

    // The main heading should be visible
    await expect(
      page.getByRole("heading", { name: /your bible.*your notes/i }),
    ).toBeVisible();

    // The "Get started" CTA should be present and link to sign-in
    const cta = page.getByRole("link", { name: /get started/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/auth/signin");
  });

  test("shows three feature highlights", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Read freely")).toBeVisible();
    await expect(page.getByText("Write your thoughts")).toBeVisible();
    await expect(page.getByText("Your data, always")).toBeVisible();
  });

  test("has proper page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/OEB Ministry/);
  });
});
