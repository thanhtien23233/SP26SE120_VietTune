import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

test.describe("profile page (auth)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Profile page loads", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("h1", { hasText: "Hồ sơ" })).toBeVisible();
    await expect(page.getByText("Thông tin tài khoản", { exact: true })).toBeVisible();

    const info = page.locator("p", { hasText: "Tên:" }).first();
    await expect(info).toBeVisible();
    await expect(info).toContainText("Vai trò:");
  });

  test("Edit profile opens modal", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Chỉnh sửa hồ sơ", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chỉnh sửa hồ sơ", exact: true })).toBeVisible();
    await expect(page.locator("label", { hasText: "Họ và tên" })).toBeVisible();
    await expect(page.locator("label", { hasText: "Tên người dùng" })).toBeVisible();
    await expect(page.locator("label", { hasText: "Email" })).toBeVisible();
  });

  test("Edit validation", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Chỉnh sửa hồ sơ", exact: true }).click();

    const fullNameInput = page.locator("label", { hasText: "Họ và tên" }).locator("..").locator("input");
    const usernameInput = page
      .locator("label", { hasText: "Tên người dùng" })
      .locator("..")
      .locator("input");
    const emailInput = page.locator("label", { hasText: "Email" }).locator("..").locator("input");
    const saveBtn = page.getByRole("button", { name: "Lưu", exact: true });

    await usernameInput.fill("e2e_user_1");
    await emailInput.fill("e2e_user_1@example.invalid");
    await fullNameInput.fill("");
    await fullNameInput.blur();

    await expect(page.getByText("Họ và tên là bắt buộc.", { exact: true })).toBeVisible();
    await expect(saveBtn).toBeDisabled();
  });

  test("Edit save (Real API)", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: "Chỉnh sửa hồ sơ", exact: true }).click();

    const fullNameInput = page.locator("label", { hasText: "Họ và tên" }).locator("..").locator("input");
    const usernameInput = page
      .locator("label", { hasText: "Tên người dùng" })
      .locator("..")
      .locator("input");
    const emailInput = page.locator("label", { hasText: "Email" }).locator("..").locator("input");

    const updated = {
      fullName: `E2E User ${Date.now()}`,
      username: `e2e_${Date.now()}`,
      email: `e2e_${Date.now()}@example.invalid`,
    };

    await fullNameInput.fill(updated.fullName);
    await usernameInput.fill(updated.username);
    await emailInput.fill(updated.email);
    await expect(page.getByRole("button", { name: "Lưu", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    const toast = page
      .getByRole("status")
      .filter({
        hasText: /Lưu hồ sơ thành công|Không thể lưu hồ sơ lên server ngay bây giờ/i,
      })
      .first();
    await expect(toast).toBeVisible({ timeout: 15_000 });

    const info = page.locator("p", { hasText: "Tên:" }).first();
    await expect(info).toContainText(updated.fullName);
    await expect(info).toContainText(updated.email);
  });
});

