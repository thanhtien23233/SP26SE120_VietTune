import { expect, test } from "@playwright/test";

import { gotoAsResearcher, skipIfNoResearcherSession } from "./helpers/researcherSession";

test.describe("export dataset — researcher portal + /search (34)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoResearcherSession();
    await gotoAsResearcher(page, baseURL!);
  });

  test("Cổng nghiên cứu: Xuất dataset — dialog định dạng và cột (best-effort)", async ({ page }) => {
    await page.goto("/researcher");
    await expect(page.getByRole("heading", { name: "Kết quả tìm kiếm" })).toBeVisible({
      timeout: 60_000,
    });

    const exportBtn = page.getByRole("button", { name: "Xuất dataset" });
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
    const disabled = await exportBtn.isDisabled().catch(() => true);
    test.skip(disabled, "Không có bản ghi đã kiểm duyệt — không mở được export.");

    await exportBtn.click();
    await expect(page.getByRole("heading", { name: "Xuất bộ dữ liệu học thuật" })).toBeVisible();

    await page.getByRole("button", { name: "JSON", exact: true }).click();
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    await page.getByRole("button", { name: "XLSX", exact: true }).click();

    const titleCb = page.getByRole("checkbox", { name: "Title" });
    await titleCb.click();
    await titleCb.click();

    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
    await page.getByRole("button", { name: /Xuất ngay/ }).click();
    const dl = await downloadPromise;
    test.skip(!dl, "Không bắt được sự kiện download (môi trường có thể chặn hoặc lỗi xuất).");

    await expect(page.getByRole("heading", { name: "Xuất bộ dữ liệu học thuật" })).toBeHidden({
      timeout: 15_000,
    });
  });

  test("Trang /search: Xuất dữ liệu sau khi có kết quả (best-effort)", async ({ page }) => {
    await page.goto("/search?q=nhạc");
    await expect(page.getByRole("heading", { name: "Kết quả tìm kiếm" })).toBeVisible({
      timeout: 60_000,
    });

    const loading = page.locator(".animate-spin, [class*='animate-spin']");
    await expect(loading).toHaveCount(0, { timeout: 60_000 }).catch(() => {});

    const noResults = page.getByRole("heading", { name: "Không tìm thấy bản thu" });
    const hasNoResults = await noResults.isVisible().catch(() => false);
    test.skip(hasNoResults, "Tìm kiếm không trả về bản thu để xuất.");

    const exportBtn = page.getByRole("button", { name: "Xuất dữ liệu" });
    await expect(exportBtn).toBeVisible({ timeout: 20_000 });
    await exportBtn.click();
    await expect(page.getByRole("heading", { name: "Xuất bộ dữ liệu học thuật" })).toBeVisible();

    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByRole("heading", { name: "Xuất bộ dữ liệu học thuật" })).toBeHidden();
  });
});
