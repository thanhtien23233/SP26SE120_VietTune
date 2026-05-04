import { test, expect } from "@playwright/test";

test.describe("static pages (guest)", () => {
  test("About page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1", { hasText: "Giới thiệu VietTune" })).toBeVisible();
    await expect(page.getByText("Sứ mệnh", { exact: true })).toBeVisible();
  });

  test("403 page", async ({ page }) => {
    await page.goto("/403");
    await expect(page.getByText("403", { exact: true })).toBeVisible();
    await expect(page.getByText("Truy cập bị từ chối", { exact: true })).toBeVisible();
  });

  test("404 page", async ({ page }) => {
    await page.goto("/nonexistent-route-e2e");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByText("Không tìm thấy trang", { exact: true })).toBeVisible();
  });
});

