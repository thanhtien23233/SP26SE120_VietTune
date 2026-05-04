import * as fs from "node:fs";
import * as path from "node:path";

import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

import { seedIndexedDBAuth } from "./viettuneIndexedDBAuth";

const IDB_FILE = path.join(process.cwd(), "playwright", ".auth", "contributor-idb.json");

/** Khi auth.setup bị skip (thiếu E2E_*), Playwright vẫn có thể chạy project contributor — bỏ qua spec tại đây. */
export function skipIfNoContributorSession(): void {
  if (!fs.existsSync(IDB_FILE)) {
    test.skip(true, "Thiếu playwright/.auth/contributor-idb.json — đặt E2E_CONTRIBUTOR_EMAIL/PASSWORD và chạy project setup.");
  }
}

type ContributorIdbPayload = { access_token: string; user: string };

export function loadContributorIdbPayload(): ContributorIdbPayload {
  if (!fs.existsSync(IDB_FILE)) {
    throw new Error(
      "Missing playwright/.auth/contributor-idb.json. Run: npx playwright test tests/e2e/auth.setup.ts --project=setup (needs E2E_CONTRIBUTOR_EMAIL / E2E_CONTRIBUTOR_PASSWORD).",
    );
  }
  const raw = JSON.parse(fs.readFileSync(IDB_FILE, "utf8")) as ContributorIdbPayload;
  if (!raw?.access_token || typeof raw.user !== "string") {
    throw new Error("contributor-idb.json must contain access_token and user (JSON string of user object).");
  }
  return raw;
}

/** Navigate to app origin, inject IDB session, reload — contributor routes see logged-in state. */
export async function gotoAsContributor(page: Page, baseURL: string): Promise<void> {
  const { access_token, user } = loadContributorIdbPayload();
  await page.goto(baseURL);
  await seedIndexedDBAuth(page, access_token, user);
}
