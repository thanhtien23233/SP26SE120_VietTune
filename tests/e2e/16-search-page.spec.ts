import { test, expect } from "@playwright/test";

test.describe("search page (guest)", () => {
  test("Search page renders", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("h1", { hasText: "Tìm kiếm bài hát" })).toBeVisible();
    await expect(page.getByLabel("Từ khóa tìm kiếm")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tìm kiếm", exact: true }).first()).toBeVisible();
    await expect(page.getByTitle("Tìm theo ý nghĩa")).toBeVisible();
  });

  test("Keyword search works (Real API)", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Từ khóa tìm kiếm").fill("quan họ");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).first().click();

    await expect(page.locator("h2", { hasText: "Kết quả tìm kiếm" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Tìm thấy\s+\d+\s+bản thu|Không tìm thấy bản thu/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Export button opens dialog when results exist", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Từ khóa tìm kiếm").fill("a");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).first().click();

    await expect(page.locator("h2", { hasText: "Kết quả tìm kiếm" })).toBeVisible({ timeout: 20_000 });

    const exportBtn = page.getByRole("button", { name: "Xuất dữ liệu", exact: true });
    const canExport = await exportBtn.isVisible().catch(() => false);
    test.skip(!canExport, "Không có kết quả để mở ExportDatasetDialog (API thật).");

    await exportBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
  });
});

