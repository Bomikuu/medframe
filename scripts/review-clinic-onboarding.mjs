/* Bounded synthetic onboarding acceptance. Credentials remain in a private fixture. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 15000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/clinic-onboarding.json", "utf8"),
);
const out = path.resolve(".impeccable/review/clinic-onboarding"),
  base = "http://localhost:3001";
const report = { groups: [], captures: [], errors: [], geometry: [] };
function otp(secret) {
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((value) => parseInt(value, 2))),
    counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = crypto.createHmac("sha1", bytes).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length - 1] & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function capture(page, name) {
  await page.screenshot({
    path: path.join(out, name + ".png"),
    fullPage: false,
    animations: "disabled",
  });
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  assert.equal(geometry.overflow, false, `${name}: no horizontal overflow`);
  report.captures.push(name);
  report.geometry.push({ name, ...geometry });
}
async function mailCode(page, previousIds) {
  let code;
  await expect
    .poll(
      async () => {
        const messages = await (
          await page.request.get("http://127.0.0.1:58025/api/v1/messages")
        ).json();
        for (const item of messages.messages ?? []) {
          if (
            previousIds.has(item.ID) ||
            !(item.To ?? []).some((to) => to.Address === fixture.email)
          )
            continue;
          const detail = await (
            await page.request.get(`http://127.0.0.1:58025/api/v1/message/${item.ID}`)
          ).json();
          const match = detail.Text?.match(/verification code: (\d{6})/);
          if (match) {
            code = match[1];
            return true;
          }
        }
        return false;
      },
      { timeout: 30000, intervals: [1000, 2000] },
    )
    .toBe(true);
  return code;
}
let lastVerification = 0;
async function verifyEmail(page) {
  const previous = await (await page.request.get("http://127.0.0.1:58025/api/v1/messages")).json();
  const ownMessages = (previous.messages ?? []).filter((item) =>
    (item.To ?? []).some((to) => to.Address === fixture.email),
  );
  lastVerification = Math.max(
    lastVerification,
    ...ownMessages.map((item) => Date.parse(item.Created) || 0),
  );
  const previousIds = new Set((previous.messages ?? []).map((item) => item.ID));
  const remaining = 61000 - (Date.now() - lastVerification);
  if (lastVerification && remaining > 0)
    await new Promise((resolve) => setTimeout(resolve, remaining));
  lastVerification = Date.now();
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await page
    .getByLabel("Verification code", { exact: true })
    .fill(await mailCode(page, previousIds));
  await page.getByRole("button", { name: "Verify and continue", exact: true }).click();
}
async function saved(page) {
  await expect(page.getByRole("status").filter({ hasText: "All changes saved" })).toBeVisible();
}
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
let page, context;
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  if (!process.env.ONBOARD_REMAINING) {
    await page.goto(fixture.link);
    await expect(
      page.getByRole("heading", { name: "Welcome to Medframe", exact: true }),
    ).toBeVisible();
    await capture(page, "welcome-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "welcome-phone");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your practice, organized.", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "A clearer way to visualize care.", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Slide 5:/ }).click();
    await page.getByRole("button", { name: "Get started", exact: true }).click();
    assert.equal(new URL(page.url()).pathname, "/onboarding/setup");
    await verifyEmail(page);
    await expect(
      page.getByRole("heading", { name: "Clinic information", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Clinic name", { exact: true }).fill(fixture.clinic_name);
    await page
      .getByLabel("Clinic contact email", { exact: true })
      .fill("review-clinic@example.com");
    await page.getByLabel("Contact number", { exact: true }).fill("+639171234567");
    await page.getByLabel("City", { exact: true }).fill("Synthetic City");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Medical specialties", exact: true }),
    ).toBeVisible();
  } else {
    await page.goto(fixture.link);
    await verifyEmail(page);
    await expect(
      page.getByRole("heading", { name: "Medical specialties", exact: true }),
    ).toBeVisible();
  }
  const dentistry = page.getByRole("button", { name: "General Dentistry", exact: true });
  if ((await dentistry.getAttribute("aria-pressed")) !== "true") await dentistry.click();
  await page.getByRole("button", { name: /^dentist$/i, exact: true }).click();
  await page.getByRole("button", { name: "Save and exit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your progress is saved", exact: true }),
  ).toBeVisible();
  report.groups.push("Five-slide controls, verified email, clinic form and server save/exit");
  // Fresh browser context is intentional: no browser-local storage/session can restore this draft.
  await context.close();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(fixture.link);
  await verifyEmail(page);
  await expect(
    page.getByRole("heading", { name: "Medical specialties", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "General Dentistry", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make it your own", exact: true })).toBeVisible();
  const logo = await sharp({
    create: { width: 240, height: 120, channels: 4, background: "#123C53" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Choose clinic logo", { exact: true })
    .setInputFiles({ name: "synthetic-logo.png", mimeType: "image/png", buffer: logo });
  await expect(page.getByRole("status").filter({ hasText: "security scan complete" })).toBeVisible({
    timeout: 30000,
  });
  await page.getByLabel("primary", { exact: true }).fill("#123C53");
  await page.getByLabel("Clinic short name (optional)", { exact: true }).fill("Review");
  await saved(page);
  await capture(page, "branding-desktop");
  await page.setViewportSize({ width: 1024, height: 768 });
  await capture(page, "branding-tablet");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "branding-phone");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Practice details", exact: true })).toBeVisible();
  await page.getByLabel("Primary branch name", { exact: true }).fill("Review branch");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your administrator account", exact: true }),
  ).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Synthetic");
  await page.getByLabel("Last name", { exact: true }).fill("Administrator");
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByLabel("Confirm password", { exact: true }).fill(fixture.password);
  await page.getByRole("checkbox", { name: "Acknowledge terms notice", exact: true }).check();
  await page.getByRole("checkbox", { name: "Acknowledge privacy notice", exact: true }).check();
  await page.getByRole("button", { name: "Continue to verification", exact: true }).click();
  await page.getByText("Can’t scan the code?", { exact: true }).click();
  const secret = await page.locator("code").textContent();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp(secret));
  await page.getByRole("button", { name: "Verify and continue", exact: true }).click();
  await page.getByRole("button", { name: "I have saved my recovery codes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review & confirm", exact: true })).toBeVisible();
  await capture(page, "review-desktop");
  await page.getByRole("button", { name: "Edit Clinic information", exact: true }).click();
  await expect(page.getByLabel("Clinic name", { exact: true })).toHaveValue(fixture.clinic_name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "6 Review & confirm", exact: true }).click();
  await page.getByRole("button", { name: "Create my clinic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your clinic is ready.", exact: true }),
  ).toBeVisible();
  report.groups.push(
    "Fresh-browser resume, private scanned logo/live branding, practice settings, native account/MFA, edit review and completion",
  );
  await page.getByRole("link", { name: "Go to dashboard", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "New clinic setup checklist", exact: true })
      .or(page.getByLabel("New clinic setup checklist", { exact: true })),
  ).toBeVisible();
  await capture(page, "new-clinic-dashboard");
  await page.getByRole("button", { name: "Dismiss setup checklist", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("New clinic setup checklist", { exact: true })).toHaveCount(0);
  report.groups.push("Correct new clinic destination and persisted checklist dismissal");
  const platformContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const platform = await platformContext.newPage();
  await platform.goto(base + "/login");
  await platform.getByLabel("Work email", { exact: true }).fill(fixture.platform_email);
  await platform.getByLabel("Password", { exact: true }).fill(fixture.platform_password);
  await platform.getByRole("button", { name: "Sign in", exact: true }).click();
  await platform
    .getByLabel("Authenticator code", { exact: true })
    .fill(otp(fixture.platform_secret));
  await platform.getByRole("button", { name: "Verify and continue", exact: true }).click();
  await platform.waitForURL((url) => !url.pathname.includes("login"), {
    waitUntil: "domcontentloaded",
  });
  await platform.goto(base + "/platform/clinic-invitations");
  await expect(platform.getByRole("button", { name: "Invite clinic", exact: true })).toBeVisible();
  await expect(platform.getByText(fixture.email, { exact: true })).toBeVisible();
  await capture(platform, "platform-invitations");
  await platform.getByRole("button", { name: "Invite clinic", exact: true }).click();
  await platform
    .getByLabel("Contact email", { exact: true })
    .fill(`second-${Date.now()}@example.test`);
  await platform.getByRole("button", { name: "Send invitation", exact: true }).click();
  await expect(platform.getByRole("dialog")).toHaveCount(0);
  report.groups.push("Authenticated platform invitation table and create dialog");
  await platformContext.close();
  assert.equal(report.errors.length, 0);
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.failure = (error.stack || error.message).replaceAll(fixture.link, "[private invitation]");
  if (page) await page.screenshot({ path: path.join(out, "browser-failure.png"), fullPage: false });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(out, process.env.ONBOARD_REMAINING ? "browser-remaining.json" : "browser.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify({
      result: report.result,
      groups: report.groups,
      failure: report.failure,
      errors: report.errors,
    }),
  );
}
