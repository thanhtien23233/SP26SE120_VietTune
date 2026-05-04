import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { test as setup, expect } from "@playwright/test";

import { readAuthFromIndexedDB } from "./helpers/viettuneIndexedDBAuth";

setup.setTimeout(120_000);

type RoleSetupConfig = {
  title: string;
  emailEnv: string;
  passwordEnv: string;
  storageStateFile: string;
  idbAuthFile: string;
  skipMessage: string;
};

const configs: RoleSetupConfig[] = [
  {
    title: "authenticate contributor",
    emailEnv: "E2E_CONTRIBUTOR_EMAIL",
    passwordEnv: "E2E_CONTRIBUTOR_PASSWORD",
    storageStateFile: "contributor.json",
    idbAuthFile: "contributor-idb.json",
    skipMessage:
      "Thiếu E2E_CONTRIBUTOR_EMAIL / E2E_CONTRIBUTOR_PASSWORD (đặt trong .env.local để chạy contributor E2E).",
  },
  {
    title: "authenticate expert",
    emailEnv: "E2E_EXPERT_EMAIL",
    passwordEnv: "E2E_EXPERT_PASSWORD",
    storageStateFile: "expert.json",
    idbAuthFile: "expert-idb.json",
    skipMessage: "Thiếu E2E_EXPERT_EMAIL / E2E_EXPERT_PASSWORD.",
  },
  {
    title: "authenticate researcher",
    emailEnv: "E2E_RESEARCHER_EMAIL",
    passwordEnv: "E2E_RESEARCHER_PASSWORD",
    storageStateFile: "researcher.json",
    idbAuthFile: "researcher-idb.json",
    skipMessage: "Thiếu E2E_RESEARCHER_EMAIL / E2E_RESEARCHER_PASSWORD.",
  },
  {
    title: "authenticate admin",
    emailEnv: "E2E_ADMIN_EMAIL",
    passwordEnv: "E2E_ADMIN_PASSWORD",
    storageStateFile: "admin.json",
    idbAuthFile: "admin-idb.json",
    skipMessage: "Thiếu E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.",
  },
];

for (const cfg of configs) {
  setup(cfg.title, async ({ page }) => {
    const email = process.env[cfg.emailEnv]?.trim();
    const password = process.env[cfg.passwordEnv]?.trim();
    if (!email || !password) {
      setup.skip(true, cfg.skipMessage);
      return;
    }

    const storageStatePath = join(process.cwd(), "playwright", ".auth", cfg.storageStateFile);
    const idbAuthPath = join(process.cwd(), "playwright", ".auth", cfg.idbAuthFile);

    await page.goto("/login");
    await page.getByPlaceholder("Email hoặc số điện thoại").fill(email);
    await page.getByPlaceholder("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    const auth = await expect
      .poll(() => readAuthFromIndexedDB(page), { timeout: 90_000 })
      .toMatchObject({
        access_token: expect.any(String),
        user: expect.any(String),
      })
      .then(() => readAuthFromIndexedDB(page));

    const { access_token, user } = auth;

    mkdirSync(dirname(idbAuthPath), { recursive: true });
    writeFileSync(idbAuthPath, JSON.stringify({ access_token, user }, null, 2), "utf8");

    await page.context().storageState({ path: storageStatePath });
  });
}
