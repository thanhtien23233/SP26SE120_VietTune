import { test, expect } from "@playwright/test";

test.describe("explore full (guest)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Explore page loads", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "Tìm kiếm" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bản thu mới nhất" })).toBeVisible();
    await expect(page.getByText(/Có\s+\d+\s+bản thu/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("Filter sidebar toggles (mobile drawer)", async ({ page }) => {
    await page.goto("/explore");
    const trigger = page.getByRole("button", { name: "Bộ lọc", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Bộ lọc tìm kiếm" });
    await expect(dialog).toBeVisible();
    // Close using the full-screen backdrop button to avoid viewport issues.
    await page.locator("button[aria-label='Đóng bộ lọc'][class*='fixed']").click({ force: true });
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false", { timeout: 10_000 });
  });

  test("Search by keyword filters results", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("tab", { name: "Tìm theo từ khóa" }).click();
    await page.getByLabel("Từ khóa tìm kiếm").fill("Quan họ");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();

    await expect(page).toHaveURL(/\/explore\?[^#]*q=Quan(\+|%20)h%E1%BB%8D/i);
    await expect(page.locator("h2", { hasText: /Kết quả|Bản thu mới nhất/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/Tìm thấy\s+\d+\s+bản thu|Chưa có bản thu nào/i),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Filter by ethnicity", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Bộ lọc tìm kiếm" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Tìm trong danh sách dân tộc").fill("Tày");
    const tayCheckbox = dialog
      .locator("label", { hasText: /^Tày$/ })
      .locator("input[type=checkbox]");
    await tayCheckbox.check();
    await expect(tayCheckbox).toBeChecked();
    await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();

    await expect(page).toHaveURL(/ethnicity=T%C3%A0y/);
    await expect(page.locator("h2", { hasText: /Kết quả|Bản thu mới nhất/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Recording card click → detail", async ({ page }) => {
    await page.goto("/explore");
    const detail = page.getByRole("link", { name: "Chi tiết" }).first();
    const hasDetail = await detail.isVisible().catch(() => false);
    test.skip(!hasDetail, "Không có bản thu để bấm 'Chi tiết' (API thật).");
    await detail.click();
    await expect(page).toHaveURL(/\/recordings\//, { timeout: 20_000 });
  });

  test("Pagination works", async ({ page }) => {
    await page.goto("/explore");
    const nextBtn = page.getByRole("button", { name: "Sau", exact: true });
    const hasNext = await nextBtn.isVisible().catch(() => false);
    test.skip(!hasNext, "Không có phân trang để kiểm tra (API thật).");
    await nextBtn.click();
    await expect(page.getByText(/Trang\s+2\s*\/\s*\d+/)).toBeVisible({ timeout: 20_000 });
  });
});

