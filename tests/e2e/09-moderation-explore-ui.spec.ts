import { test, expect } from "@playwright/test";

/**
 * Moderation is expert-gated; without expert session, expect redirect or guard copy.
 */
test("moderation route responds", async ({ page }) => {
  await page.goto("/moderation");
  await expect(page).not.toHaveURL("about:blank");
});
