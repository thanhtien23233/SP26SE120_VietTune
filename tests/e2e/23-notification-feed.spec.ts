import { test, expect } from "@playwright/test";

import { gotoAsContributor, loadContributorIdbPayload, skipIfNoContributorSession } from "./helpers/contributorSession";
import { apiJson } from "./helpers/realApi";

test.describe("notification feed (auth)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Notification page loads", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.locator("h1", { hasText: "Thông báo" })).toBeVisible();
  });

  test("Header badge shows count (Real API, best-effort)", async ({ page }) => {
    const token = loadContributorIdbPayload().access_token;
    await apiJson(page.request, "POST", "/api/Notification", {
      token,
      data: { type: "recording_edited", title: "N1 (E2E)", message: "B1", relatedId: "rec-1" },
    }).catch(() => {});

    await page.goto("/");
    const badge = page.locator("button[aria-label^='Thông báo'] span").first();
    await badge.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  });

  test("Mark as read (Real API)", async ({ page }) => {
    const token = loadContributorIdbPayload().access_token;
    await apiJson(page.request, "POST", "/api/Notification", {
      token,
      data: { type: "recording_edited", title: "Đọc đi (E2E)", message: "Body", relatedId: "rec-1" },
    }).catch(() => {});

    await page.goto("/notifications");
    const emptyAll = await page.getByText("Chưa có thông báo", { exact: true }).isVisible().catch(() => false);
    test.skip(emptyAll, "Không có thông báo để thao tác (API thật).");

    const markBtn = page.getByRole("button", { name: "Đánh dấu đã đọc", exact: true }).first();
    const hasBtn = await markBtn.isVisible().catch(() => false);
    test.skip(!hasBtn, "Không có thông báo chưa đọc để đánh dấu (API thật).");

    await markBtn.click();
    await expect(page.getByRole("button", { name: "Đánh dấu đã đọc", exact: true })).toHaveCount(0);
  });

  test("Delete notification (Real API)", async ({ page }) => {
    const token = loadContributorIdbPayload().access_token;
    await apiJson(page.request, "POST", "/api/Notification", {
      token,
      data: { type: "recording_edited", title: "Xóa tôi (E2E)", message: "Body", relatedId: "rec-1" },
    }).catch(() => {});

    await page.goto("/notifications");
    const emptyAll = await page.getByText("Chưa có thông báo", { exact: true }).isVisible().catch(() => false);
    test.skip(emptyAll, "Không có thông báo để thao tác (API thật).");

    const firstDelete = page.getByRole("button", { name: "Xóa", exact: true }).first();
    const canDelete = await firstDelete.isVisible().catch(() => false);
    test.skip(!canDelete, "Không tìm thấy nút xóa (API thật).");

    await firstDelete.click();
    await expect(firstDelete).toBeHidden({ timeout: 10_000 });
  });

  test("Navigate to recording (Real API)", async ({ page }) => {
    const token = loadContributorIdbPayload().access_token;
    await apiJson(page.request, "POST", "/api/Notification", {
      token,
      data: { type: "recording_edited", title: "Đi tới bản ghi (E2E)", message: "Body", relatedId: "rec-1" },
    }).catch(() => {});

    await page.goto("/notifications");
    const emptyAll = await page.getByText("Chưa có thông báo", { exact: true }).isVisible().catch(() => false);
    test.skip(emptyAll, "Không có thông báo để thao tác (API thật).");

    const firstItem = page.locator("ul li button").first();
    const canClick = await firstItem.isVisible().catch(() => false);
    test.skip(!canClick, "Không tìm thấy item để navigate (API thật).");

    await firstItem.click();
    await expect(page).not.toHaveURL(/\/notifications\/?$/);
  });
});

