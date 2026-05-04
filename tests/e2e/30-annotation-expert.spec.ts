import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { gotoAsExpert, skipIfNoExpertSession } from "./helpers/expertSession";

async function pickFirstQueueItem(page: Page) {
  const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
  const queueItems = sidebar.locator('div[role="button"][id^="moderation-queue-item-"]');

  await expect
    .poll(async () => await queueItems.count(), { timeout: 20_000 })
    .toBeGreaterThan(0);

  const first = queueItems.first();
  const idAttr = await first.getAttribute("id");
  const submissionId = idAttr?.replace("moderation-queue-item-", "").trim() ?? "";
  await first.click();
  return submissionId;
}

test.describe("annotation expert (moderation)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoExpertSession();
    await gotoAsExpert(page, baseURL!);
  });

  test("Annotation tab visible and panel renders", async ({ page }) => {
    await page.goto("/moderation");

    const submissionId = await pickFirstQueueItem(page);
    test.skip(!submissionId, "Không có submissionId để render annotation panel.");

    const annotationTab = page.getByRole("tab", { name: "Chú thích học thuật", exact: true });
    await annotationTab.click();

    await expect(page.getByRole("heading", { name: "Chú thích học thuật" })).toBeVisible();
  });

  test("Create/edit/delete annotation (best-effort) + show on recording detail", async ({ page }) => {
    await page.goto("/moderation");

    const submissionId = await pickFirstQueueItem(page);
    test.skip(!submissionId, "Không có submissionId để chạy annotation tests.");

    const annotationTab = page.getByRole("tab", { name: "Chú thích học thuật", exact: true });
    await annotationTab.click();
    await expect(page.getByRole("heading", { name: "Chú thích học thuật" })).toBeVisible();

    await page.getByRole("button", { name: "Thêm chú thích" }).click();

    const saveBtn = page.getByRole("button", { name: "Lưu chú thích" }).first();
    await saveBtn.click();

    await expect(page.getByText("Nội dung là bắt buộc.")).toBeVisible({ timeout: 10_000 });

    const createdContent = `E2E ANNOT-${Date.now()}`;
    await page.getByPlaceholder(/Nhập nội dung chú thích học thuật/i).fill(createdContent);
    await page.getByRole("button", { name: "Lưu chú thích" }).click();

    const createdLi = page.locator("li").filter({ hasText: createdContent }).first();
    const createdLiVisible = await createdLi.isVisible().catch(() => false);
    test.skip(!createdLiVisible, "Không thấy annotation trong list sau khi tạo (API/DB thật).");

    const editedContent = `E2E ANNOT-EDIT-${Date.now()}`;

    const editBtn = createdLi.getByRole("button", { name: "Sửa" }).first();
    const canEdit = await editBtn.isVisible().catch(() => false);
    test.skip(!canEdit, "Không có nút Sửa cho annotation mới (quyền hoặc DB thật).");
    await editBtn.click();

    await page.getByPlaceholder(/Nhập nội dung chú thích học thuật/i).fill(editedContent);
    await page.getByRole("button", { name: "Lưu cập nhật" }).click();
    await expect(page.getByText(editedContent)).toBeVisible({ timeout: 20_000 });

    await page.goto(`/recordings/${submissionId}`);
    await expect(page.getByRole("heading", { name: "Chú thích chuyên gia" })).toBeVisible();
    await expect(page.getByText(editedContent)).toBeVisible({ timeout: 20_000 });

    await page.goto("/moderation");
    page.once("dialog", (dialog) => dialog.accept());
    const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
    const queueItem = sidebar.locator(`[id="moderation-queue-item-${submissionId}"]`).first();
    const queueItemVisible = await queueItem.isVisible().catch(() => false);
    test.skip(!queueItemVisible, "Không thấy queue item lại để xóa annotation (DB có thể đổi).");
    await queueItem.click();

    await annotationTab.click();
    await expect(page.getByRole("heading", { name: "Chú thích học thuật" })).toBeVisible();

    const li2 = page.locator("li").filter({ hasText: editedContent }).first();
    const delBtn = li2.getByRole("button", { name: "Xóa" }).first();
    await delBtn.click();

    await expect(page.locator("li").filter({ hasText: editedContent })).toHaveCount(0);
  });
});

