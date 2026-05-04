import { expect, test } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";

test.describe("admin — AI monitoring dashboard (39)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoAdminSession();
    await gotoAsAdmin(page, baseURL!);
    await page.goto("/admin");
  });

  test("AI monitoring tab loads + stat cards + flagged list renders (best-effort)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Quản trị hệ thống" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: "Giám sát hệ thống AI" }).click();
    await expect(page.getByRole("heading", { name: "Giám sát hệ thống AI" })).toBeVisible();

    await expect(page.getByText("Độ chính xác")).toBeVisible();
    await expect(page.getByText("Câu trả lời bị cắm cờ", { exact: true })).toBeVisible();
    await expect(page.getByText("Cơ sở tri thức", { exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Xử lý cảnh báo AI" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Flagged AI responses" }),
    ).toBeVisible({ timeout: 60_000 });

    const emptyState = page.getByText("Chua co phan hoi AI nao dang bi cam co.");
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    if (hasEmpty) {
      await expect(emptyState).toBeVisible();
    }
  });
});

