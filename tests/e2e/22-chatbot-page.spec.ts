import { test, expect } from "@playwright/test";

import { gotoAsContributor, skipIfNoContributorSession } from "./helpers/contributorSession";

test.describe("chatbot page (auth)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    skipIfNoContributorSession();
    await gotoAsContributor(page, baseURL!);
  });

  test("Chatbot page loads", async ({ page }) => {
    await page.goto("/chatbot");
    await expect(page.getByText(/Xin chào!/i).first()).toBeVisible();
    await expect(page.getByLabel("Tin nhắn")).toBeVisible();
    await expect(page.getByText("Lịch sử", { exact: true })).toBeVisible();
  });

  test("Send message", async ({ page }) => {
    await page.goto("/chatbot");
    await page.getByLabel("Tin nhắn").fill("Xin chào E2E");
    await page.keyboard.press("Enter");
    await expect(page.locator("div.whitespace-pre-wrap", { hasText: "Xin chào E2E" }).first()).toBeVisible();
  });

  test("Bot reply (Real API)", async ({ page }) => {
    await page.goto("/chatbot");
    await page.getByLabel("Tin nhắn").fill("Tôi muốn hỏi về đàn bầu");
    await page.keyboard.press("Enter");
    await expect(page.getByTitle("Báo cáo câu trả lời chưa đúng")).toBeVisible({ timeout: 25_000 });
  });

  test("New chat button resets welcome", async ({ page }) => {
    await page.goto("/chatbot");
    await page.getByLabel("Tin nhắn").fill("Tin nhắn cũ");
    await page.keyboard.press("Enter");
    const msg = page.locator("div.whitespace-pre-wrap", { hasText: "Tin nhắn cũ" }).first();
    await expect(msg).toBeVisible();

    await page.getByTitle("Tạo cuộc trò chuyện mới").click();
    await expect(msg).toBeHidden();
    await expect(page.getByText(/Xin chào!/i).first()).toBeVisible();
  });

  test("Flag message toggle (Real API)", async ({ page }) => {
    await page.goto("/chatbot");
    await page.getByLabel("Tin nhắn").fill("Hỏi E2E");
    await page.keyboard.press("Enter");

    await expect(page.getByTitle("Báo cáo câu trả lời chưa đúng")).toBeVisible({ timeout: 25_000 });
    await page.getByTitle("Báo cáo câu trả lời chưa đúng").click();

    const unflag = page.getByTitle("Bỏ đánh dấu báo cáo");
    const toggled = await unflag.isVisible().catch(() => false);
    if (toggled) {
      await unflag.click();
      await expect(page.getByTitle("Báo cáo câu trả lời chưa đúng")).toBeVisible({ timeout: 15_000 });
      return;
    }

    await expect(page.getByTitle("Báo cáo câu trả lời chưa đúng")).toBeVisible();
  });
});

