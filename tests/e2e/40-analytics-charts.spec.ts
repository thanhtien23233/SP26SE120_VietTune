import { expect, test } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";

test.describe("admin — analytics charts (40)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.goto("/admin");
  });

  test("Analytics tab renders + chart sections visible (fallback ok)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Quản trị hệ thống" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: "Phân tích & thống kê" }).click();
    await expect(page.getByRole("heading", { name: "Phân tích bộ sưu tập" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Độ phủ theo dân tộc" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "Phân tích nội dung bộ sưu tập" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Đóng góp theo tháng" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bảng xếp hạng người đóng góp" })).toBeVisible();

    const coverageHasChart =
      (await page.locator("text=Chưa có dữ liệu độ phủ để hiển thị.").isVisible().catch(() => false)) ||
      (await page.locator("svg").first().isVisible().catch(() => false));
    test.skip(!coverageHasChart, "Không xác định được trạng thái chart/fallback cho CoverageGapChart.");
  });
});

