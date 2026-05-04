import { expect, test } from "@playwright/test";

import { gotoAsResearcher, skipIfNoResearcherSession } from "./helpers/researcherSession";

test.describe("researcher — QA tab + Knowledge Graph tab (35)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoResearcherSession();
    await gotoAsResearcher(page, baseURL!);
    await page.goto("/researcher");
  });

  test("Hỏi đáp: gửi câu hỏi và chờ phản hồi (best-effort)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cổng nghiên cứu" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: /Hỏi đáp thông minh/ }).click();
    await expect(page.getByRole("heading", { name: "VietTune Intelligence" })).toBeVisible();

    const input = page.getByLabel("Tin nhắn");
    const userLine = "E2E: Giới thiệu ngắn về đàn bầu.";
    await input.fill(userLine);
    await page.getByRole("button", { name: "Gửi" }).click();

    await expect(page.getByText(userLine, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(
        async () => {
          const typing = page.locator(".animate-bounce");
          return (await typing.count()) === 0;
        },
        { timeout: 90_000, intervals: [500, 1000] },
      )
      .toBe(true);

    await expect
      .poll(
        async () => (await page.locator("p.leading-relaxed").count()) >= 3,
        { timeout: 15_000, intervals: [300] },
      )
      .toBe(true);
  });

  test("Biểu đồ tri thức: khung Tổng quan / Nhạc cụ / Dân tộc", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cổng nghiên cứu" })).toBeVisible({
      timeout: 45_000,
    });

    await page.getByRole("button", { name: /Biểu đồ tri thức/ }).click();
    await expect(page.getByRole("heading", { name: "Biểu đồ tri thức tương tác" })).toBeVisible();

    await page.getByRole("button", { name: "Tổng quan" }).click();
    await page.getByRole("button", { name: "Nhạc cụ" }).click();
    await page.getByRole("button", { name: "Dân tộc" }).click();
    await page.getByRole("button", { name: "Tổng quan" }).click();
  });
});
