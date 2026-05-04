import { expect, test } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";

test.describe("admin dashboard (36)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.goto("/admin");
  });

  test("Dashboard loads + điều hướng stepper giữa Users/Analytics/AI/Moderation", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Quản trị hệ thống" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Điều hướng quản trị")).toBeVisible();

    await page.getByRole("button", { name: "Quản lý người dùng" }).click();
    await expect(page.getByRole("heading", { name: "Quản lý người dùng" })).toBeVisible();

    await page.getByRole("button", { name: "Phân tích & thống kê" }).click();
    await expect(page.getByRole("heading", { name: "Phân tích bộ sưu tập" })).toBeVisible();
    await expect(page.getByText("Tổng bản ghi")).toBeVisible();

    await page.getByRole("button", { name: "Giám sát hệ thống AI" }).click();
    await expect(page.getByRole("heading", { name: "Giám sát hệ thống AI" })).toBeVisible();
    await expect(page.getByText("Câu trả lời bị cắm cờ", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Kiểm duyệt nội dung" }).click();
    await expect(page.getByRole("heading", { name: "Kiểm duyệt nội dung" })).toBeVisible();
    await expect(page.getByText("Bảng xử lý nhanh")).toBeVisible();
  });
});

