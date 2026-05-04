import { test, expect } from "@playwright/test";

import { gotoAsExpert, skipIfNoExpertSession } from "./helpers/expertSession";

test.describe("approved recordings (expert)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoExpertSession();
    await gotoAsExpert(page, baseURL!);
  });

  test("Approved recordings page loads", async ({ page }) => {
    await page.goto("/approved-recordings");
    await expect(page.getByRole("heading", { name: "Quản lý bản thu đã được kiểm duyệt" })).toBeVisible();
  });

  test("Click approved recording action navigates to edit page (best-effort)", async ({ page }) => {
    await page.goto("/approved-recordings");

    const editButtons = page.getByRole("button", { name: "Chỉnh sửa bản thu" });
    const canEdit = await editButtons.first().isVisible().catch(() => false);
    test.skip(!canEdit, "Không có bản ghi đã được kiểm duyệt để bấm 'Chỉnh sửa bản thu' (API thật).");

    const btn = editButtons.first();
    await btn.click();
    await expect(page).toHaveURL(/\/recordings\/.+\/edit/);
  });
});

