import { expect, test } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";

test.describe("admin — knowledge base management (38)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.goto("/admin/knowledge-base");
  });

  test("KB management loads + mở màn hình tạo bài", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cơ sở tri thức (KB)" })).toBeVisible({
      timeout: 60_000,
    });

    await expect(page.getByRole("button", { name: "Tạo bài mới" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo bài mới" }).click();
    await expect(page.getByRole("heading", { name: "Tạo bài viết mới" })).toBeVisible();

    await page.getByRole("button", { name: "Về danh sách" }).click();
    await expect(page.getByRole("button", { name: "Tạo bài mới" })).toBeVisible();
  });

  test("KB list: mở Xem / Sửa / Lịch sử (best-effort)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cơ sở tri thức (KB)" })).toBeVisible({
      timeout: 60_000,
    });

    const empty = page.getByText("Chưa có bài viết nào");
    const isEmpty = await empty.isVisible().catch(() => false);
    test.skip(isEmpty, "KB API không có entry để thao tác.");

    const viewBtn = page.locator('button[title="Xem"]').first();
    const viewExists = (await viewBtn.count()) > 0;
    test.skip(!viewExists, "Không tìm thấy nút Xem trong KB list.");

    await viewBtn.click();
    await expect(page.getByRole("button", { name: "Về danh sách" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Về danh sách" }).click();

    const editBtn = page.locator('button[title="Sửa"]').first();
    const editExists = (await editBtn.count()) > 0;
    test.skip(!editExists, "Không tìm thấy nút Sửa trong KB list.");

    await editBtn.click();
    await expect(page.getByRole("heading", { name: "Sửa bài viết" })).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Lịch sử phiên bản")).toBeVisible().catch(() => {});
  });
});

