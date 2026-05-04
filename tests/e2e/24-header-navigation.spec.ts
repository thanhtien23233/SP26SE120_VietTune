import { test, expect } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";
import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";
import { gotoAsExpert, skipIfNoExpertSession } from "./helpers/expertSession";

test.describe("header navigation (guest + auth)", () => {
  test("Header renders logo + nav (guest)", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("img", { name: "VietTune Logo" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Khám phá âm nhạc dân tộc", exact: true })).toBeVisible();
  });

  test("Guest nav links", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Khám phá âm nhạc dân tộc", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  });

  test("Auth nav links (contributor)", async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
    await page.goto("/");

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Đóng góp của bạn", exact: true })).toBeVisible();
    await expect(nav.getByLabel(/Thông báo/)).toBeVisible();

    await nav.locator("button[aria-haspopup='menu']").click();
    await expect(nav.getByRole("link", { name: "Hồ sơ", exact: true })).toBeVisible();
  });

  test("Mobile hamburger (guest)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await expect(page.getByRole("link", { name: "Tìm kiếm", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  });

  test("Role-specific link: Contributor → Upload", async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await expect(page.getByRole("link", { name: "Đóng góp", exact: true })).toBeVisible();
  });

  test("Role-specific link: Expert → Moderation", async ({ page, baseURL }) => {
    skipIfNoExpertSession();
    await gotoAsExpert(page, baseURL!);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("navigation").getByTitle("Kiểm duyệt bản thu")).toBeVisible();
  });

  test("Role-specific link: Admin → Dashboard", async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("navigation").getByTitle("Quản trị hệ thống")).toBeVisible();
  });

  test("Footer renders", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/Bản quyền/i)).toBeVisible();
  });
});

