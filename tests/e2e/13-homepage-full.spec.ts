import { test, expect } from "@playwright/test";

test.describe("homepage full (guest)", () => {
  test("Hero section renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Kho tri thức âm nhạc dân tộc")).toBeVisible();
    await expect(page.getByRole("heading", { name: "VietTune", exact: true })).toBeVisible();
    await expect(
      page.getByText("Hệ thống lưu giữ âm nhạc truyền thống Việt Nam", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tìm kiếm" })).toBeVisible();
    await expect(page.getByLabel("Mô tả tìm kiếm theo ngữ nghĩa")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tìm", exact: true })).toBeVisible();
  });

  test("Semantic search CTA opens gateway modal", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Mô tả tìm kiếm theo ngữ nghĩa").fill("dân ca quan họ");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Yêu cầu quyền truy cập" });
    await expect(dialog).toBeVisible({
      timeout: 5_000,
    });
    await expect(dialog.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Đăng ký cấp quyền" })).toBeVisible();
  });

  test("Gateway modal can be closed (button + ESC)", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Mô tả tìm kiếm theo ngữ nghĩa").fill("đàn bầu miền Bắc");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Yêu cầu quyền truy cập" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Đóng" }).click();
    await expect(dialog).toBeHidden();

    // open again then close by ESC
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

