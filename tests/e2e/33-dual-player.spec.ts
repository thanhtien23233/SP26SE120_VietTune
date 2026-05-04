import { expect, test } from "@playwright/test";

import { gotoAsResearcher, skipIfNoResearcherSession } from "./helpers/researcherSession";

test.describe("researcher — dual compare player (33)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoResearcherSession();
    await gotoAsResearcher(page, baseURL!);
    await page.goto("/researcher");
  });

  test("tab So sánh: chọn 2 bản, A+B / A only / B only, Play/Pause, Reset (best-effort)", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Kết quả tìm kiếm" })).toBeVisible({
      timeout: 60_000,
    });

    const summary = page.getByText(/Tìm thấy \d+ bản ghi đã kiểm duyệt/);
    await expect(summary).toBeVisible({ timeout: 60_000 });
    const summaryText = (await summary.textContent()) ?? "";
    const emptyMsg = page.getByText(/Không có bản thu nào khớp với bộ lọc/);
    const hasNoData =
      summaryText.includes("0 bản") || (await emptyMsg.isVisible().catch(() => false));
    test.skip(hasNoData, "Không có bản thu đã kiểm duyệt để so sánh.");

    await page.getByRole("button", { name: /So sánh phân tích/ }).click();
    await expect(page.getByRole("heading", { name: "So sánh phân tích" }).first()).toBeVisible();

    const dd = page.getByRole("button", { name: "Chọn bản ghi âm..." });
    await expect(dd.first()).toBeVisible({ timeout: 15_000 });
    const n = await dd.count();
    test.skip(n < 2, "UI không đủ 2 dropdown so sánh.");

    await dd.nth(0).click();
    const noOpts = page.getByText("Không tìm thấy kết quả");
    const hasNoOpts = await noOpts.isVisible().catch(() => false);
    test.skip(hasNoOpts, "Danh sách so sánh trống (0 bản ghi đã duyệt).");

    const list0 = page.locator('[role="listbox"]').last();
    const opt0 = list0.locator("div.max-h-60 button").first();
    await expect(opt0).toBeVisible({ timeout: 10_000 });
    const title0 = (await opt0.textContent())?.trim() ?? "";
    await opt0.click();

    await dd.nth(1).click();
    const list1 = page.locator('[role="listbox"]').last();
    const candidates = list1.locator("div.max-h-60 button");
    const optCount = await candidates.count();
    let pickedSecond = false;
    for (let i = 0; i < optCount; i++) {
      const btn = candidates.nth(i);
      const t = ((await btn.textContent()) ?? "").trim();
      if (t && t !== title0) {
        await btn.click();
        pickedSecond = true;
        break;
      }
    }
    test.skip(!pickedSecond, "Không có ít nhất 2 bản thu khác tiêu đề để so sánh.");

    const videoNote = page.getByText(
      "Một trong hai bản thu là nguồn video. Chế độ đồng bộ hiện áp dụng cho audio",
    );
    const isVideoPair = await videoNote.isVisible().catch(() => false);
    test.skip(isVideoPair, "Cặp bản chọn là video — dual waveform không áp dụng.");

    await expect(page.getByRole("heading", { name: "Dual Audio Compare Player" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: "A+B" }).click();
    await expect(page.getByRole("button", { name: "A+B" })).toBeVisible();
    await page.getByRole("button", { name: "A only" }).click();
    await page.getByRole("button", { name: "B only" }).click();
    await page.getByRole("button", { name: "A+B" }).click();

    const playAll = page.getByRole("button", { name: "Play All" });
    await expect(playAll).toBeEnabled({ timeout: 30_000 });
    await playAll.click();
    await expect(page.getByRole("button", { name: "Pause All" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Pause All" }).click();

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("button", { name: "Play All" })).toBeVisible();
  });
});
