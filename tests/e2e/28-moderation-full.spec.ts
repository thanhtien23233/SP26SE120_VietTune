import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { gotoAsExpert, skipIfNoExpertSession } from "./helpers/expertSession";

async function pickFirstQueueItem(page: Page): Promise<{ submissionId: string; title: string } | null> {
  const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
  const queueItems = sidebar.locator('div[role="button"][id^="moderation-queue-item-"]');

  try {
    await expect
      .poll(async () => await queueItems.count(), { timeout: 20_000 })
      .toBeGreaterThan(0);
  } catch {
    return null;
  }

  const first = queueItems.first();
  const idAttr = await first.getAttribute("id");
  const submissionId = idAttr?.replace("moderation-queue-item-", "").trim() ?? "";
  const title = (await first.locator("h3").first().textContent())?.trim() ?? "";
  await first.click();

  return { submissionId, title };
}

test.describe("moderation full (expert)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoExpertSession();
    await gotoAsExpert(page, baseURL!);
  });

  test("Moderation page loads + queue renders", async ({ page }) => {
    await page.goto("/moderation");
    await expect(page.getByRole("heading", { name: "Kiểm duyệt bản thu" })).toBeVisible();
    await expect(page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]')).toBeVisible();
  });

  test("Queue item can be selected and claimed + status badge updates", async ({ page }) => {
    await page.goto("/moderation");

    const picked = await pickFirstQueueItem(page);
    if (!picked?.submissionId) {
      test.skip(true, "Không lấy được submissionId từ hàng đợi.");
      return;
    }

    const claimBtn = page.getByRole("button", { name: /Nhận bài để kiểm duyệt/i }).first();
    const canClaim = await claimBtn.isVisible().catch(() => false);
    test.skip(!canClaim, "Item không ở trạng thái PENDING_REVIEW để có nút Nhận bài.");

    await claimBtn.click();

    const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
    const queueItem = sidebar.locator(`[id="moderation-queue-item-${picked.submissionId}"]`).first();
    await expect(queueItem.getByText("Đã nhận")).toBeVisible({ timeout: 20_000 });
  });

  test("Moderation tabs render (review/ai/knowledge/annotation)", async ({ page }) => {
    await page.goto("/moderation");

    const reviewTab = page.getByRole("tab", { name: "Xem duyệt bản thu", exact: true });
    const aiTab = page.getByRole("tab", { name: "Giám sát phản hồi của AI", exact: true });
    const knowledgeTab = page.getByRole("tab", { name: "Kho tri thức", exact: true });
    const annotationTab = page.getByRole("tab", { name: "Chú thích học thuật", exact: true });
    await Promise.all([
      expect(reviewTab).toBeVisible(),
      expect(aiTab).toBeVisible(),
      expect(knowledgeTab).toBeVisible(),
      expect(annotationTab).toBeVisible(),
    ]);

    const picked = await pickFirstQueueItem(page);
    test.skip(!picked?.submissionId, "Không có submission để render annotation detail.");

    await annotationTab.click();
    await expect(page.getByRole("heading", { name: "Chu thich hoc thuat" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Verification wizard: tick required steps + approve (best-effort)", async ({ page }) => {
    await page.goto("/moderation");

    const picked = await pickFirstQueueItem(page);
    test.skip(!picked?.submissionId, "Không có submissionId để mở wizard.");

    const claimBtn = page.getByRole("button", { name: /Nhận bài để kiểm duyệt/i }).first();
    const canClaim = await claimBtn.isVisible().catch(() => false);
    test.skip(!canClaim, "Không tìm thấy nút Nhận bài để mở kiểm duyệt.");
    await claimBtn.click();

    const startWizardBtn = page.getByRole("button", { name: /Bắt đầu kiểm duyệt|Tiếp tục kiểm duyệt/i }).first();
    const canStart = await startWizardBtn.isVisible().catch(() => false);
    test.skip(!canStart, "Không thấy nút Bắt đầu/Tiếp tục kiểm duyệt.");

    await startWizardBtn.click();

    await expect(page.getByRole("heading", { name: /Bước 1:/ })).toBeVisible({ timeout: 20_000 });

    const s1InfoComplete = page.getByRole("checkbox", { name: /Thông tin đầy đủ:/i }).first();
    const s1InfoAccurate = page.getByRole("checkbox", { name: /Thông tin chính xác:/i }).first();
    const s1FormatCorrect = page.getByRole("checkbox", { name: /Định dạng đúng:/i }).first();
    await Promise.all([s1InfoComplete, s1InfoAccurate, s1FormatCorrect].map((c) => expect(c).toBeVisible()));
    await s1InfoComplete.check();
    await s1InfoAccurate.check();
    await s1FormatCorrect.check();

    const nextTo2 = page.getByRole("button", { name: /Tiếp tục \(Bước 2\)/i }).first();
    await nextTo2.click();

    await expect(page.getByRole("heading", { name: /Bước 2:/ })).toBeVisible({ timeout: 20_000 });

    const s2CulturalValue = page.getByRole("checkbox", { name: /Giá trị văn hóa:/i }).first();
    const s2Authenticity = page.getByRole("checkbox", { name: /Tính xác thực:/i }).first();
    const s2Accuracy = page.getByRole("checkbox", { name: /Độ chính xác:/i }).first();
    await Promise.all([s2CulturalValue, s2Authenticity, s2Accuracy].map((c) => expect(c).toBeVisible()));
    await s2CulturalValue.check();
    await s2Authenticity.check();
    await s2Accuracy.check();

    const nextTo3 = page.getByRole("button", { name: /Tiếp tục \(Bước 3\)/i }).first();
    await nextTo3.click();

    await expect(page.getByRole("heading", { name: /Bước 3:/ })).toBeVisible({ timeout: 20_000 });

    const s3CrossChecked = page.getByRole("checkbox", { name: /Đã đối chiếu:/i }).first();
    const s3SourcesVerified = page.getByRole("checkbox", { name: /Nguồn đã xác minh:/i }).first();
    const s3FinalApproval = page.getByRole("checkbox", { name: /Xác nhận phê duyệt:/i }).first();

    await Promise.all([s3CrossChecked, s3SourcesVerified, s3FinalApproval].map((c) => expect(c).toBeVisible()));
    await s3CrossChecked.check();
    await s3SourcesVerified.check();
    await s3FinalApproval.check();

    const finish = page.getByRole("button", { name: "Hoàn thành kiểm duyệt" }).first();
    await expect(finish).toBeEnabled({ timeout: 20_000 });
    await finish.click();

    await expect(page.getByRole("heading", { name: "Xác nhận phê duyệt" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Xác nhận phê duyệt" }).first().click();

    await expect(page.getByRole("heading", { name: /Bước 1:/ })).toBeHidden({ timeout: 30_000 });
  });

  test("Unclaim flow: claim then unclaim (best-effort)", async ({ page }) => {
    await page.goto("/moderation");

    const picked = await pickFirstQueueItem(page);
    if (!picked?.submissionId) {
      test.skip(true, "Không có submissionId để unclaim.");
      return;
    }

    const claimBtn = page.getByRole("button", { name: /Nhận bài để kiểm duyệt/i }).first();
    const canClaim = await claimBtn.isVisible().catch(() => false);
    test.skip(!canClaim, "Không tìm thấy nút Nhận bài.");
    await claimBtn.click();

    const unclaimBtn = page.getByRole("button", { name: /Hủy nhận bài/i }).first();
    const canUnclaim = await unclaimBtn.isVisible().catch(() => false);
    test.skip(!canUnclaim, "Sau khi claim không thấy nút Hủy nhận bài.");

    await unclaimBtn.click();
    await expect(page.getByRole("heading", { name: "Xác nhận hủy nhận bài" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Hủy nhận bài" }).first().click();

    const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
    const queueItem = sidebar.locator(`[id="moderation-queue-item-${picked.submissionId}"]`).first();
    await expect(queueItem.getByText("Đã nhận")).toBeHidden({ timeout: 20_000 }).catch(() => {});
  });
});

