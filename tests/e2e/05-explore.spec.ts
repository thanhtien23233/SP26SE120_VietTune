import { test, expect } from "@playwright/test";

test("explore page loads", async ({ page }) => {
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.getByRole("main").first()).toBeVisible();
});
