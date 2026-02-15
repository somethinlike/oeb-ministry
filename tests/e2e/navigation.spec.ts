/**
 * E2E: Navigation — verifies the 404 page and basic routing.
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("shows friendly 404 page for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");

    // Should show the 404 page
    await expect(
      page.getByRole("heading", { name: /couldn't find that page/i }),
    ).toBeVisible();

    // Should have links to go home or start reading
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /start reading/i }),
    ).toBeVisible();
  });

  test("landing page links work", async ({ page }) => {
    await page.goto("/");

    // "Read the Bible" link should be present
    const readLink = page.getByRole("link", { name: /read the bible/i });
    await expect(readLink).toBeVisible();
  });
});
