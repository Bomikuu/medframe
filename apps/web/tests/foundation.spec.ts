import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const projectRoot = resolve(process.cwd(), "../..");
const staff = {
  email: `browser-${randomBytes(6).toString("hex")}@example.org`,
  password: randomBytes(24).toString("base64url"),
};

test.beforeAll(() => {
  execFileSync(
    "uv",
    ["run", "--project", "services/api", "python", "services/api/tests/e2e_seed.py"],
    {
      cwd: projectRoot,
      input: JSON.stringify(staff),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
});

test("real sign-in, MFA, organizations, refresh, and logout", async ({ page }) => {
  const output = resolve(projectRoot, "test-results/review");
  await mkdir(output, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.screenshot({
    path: `${output}/login-desktop-light.png`,
    fullPage: true,
    caret: "initial",
  });
  const loginAudit = await new AxeBuilder({ page }).analyze();
  expect(loginAudit.violations).toEqual([]);

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Work email").fill(staff.email);
  await page.getByLabel("Password", { exact: true }).fill(staff.password);
  await page.route("**/api/backend/auth/login", (route) => route.abort());
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Connection lost" })).toContainText(
    "Connection lost",
  );
  await expect(page.getByLabel("Work email")).toHaveValue(staff.email);
  await page.unroute("**/api/backend/auth/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Protect your account" })).toBeVisible();
  await page.getByText("Can’t scan the code?").click();
  const secret = await page.locator("main details code").textContent();
  const otp = execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import sys,pyotp; print(pyotp.TOTP(sys.stdin.read().strip()).now())",
    ],
    {
      cwd: projectRoot,
      input: secret ?? "",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByRole("heading", { name: "Save your recovery codes" })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page).toHaveURL(/\/clinic$/);
  await expect(page.getByRole("heading", { name: "Your foundation is ready" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Dr. Althea Reyes (test)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your foundation is ready" })).toBeVisible();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Synthetic Riverside Dental" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic Riverside Dental" })).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    for (const [device, viewport] of [
      ["desktop", { width: 1440, height: 1000 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: `${output}/workspace-${device}-${theme}.png`,
        fullPage: true,
        caret: "initial",
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const audit = await new AxeBuilder({ page }).analyze();
      expect(audit.violations).toEqual([]);
    }
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/clinic");
  await expect(page).toHaveURL(/\/login$/);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: `${output}/login-mobile-dark.png`,
    fullPage: true,
    caret: "initial",
  });
  await page.getByLabel("Work email").fill(staff.email);
  await page.getByLabel("Password", { exact: true }).fill(staff.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verify it’s you" })).toBeVisible();
  await expect(page.getByLabel("Authenticator or recovery code")).toHaveAttribute(
    "inputmode",
    "text",
  );
});

test("password recovery gives an enumeration-safe result", async ({ page }) => {
  await page.goto("/auth/recover");
  await page.getByLabel("Work email").fill("not-registered@example.org");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an active account matches");
  await page.goto("/auth/reset");
  await expect(page.getByRole("alert").filter({ hasText: "missing or expired" })).toContainText(
    "missing or expired",
  );
});
