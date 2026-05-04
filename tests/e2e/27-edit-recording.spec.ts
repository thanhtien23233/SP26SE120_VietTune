import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

test.describe("edit recording (contributor)", () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Edit page loads from contributions quick edit (best-effort)", async ({ page }) => {
    await page.goto("/contributions");

    const openFirst = page
      .locator("button")
      .filter({ hasText: /08:|09:|10:|11:|12:|13:|14:|15:|16:|17:|18:|19:/ })
      .first();
    const canOpen = await openFirst.isVisible().catch(() => false);
    test.skip(!canOpen, "Không có item để mở chi tiết (API thật).");

    await openFirst.click();

    const editBtn = page.getByRole("button", { name: /Sửa|Cập nhật/i }).first();
    const canEdit = await editBtn.isVisible().catch(() => false);
    test.skip(!canEdit, "Không có nút Sửa/Cập nhật (chỉ hiện ở một số trạng thái submission).");

    await editBtn.click();

    await expect(page).toHaveURL(/\/upload\?edit=true/);
    await expect(page.locator("h1", { hasText: "Chỉnh sửa bản thu" })).toBeVisible();
  });
});

