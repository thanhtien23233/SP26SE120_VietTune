import { test, expect } from "@playwright/test";

test.describe("auth pages (guest)", () => {
  test("Login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Đăng nhập vào VietTune" })).toBeVisible();
    await expect(page.getByPlaceholder("Email hoặc số điện thoại")).toBeVisible();
    await expect(page.getByPlaceholder("Mật khẩu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tạo tài khoản mới" })).toBeVisible();
  });

  test("Login validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByText("Email là bắt buộc")).toBeVisible();
    await expect(page.getByText("Mật khẩu là bắt buộc")).toBeVisible();
  });

  test("Login failure toast", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email hoặc số điện thoại").fill("wrong@example.com");
    await page.getByPlaceholder("Mật khẩu").fill("wrong");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    await expect(page.getByText("Lỗi đăng nhập")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Sai tài khoản hoặc mật khẩu|không đúng|không hợp lệ|không tồn tại/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Register page renders", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Tham gia VietTune" })).toBeVisible();
    await expect(page.getByPlaceholder("Nhập họ và tên đầy đủ")).toBeVisible();
    await expect(page.getByPlaceholder("Nhập số điện thoại")).toBeVisible();
    await expect(page.getByPlaceholder("Nhập địa chỉ email")).toBeVisible();
    await expect(page.getByPlaceholder("Tạo mật khẩu mạnh")).toBeVisible();
    await expect(page.getByPlaceholder("Nhập lại mật khẩu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng ký", exact: true })).toBeVisible();
  });

  test("Register validation", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Đăng ký", exact: true }).click();

    await expect(page.getByText("Họ và tên là bắt buộc")).toBeVisible();
    await expect(page.getByText("Số điện thoại là bắt buộc")).toBeVisible();
    await expect(page.getByText("Email là bắt buộc")).toBeVisible();
    await expect(page.getByText("Mật khẩu là bắt buộc")).toBeVisible();
    await expect(page.getByText("Vui lòng xác nhận mật khẩu")).toBeVisible();
  });

  test("Confirm account page renders", async ({ page }) => {
    await page.goto("/confirm-account");
    await expect(page.getByRole("heading", { name: "Xác thực tài khoản" })).toBeVisible();
    await expect(page.getByPlaceholder("Nhập mã OTP (6 chữ số)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận ngay" })).toBeVisible();
  });
});

