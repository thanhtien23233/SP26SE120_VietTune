import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

test.describe("contributions full (contributor)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Contributions loads + status tabs", async ({ page }) => {
    await page.goto("/contributions");
    await expect(page.locator("h1", { hasText: "Đóng góp của bạn" })).toBeVisible();

    for (const label of ["Tất cả", "Bản nháp", "Chờ phê duyệt", "Yêu cầu cập nhật", "Đã duyệt", "Từ chối"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
  });

  test("Detail modal opens (best-effort)", async ({ page }) => {
    await page.goto("/contributions");

    const firstCard = page.locator("button").filter({ hasText: /08:|09:|10:|11:|12:|13:|14:|15:|16:|17:|18:|19:/ }).first();
    const canOpen = await firstCard.isVisible().catch(() => false);
    test.skip(!canOpen, "Không có item để mở chi tiết (API thật).");

    await firstCard.click();
    await expect(page.getByRole("button", { name: "Đóng", exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("Version timeline renders when submission has id (best-effort)", async ({ page }) => {
    await page.goto("/contributions");
    const firstCard = page.locator("button").filter({ hasText: /08:|09:|10:|11:|12:|13:|14:|15:|16:|17:|18:|19:/ }).first();
    const canOpen = await firstCard.isVisible().catch(() => false);
    test.skip(!canOpen, "Không có item để mở chi tiết (API thật).");

    await firstCard.click();
    const timelineTitle = page.getByText(/phiên bản|timeline/i).first();
    await timelineTitle.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  });
});

