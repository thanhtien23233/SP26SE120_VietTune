import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

test.describe("contributor (storage session)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("contributor can open upload page without gate", async ({ page }) => {
    await page.goto("/upload");
    await expect(
      page.getByRole("heading", { name: /Đóng góp bản thu|Chỉnh sửa bản thu/ }),
    ).toBeVisible();
    await expect(page.getByText("Bạn cần có tài khoản Người đóng góp")).not.toBeVisible();
  });

  test("contributor can open contributions page", async ({ page }) => {
    await page.goto("/contributions");
    await expect(page.getByRole("heading", { name: /Đóng góp của bạn/i })).toBeVisible();
    await expect(page.locator("#contributions-submissions-panel")).toBeVisible();
  });
});
