import { test, expect } from "@playwright/test";

test.describe("catalogues (guest)", () => {
  test("Instruments page loads", async ({ page }) => {
    await page.goto("/instruments");
    await expect(page.locator("h1", { hasText: "Nhạc cụ truyền thống" })).toBeVisible();
  });

  test("Ethnicities page loads", async ({ page }) => {
    await page.goto("/ethnicities");
    await expect(page.locator("h1", { hasText: "Dân tộc Việt Nam" })).toBeVisible();
  });

  test("Masters page loads", async ({ page }) => {
    await page.goto("/masters");
    await expect(page.locator("h1", { hasText: "Nghệ nhân âm nhạc" })).toBeVisible();
  });
});

