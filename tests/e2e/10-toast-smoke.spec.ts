import { test, expect } from "@playwright/test";

test("toaster mount on home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-rht-toaster]")).toBeAttached();
});

test("login failure shows error toast", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email hoặc số điện thoại").fill("e2e_invalid@example.com");
  await page.getByPlaceholder("Mật khẩu").fill("wrong-password-e2e");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText(/Lỗi đăng nhập/)).toBeVisible({ timeout: 15_000 });
});
