import path from "node:path";

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const fixtureWav = path.join(process.cwd(), "tests/e2e/fixtures/e2e-clip.wav");

/** Tên option trong mock vocal-styles — tránh phụ thuộc BE trả danh sách rỗng. */
const E2E_VOCAL_STYLE_NAME = "E2E Lối hát";

// Backend expects `vocalStyleId` to be a GUID. Use a valid UUID-like string.
const E2E_VOCAL_STYLE_ID = "11111111-1111-1111-1111-111111111111";

const mockVocalStylesJson = JSON.stringify({
  success: true,
  message: "",
  data: [{ id: E2E_VOCAL_STYLE_ID, name: E2E_VOCAL_STYLE_NAME }],
  total: 1,
  page: 1,
  pageSize: 250,
});

/**
 * P0 Narrow: wizard 3 bước — upload/submit API thật; mock `vocal-styles` (mixed) để dropdown luôn có option.
 */
export async function completeContributorUploadWizard(page: Page, titleMarker: string): Promise<void> {
  await page.route("**/ReferenceData/vocal-styles**", async (route) => {
    // Prefer real reference data so submitted IDs are valid in DB.
    // If real endpoint returns empty, fall back to a deterministic mock.
    const response = await route.fetch();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    const data = json?.data;
    const hasRealData = Array.isArray(data) && data.length > 0;

    if (hasRealData) {
      const first = data[0];
      const patched = {
        ...json,
        data: [
          { ...first, name: E2E_VOCAL_STYLE_NAME },
          ...data.slice(1),
        ],
      };

      await route.fulfill({
        status: response.status(),
        contentType: response.headers()["content-type"] ?? "application/json",
        body: JSON.stringify(patched),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: mockVocalStylesJson,
    });
  });

  await page.goto("/upload");

  await page.locator("#field-file input[type='file']").setInputFiles(fixtureWav);

  await expect(page.getByRole("button", { name: /Bắt đầu tải lên/ })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Bắt đầu tải lên/ }).click();

  await expect(page.getByText("Đã tải lên thành công")).toBeVisible({ timeout: 120_000 });

  await page.getByRole("button", { name: "Tiếp theo" }).click();
  /** "Bước 2/3: …" chỉ trong khối `sm:hidden`; desktop dùng stepper khác — assert field bước 2. */
  await expect(page.getByPlaceholder("Nhập tên bản nhạc")).toBeVisible({ timeout: 30_000 });

  await page.getByPlaceholder("Nhập tên bản nhạc").fill(titleMarker);

  await page.getByRole("checkbox", { name: "Không rõ", exact: true }).check();
  await page.getByRole("checkbox", { name: /Dân gian\/Không rõ tác giả/ }).check();

  await page.getByRole("button", { name: "Hát không đệm" }).click();

  const vocalTrigger = page.locator("#field-vocalStyle").getByRole("button", { name: /Chọn lối hát/ });
  await expect(vocalTrigger).toBeVisible({ timeout: 60_000 });
  await vocalTrigger.click();

  await expect(page.getByRole("button", { name: E2E_VOCAL_STYLE_NAME })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: E2E_VOCAL_STYLE_NAME }).click();

  await page.getByRole("button", { name: "Tiếp theo" }).click();
  const submitContribution = page.getByRole("button", { name: "Đóng góp", exact: true });
  await expect(submitContribution).toBeVisible({ timeout: 30_000 });
  await submitContribution.click();
  await expect(page.getByRole("heading", { name: "Xác nhận đóng góp" })).toBeVisible();
  await page.getByRole("button", { name: "Gửi", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Đóng góp thành công" })).toBeVisible({ timeout: 120_000 });
}
