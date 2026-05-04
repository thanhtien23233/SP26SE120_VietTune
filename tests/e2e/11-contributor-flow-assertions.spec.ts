import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";
import { completeContributorUploadWizard } from "./helpers/contributorUploadHappyPath";

test.describe("contributor flow assertions", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("contributions page shows status tabs (Wide / P1 surface)", async ({ page }) => {
    await page.goto("/contributions");
    for (const label of [
      "Tất cả",
      "Bản nháp",
      "Chờ phê duyệt",
      "Yêu cầu cập nhật",
      "Đã duyệt",
      "Từ chối",
    ]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
  });

  test("upload page shows three-step sidebar (P0 context)", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.getByText("Luồng 3 bước")).toBeVisible();
    await expect(page.getByText("Tải lên âm thanh hoặc video")).toBeVisible();
  });

  /**
   * P0 Narrow — API thật (Supabase + backend). Bỏ qua CI không có BE/storage:
   * `E2E_SKIP_HEAVY=1 npx playwright test --project=contributor-storage`
   */
  /** P2 — mock lỗi mạng/API, không phụ thuộc dữ liệu submit. */
  test("contributions shows error when my-submissions API fails (mocked)", async ({ page }) => {
    await page.route("**/Submission/my**", (route) => route.abort("failed"));
    await page.goto("/contributions");
    await expect(page.getByText("Không thể tải danh sách đóng góp")).toBeVisible({ timeout: 25_000 });
  });

  test("P0 narrow: upload wizard → submit → item on contributions", async ({ page }) => {
    test.slow();
    if (process.env.E2E_SKIP_HEAVY === "1") test.skip();

    const marker = `E2E-${Date.now()}`;
    await completeContributorUploadWizard(page, marker);

    await page.getByRole("button", { name: "Đóng góp của bạn" }).click();
    await expect(page).toHaveURL(/\/contributions/);

    await expect(page.getByText(marker, { exact: false })).toBeVisible({ timeout: 30_000 });
  });
});
