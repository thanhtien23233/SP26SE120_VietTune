import { expect, test } from "@playwright/test";

import { gotoAsResearcher, skipIfNoResearcherSession } from "./helpers/researcherSession";

test.describe("researcher portal — load, filters, tabs (32)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoResearcherSession();
    await gotoAsResearcher(page, baseURL!);
    await page.goto("/researcher");
  });

  test("heading, nav tabs và bộ lọc nâng cao hiển thị", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cổng nghiên cứu" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole("navigation", { name: "Cổng nghiên cứu" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tìm kiếm nâng cao/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Hỏi đáp thông minh/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Biểu đồ tri thức/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /So sánh phân tích/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bộ lọc nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kết quả tìm kiếm" })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("chuyển tab Archive / So sánh / QA / Knowledge Graph (nhãn UI)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cổng nghiên cứu" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: /So sánh phân tích/ }).click();
    await expect(page.getByRole("heading", { name: "So sánh phân tích" }).first()).toBeVisible();

    await page.getByRole("button", { name: /Hỏi đáp thông minh/ }).click();
    await expect(page.getByRole("heading", { name: "VietTune Intelligence" })).toBeVisible();

    await page.getByRole("button", { name: /Biểu đồ tri thức/ }).click();
    await expect(page.getByRole("heading", { name: "Biểu đồ tri thức tương tác" })).toBeVisible();

    await page.getByRole("button", { name: /Tìm kiếm nâng cao/ }).click();
    await expect(page.getByRole("heading", { name: "Tìm kiếm ngữ nghĩa" })).toBeVisible();
  });

  test("bấm Phát mở modal player (best-effort)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Kết quả tìm kiếm" })).toBeVisible({
      timeout: 60_000,
    });

    const summary = page.getByText(/Tìm thấy \d+ bản ghi đã kiểm duyệt/);
    await expect(summary).toBeVisible({ timeout: 60_000 });
    const summaryText = (await summary.textContent()) ?? "";
    const emptyMsg = page.getByText(/Không có bản thu nào khớp với bộ lọc/);
    const hasNoData =
      summaryText.includes("0 bản") || (await emptyMsg.isVisible().catch(() => false));
    test.skip(hasNoData, "Không có bản thu đã kiểm duyệt trong DB thật.");

    const playBtn = page.getByRole("button", { name: "Phát" }).first();
    await expect(playBtn).toBeVisible({ timeout: 20_000 });
    await playBtn.click();

    await expect(page.locator("#play-modal-title")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Đóng" }).first().click();
    await expect(page.locator("#play-modal-title")).toBeHidden();
  });
});
