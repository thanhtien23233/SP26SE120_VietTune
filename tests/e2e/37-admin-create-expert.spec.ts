import { expect, test } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";

test.describe("admin — create expert (37)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.goto("/admin/create-expert");
  });

  test("Create expert page loads + validation errors show", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cấp tài khoản Chuyên gia" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "Tạo tài khoản mới" })).toBeVisible();

    await page.getByRole("button", { name: "Tạo tài khoản Chuyên gia" }).click();

    await expect(page.getByText("Tên người dùng là bắt buộc")).toBeVisible();
    await expect(page.getByText("Email là bắt buộc")).toBeVisible();
    await expect(page.getByText("Họ và tên là bắt buộc")).toBeVisible();
    await expect(page.getByText("Mật khẩu là bắt buộc")).toBeVisible();
    await expect(page.getByText("Vui lòng xác nhận mật khẩu")).toBeVisible();
  });

  test("Create expert flow (best-effort; demo/local override)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cấp tài khoản Chuyên gia" })).toBeVisible({
      timeout: 60_000,
    });

    const now = Date.now();
    const suffix = String(now % 1_000_000).padStart(6, "0");
    const username = `e2eexp_${suffix}`; // <= 20 chars, matches /^[a-zA-Z0-9_]{3,20}$/
    const email = `e2eexp_${suffix}@example.com`;

    await page.getByRole("textbox", { name: "Nhập tên người dùng" }).fill(username);
    await page.getByRole("textbox", { name: "Nhập địa chỉ email" }).fill(email);
    await page.getByRole("textbox", { name: "Nhập họ và tên" }).fill("E2E Expert");
    await page.getByRole("textbox", { name: "Nhập mật khẩu (tối thiểu 6 ký tự)" }).fill("Passw0rd!");
    await page.getByRole("textbox", { name: "Nhập lại mật khẩu" }).fill("Passw0rd!");

    await page.getByRole("button", { name: "Tạo tài khoản Chuyên gia" }).click();

    await expect(page.getByText("Tên người dùng 3-20 ký tự, chỉ chữ, số và dấu gạch dưới")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Nhập tên người dùng" })).toHaveValue("", {
      timeout: 15_000,
    });
  });
});

