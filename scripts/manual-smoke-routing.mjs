import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

function demoUser(role, isActive = true) {
  const now = new Date().toISOString();
  const idMap = {
    Admin: "admin_demo",
    Contributor: "contrib_demo",
    Researcher: "researcher_demo",
  };
  const emailMap = {
    Admin: "admin@example.com",
    Contributor: "contrib@example.com",
    Researcher: "researcher@example.com",
  };
  return {
    id: idMap[role] ?? `${role.toLowerCase()}_demo`,
    username: `${role.toLowerCase()}_demo`,
    email: emailMap[role] ?? `${role.toLowerCase()}@example.com`,
    fullName: `${role} Demo`,
    role,
    isActive,
    isEmailConfirmed: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function createContext(browser, user = null) {
  const context = await browser.newContext();
  if (user) {
    await context.addInitScript((u) => {
      localStorage.setItem("access_token", `demo-token-${u.id}`);
      localStorage.setItem("user", JSON.stringify(u));
    }, user);
  }
  return context;
}

async function checkGuestAdminRedirect(browser) {
  const context = await createContext(browser, null);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  const url = page.url();
  await context.close();
  return {
    id: "guest-admin-login-redirect",
    expected: "/login?redirect=%2Fadmin",
    status: url.includes("/login?redirect=%2Fadmin") ? "PASS" : "FAIL",
    observed: url,
  };
}

async function checkGuestResearcherRedirect(browser) {
  const context = await createContext(browser, null);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/researcher`, { waitUntil: "networkidle" });
  const url = page.url();
  await context.close();
  return {
    id: "guest-researcher-login-redirect",
    expected: "/login?redirect=%2Fresearcher",
    status: url.includes("/login?redirect=%2Fresearcher") ? "PASS" : "FAIL",
    observed: url,
  };
}

async function checkGuestContinueLink(browser) {
  const context = await createContext(browser, null);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: "Tiếp tục với tư cách khách" });
  await link.click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  const url = page.url();
  await context.close();
  return {
    id: "guest-continue-link-home",
    expected: "/",
    status: url === `${BASE_URL}/` ? "PASS" : "FAIL",
    observed: url,
  };
}

async function checkUnauthorizedContributor(browser) {
  const contributor = demoUser("Contributor", true);
  const context = await createContext(browser, contributor);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  const adminUrl = page.url();
  await page.goto(`${BASE_URL}/researcher`, { waitUntil: "networkidle" });
  const researcherUrl = page.url();
  await context.close();
  return [
    {
      id: "contributor-to-admin-403",
      expected: "/403",
      status: adminUrl.endsWith("/403") ? "PASS" : "FAIL",
      observed: adminUrl,
    },
    {
      id: "contributor-to-researcher-403",
      expected: "/403",
      status: researcherUrl.endsWith("/403") ? "PASS" : "FAIL",
      observed: researcherUrl,
    },
  ];
}

async function checkAuthorizedAdmin(browser) {
  const admin = demoUser("Admin", true);
  const context = await createContext(browser, admin);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
  const url = page.url();
  await context.close();
  return {
    id: "admin-access-admin",
    expected: "/admin",
    status: url.endsWith("/admin") ? "PASS" : "FAIL",
    observed: url,
  };
}

async function checkAuthorizedResearcher(browser) {
  const researcher = demoUser("Researcher", true);
  const context = await createContext(browser, researcher);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/researcher`, { waitUntil: "networkidle" });
  const url = page.url();
  await context.close();
  return {
    id: "researcher-access-researcher",
    expected: "/researcher",
    status: url.endsWith("/researcher") ? "PASS" : "FAIL",
    observed: url,
  };
}

async function checkInactiveResearcher(browser) {
  const inactiveResearcher = demoUser("Researcher", false);
  const context = await createContext(browser, inactiveResearcher);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/researcher`, { waitUntil: "networkidle" });
  const pendingText = page.getByText("Đang chờ quản trị viên phê duyệt");
  const sawPending =
    (await pendingText.isVisible({ timeout: 5000 }).catch(() => false)) || false;
  const sawInactive = await page
    .getByText("Tài khoản chưa khả dụng")
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  const url = page.url();
  await context.close();
  return {
    id: "inactive-researcher-pending-not-403",
    expected: "pending/inactive UI and not /403",
    status: (sawPending || sawInactive) && !url.endsWith("/403") ? "PASS" : "FAIL",
    observed: `${url} (pendingVisible=${sawPending}, inactiveVisible=${sawInactive})`,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    results.push(await checkGuestAdminRedirect(browser));
    results.push(await checkGuestResearcherRedirect(browser));
    results.push(await checkGuestContinueLink(browser));
    results.push(...(await checkUnauthorizedContributor(browser)));
    results.push(await checkAuthorizedAdmin(browser));
    results.push(await checkAuthorizedResearcher(browser));
    results.push(await checkInactiveResearcher(browser));
    results.push({
      id: "deep-link-return-after-real-login",
      expected: "guest /researcher -> login -> real login -> /researcher",
      status: "BLOCKED",
      observed: "No real login credentials supplied for UI login flow.",
    });
  } finally {
    await browser.close();
  }

  for (const row of results) {
    console.log(`${row.status}\t${row.id}\t${row.observed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
