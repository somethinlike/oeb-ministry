/**
 * E2E: Authentication flow — verifies sign-in page and route protection.
 *
 * Note: We can't test the full OAuth flow in E2E (it requires real OAuth
 * provider interaction). We test the sign-in page renders correctly and
 * that protected routes redirect unauthenticated users.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows sign-in page with OAuth provider buttons", async ({ page }) => {
    await page.goto("/auth/signin");

    // All four provider buttons should be visible
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with github/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with microsoft/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with discord/i }),
    ).toBeVisible();
  });

  test("redirects unauthenticated users from /app to sign-in", async ({
    page,
  }) => {
    // Try to access a protected route without being signed in
    await page.goto("/app/read");

    // Should be redirected to sign-in with a return URL
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("sign-in page has accessible role group for buttons", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    const group = page.getByRole("group", { name: /sign in options/i });
    await expect(group).toBeVisible();
  });
});
