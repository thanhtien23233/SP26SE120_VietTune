import { test, expect } from "@playwright/test";

test.describe("semantic search (guest)", () => {
  test("Page renders + suggested queries display", async ({ page }) => {
    await page.goto("/semantic-search");
    await expect(page.locator("h1", { hasText: "Tìm theo ý nghĩa" })).toBeVisible();
    await expect(page.getByLabel("Câu hỏi tìm kiếm theo nghĩa")).toBeVisible();
    await expect(page.getByText("Gợi ý tìm kiếm", { exact: true })).toBeVisible();
    await expect(page.locator("button", { hasText: /dân ca|nhạc cụ|hát then|ca trù/i }).first()).toBeVisible();
  });

  test("Click suggestion → search", async ({ page }) => {
    await page.goto("/semantic-search");
    const suggestion = page.locator("button", { hasText: "dân ca quan họ Bắc Ninh" }).first();
    const hasSuggestion = await suggestion.isVisible().catch(() => false);
    test.skip(!hasSuggestion, "Không thấy gợi ý để click (UI thay đổi).");
    await suggestion.click();
    await expect(page).toHaveURL(/\/semantic-search\?q=/);
    await expect(page.getByText("Kết quả", { exact: true })).toBeVisible();
  });

  test("Empty results shows fallback + navigate to search page", async ({ page }) => {
    await page.goto("/semantic-search");
    await page.getByLabel("Câu hỏi tìm kiếm theo nghĩa").fill("___e2e_no_results___");
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();

    await expect(page.getByText("Chưa có kết quả phù hợp", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Đến trang Tìm kiếm", exact: true }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.locator("h1", { hasText: "Tìm kiếm bài hát" })).toBeVisible();
  });
});

