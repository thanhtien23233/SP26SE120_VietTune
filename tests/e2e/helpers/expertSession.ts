import * as fs from "node:fs";
import * as path from "node:path";

import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { seedIndexedDBAuth } from "./viettuneIndexedDBAuth";

const IDB_FILE = path.join(process.cwd(), "playwright", ".auth", "expert-idb.json");

/** Khi auth.setup bị skip (thiếu E2E_*), Playwright vẫn có thể chạy project expert — bỏ qua spec tại đây. */
export function skipIfNoExpertSession(): void {
  if (!fs.existsSync(IDB_FILE)) {
    test.skip(
      true,
      "Thiếu playwright/.auth/expert-idb.json — đặt E2E_EXPERT_EMAIL/PASSWORD và chạy project setup.",
    );
  }
}

type ExpertIdbPayload = { access_token: string; user: string };

export function loadExpertIdbPayload(): ExpertIdbPayload {
  if (!fs.existsSync(IDB_FILE)) {
    throw new Error(
      "Missing playwright/.auth/expert-idb.json. Run: npx playwright test tests/e2e/auth.setup.ts --project=setup (needs E2E_EXPERT_EMAIL / E2E_EXPERT_PASSWORD).",
    );
  }
  const raw = JSON.parse(fs.readFileSync(IDB_FILE, "utf8")) as ExpertIdbPayload;
  if (!raw?.access_token || typeof raw.user !== "string") {
    throw new Error("expert-idb.json must contain access_token and user (JSON string of user object).");
  }
  return raw;
}

/** Navigate to app origin, inject IDB session, reload — expert routes see logged-in state. */
export async function gotoAsExpert(page: Page, baseURL: string): Promise<void> {
  const { access_token, user } = loadExpertIdbPayload();
  await page.goto(baseURL);
  await seedIndexedDBAuth(page, access_token, user);
}

