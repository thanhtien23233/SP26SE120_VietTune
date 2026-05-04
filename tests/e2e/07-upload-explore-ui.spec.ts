import { test, expect } from "@playwright/test";

/**
 * Upload UI project runs without contributor storageState (IndexedDB auth).
 * Minimal check: upload route renders; contributor gate may show for guest.
 */
test("upload route renders", async ({ page }) => {
  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: /Đóng góp bản thu|Chỉnh sửa bản thu/ }),
  ).toBeVisible();
});

/** P2 — guest không vào được luồng đóng góp (không cần mock). */
test("guest sees contributor gate on upload", async ({ page }) => {
  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: /Bạn cần có tài khoản Người đóng góp để đóng góp bản thu/i }),
  ).toBeVisible();
});
