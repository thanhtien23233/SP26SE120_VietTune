import { test, expect } from "@playwright/test";

test.describe("recording detail (guest)", () => {
  test("Detail page loads from explore", async ({ page }) => {
    await page.goto("/explore");

    const detail = page.getByRole("link", { name: "Chi tiết" }).first();
    const hasDetail = await detail.isVisible().catch(() => false);
    test.skip(!hasDetail, "Không có bản thu để mở chi tiết (API thật).");

    await detail.click();
    await expect(page).toHaveURL(/\/recordings\/[^/]+/);

    await expect(page.getByText("Chi tiết bản ghi", { exact: true })).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();

    await expect(page.getByRole("button", { name: "Thích", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tải xuống", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chia sẻ", exact: true })).toBeVisible();

    await expect(page.getByText("Thông tin", { exact: true })).toBeVisible();
  });

  test("Invalid ID shows not found", async ({ page }) => {
    await page.goto("/recordings/___e2e_invalid___");
    await expect(
      page.getByText(/Không tìm thấy bản ghi|Bản ghi không tồn tại/i),
    ).toBeVisible({ timeout: 20_000 });
  });
});

