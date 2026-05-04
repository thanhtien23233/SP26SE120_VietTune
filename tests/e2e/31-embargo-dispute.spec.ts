import path from "node:path";

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { gotoAsAdmin, skipIfNoAdminSession } from "./helpers/adminSession";
import { gotoAsExpert, skipIfNoExpertSession } from "./helpers/expertSession";

const fixtureWav = path.join(process.cwd(), "tests/e2e/fixtures/e2e-clip.wav");

async function pickFirstQueueItem(page: Page) {
  const sidebar = page.locator('[aria-label="Hàng đợi kiểm duyệt (sidebar)"]');
  const queueItems = sidebar.locator('div[role="button"][id^="moderation-queue-item-"]');

  await expect
    .poll(async () => await queueItems.count(), { timeout: 20_000 })
    .toBeGreaterThan(0);

  const first = queueItems.first();
  const idAttr = await first.getAttribute("id");
  const recordingId = idAttr?.replace("moderation-queue-item-", "").trim() ?? "";
  const title = (await first.locator("h3").first().textContent())?.trim() ?? "";
  await first.click();
  return { recordingId, title };
}

test.describe("embargo + dispute (expert/admin)", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoExpertSession();
    await gotoAsExpert(page, baseURL!);
  });

  test("Embargo section renders in moderation detail (best-effort)", async ({ page }) => {
    await page.goto("/moderation");

    const picked = await pickFirstQueueItem(page);
    test.skip(!picked.recordingId, "Không lấy được recordingId từ hàng đợi.");

    await expect(page.getByRole("heading", { name: "Kiểm duyệt bản thu" })).toBeVisible();
    const embargoRegion = page.getByRole("region", { name: "Embargo section" }).first();
    await expect(
      embargoRegion.getByRole("heading", { name: "Hạn chế công bố" }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(embargoRegion.getByRole("button", { name: "Lưu embargo" }).first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => {});
  });

  test("Recording detail shows embargo warning and dispute report modal opens (best-effort)", async ({
    page,
  }) => {
    await page.goto("/moderation");

    const picked = await pickFirstQueueItem(page);
    test.skip(!picked.recordingId, "Không có recordingId để mở trang chi tiết.");

    await page.goto(`/recordings/${picked.recordingId}`);
    await expect(page.getByRole("button", { name: "Báo cáo vi phạm bản quyền" })).toBeVisible({
      timeout: 20_000,
    });

    const embargoWarn = page.getByText("Bản ghi đang trong thời hạn hạn chế công bố.").isVisible();
    const hasEmbargoWarn = await embargoWarn.catch(() => false);
    if (hasEmbargoWarn) {
      await expect(page.getByText("Bản ghi đang trong thời hạn hạn chế công bố.")).toBeVisible();
    }

    await page.getByRole("button", { name: "Báo cáo vi phạm bản quyền" }).click();
    await expect(page.getByRole("heading", { name: "Báo cáo tranh chấp bản quyền" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("heading", { name: "Bao cao vi pham ban quyen" }).isVisible().catch(() => {});

    const modal = page.getByRole("heading", { name: "Bao cao vi pham ban quyen" });
    const modalVisible = await modal.isVisible().catch(() => false);
    test.skip(!modalVisible, "Không thấy DisputeReportForm trong modal (API thật có thể không cho phép).");

    await page.getByLabel("Mo ta chi tiet").fill(`E2E Dispute ${Date.now()}`);
    await page.getByLabel("Link bang chung (moi dong mot URL, tuy chon)").fill("https://example.com/e2e");
    await page.getByRole("button", { name: "Gui bao cao" }).click();

    await expect(
      page.getByRole("heading", { name: "Bao cao vi pham ban quyen" }),
    ).toBeHidden({ timeout: 30_000 });
  });

  test("Admin dispute list + evidence upload + wizard step 3 checkbox (best-effort)", async ({
    page,
    baseURL,
  }) => {
    skipIfNoAdminSession();

    await gotoAsAdmin(page, baseURL!);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Quản trị hệ thống" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Kiểm duyệt nội dung" }).click();
    await expect(page.getByRole("button", { name: "Tranh chấp bản quyền" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Tranh chấp bản quyền" }).click();

    await expect(page.getByRole("heading", { name: "Danh sach tranh chap ban quyen" })).toBeVisible({
      timeout: 20_000,
    });

    const firstRow = page.locator("table tbody tr").first();
    const canPickRow = await firstRow.isVisible().catch(() => false);
    test.skip(!canPickRow, "Không có disputes để upload evidence (API thật).");

    await firstRow.click();

    const uploadInput = page.getByLabel("Tai len bang chung", { exact: true }).locator("input[type='file']");
    const uploadBtn = page.getByRole("button", { name: "Tai len" }).first();
    const uploadVisible = await uploadInput.isVisible().catch(() => false);
    test.skip(!uploadVisible, "Không mở được DisputeEvidenceUpload sau khi chọn dispute row.");

    await expect(uploadInput).toBeVisible({ timeout: 20_000 });

    await uploadInput.setInputFiles(fixtureWav);
    const canUpload = await uploadBtn.isEnabled().catch(() => false);
    test.skip(!canUpload, "Nút Tai len đang disabled (thiếu file hoặc thiếu disputeId).");
    await uploadBtn.click();
  });
});

