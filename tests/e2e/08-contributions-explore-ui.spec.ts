import { test, expect } from "@playwright/test";

test("contributions route shows login prompt when guest", async ({ page }) => {
  await page.goto("/contributions");
  await expect(
    page.getByRole("heading", { name: /Bạn cần có tài khoản Người đóng góp để xem trang đóng góp/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
});
