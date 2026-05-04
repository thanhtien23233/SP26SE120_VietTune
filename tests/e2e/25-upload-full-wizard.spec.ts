import path from "node:path";

import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

const fixtureWav = path.join(process.cwd(), "tests/e2e/fixtures/e2e-clip.wav");

test.describe("upload full wizard (contributor)", () => {
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Upload page renders wizard", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.locator("h1", { hasText: /Đóng góp bản thu|Chỉnh sửa bản thu/ })).toBeVisible();
    await expect(page.getByText("Luồng 3 bước", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Gợi ý luồng đóng góp" })).toBeVisible();
  });

  test("Step 1: file selection", async ({ page }) => {
    test.slow();
    if (process.env.E2E_SKIP_HEAVY === "1") test.skip();
    await page.goto("/upload");

    await page.locator("#field-file input[type='file']").setInputFiles(fixtureWav);
    const start = page.getByRole("button", { name: /Bắt đầu tải lên/ });
    await expect(start).toBeVisible({ timeout: 60_000 });
    await start.click();
    await expect(page.getByText("Đã tải lên thành công")).toBeVisible({ timeout: 120_000 });
  });

  test("Step 2: metadata form + validation", async ({ page }) => {
    test.slow();
    if (process.env.E2E_SKIP_HEAVY === "1") test.skip();
    await page.goto("/upload");

    await page.locator("#field-file input[type='file']").setInputFiles(fixtureWav);
    await page.getByRole("button", { name: /Bắt đầu tải lên/ }).click();
    await expect(page.getByText("Đã tải lên thành công")).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Tiếp theo" }).click();
    const title = page.getByPlaceholder("Nhập tên bản nhạc");
    await expect(title).toBeVisible({ timeout: 20_000 });
    await title.fill(`E2E Upload ${Date.now()}`);
    await expect(title).toHaveValue(/E2E Upload/);
  });

  test("Step 3: confirmation", async ({ page }) => {
    test.slow();
    if (process.env.E2E_SKIP_HEAVY === "1") test.skip();
    await page.goto("/upload");

    await page.locator("#field-file input[type='file']").setInputFiles(fixtureWav);
    await page.getByRole("button", { name: /Bắt đầu tải lên/ }).click();
    await expect(page.getByText("Đã tải lên thành công")).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Tiếp theo" }).click();

    await page.getByPlaceholder("Nhập tên bản nhạc").fill(`E2E Upload ${Date.now()}`);
    const next = page.getByRole("button", { name: "Tiếp theo" });
    const canNext = await next.isEnabled().catch(() => false);
    test.skip(!canNext, "Thiếu field bắt buộc/reference data nên không thể qua bước 3 (API thật).");
    await next.click();

    await expect(page.getByRole("button", { name: "Đóng góp", exact: true })).toBeVisible({ timeout: 20_000 });
  });

  test("Submit form and verify Real API 200 OK (best-effort)", async ({ page }) => {
    test.slow();
    if (process.env.E2E_SKIP_HEAVY === "1") test.skip();

    await page.goto("/upload");

    await page.locator("#field-file input[type='file']").setInputFiles(fixtureWav);
    await page.getByRole("button", { name: /Bắt đầu tải lên/ }).click();
    await expect(page.getByText("Đã tải lên thành công")).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Tiếp theo" }).click();

    await page.getByPlaceholder("Nhập tên bản nhạc").fill(`E2E-${Date.now()}`);
    const agreeUnknownComposer = page.getByRole("checkbox", { name: /Dân gian\/Không rõ tác giả/ });
    const agreeUnknownCollector = page.getByRole("checkbox", { name: "Không rõ", exact: true });
    await agreeUnknownCollector.check().catch(() => {});
    await agreeUnknownComposer.check().catch(() => {});

    await page.getByRole("button", { name: "Hát không đệm" }).click().catch(() => {});

    const vocalTrigger = page.locator("#field-vocalStyle").getByRole("button").first();
    const hasVocal = await vocalTrigger.isVisible().catch(() => false);
    if (hasVocal) {
      await vocalTrigger.click();
      const firstOption = page.getByRole("button").filter({ hasText: /./ }).first();
      const canPick = await firstOption.isVisible().catch(() => false);
      if (canPick) await firstOption.click().catch(() => {});
    }

    const next = page.getByRole("button", { name: "Tiếp theo" });
    const canNext = await next.isEnabled().catch(() => false);
    test.skip(!canNext, "Thiếu reference data/field bắt buộc nên không thể qua bước 3 (API thật).");
    await next.click();

    const submitContribution = page.getByRole("button", { name: "Đóng góp", exact: true });
    await expect(submitContribution).toBeVisible({ timeout: 30_000 });
    await submitContribution.click();
    await expect(page.getByRole("heading", { name: "Xác nhận đóng góp" })).toBeVisible();
    await page.getByRole("button", { name: "Gửi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Đóng góp thành công" })).toBeVisible({
      timeout: 120_000,
    });
  });
});

