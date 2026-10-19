/* One batched Station gallery browser pass; all identity and care records are synthetic. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/station-gallery.json", "utf8"),
);
const out = path.resolve(".impeccable/review/station-gallery");
const base = "http://localhost:3001";
const report = { groups: [], captures: [], geometry: [], errors: [] };
const browser = await chromium.launch({ headless: true });
async function addCookie(context, name, value) {
  await context.addCookies([
    { name, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}
async function api(page, endpoint, body) {
  return page.evaluate(
    async ({ endpoint, body }) => {
      const csrf = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await fetch("/api/backend/" + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    },
    { endpoint, body },
  );
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
  report.captures.push(name);
  report.geometry.push({ name, ...geometry });
  assert.equal(geometry.overflow, false, name + " document overflow");
}
let page;
try {
  const sourceContext = await browser.newContext();
  await addCookie(sourceContext, "medframe_django_session", fixture.sender_session);
  const source = await sourceContext.newPage();
  await source.goto(base + "/station");
  const issued = await api(source, "stations/doctor", {
    action: "issue",
    organization_id: fixture.organization,
    branch_id: fixture.branch,
  });
  assert.equal(issued.status, 200);
  const device = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await addCookie(device, "medframe_device", fixture.device_cookie);
  page = await device.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  let logoutRequests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/logout")) logoutRequests++;
  });
  await page.goto(base + "/station");
  await page
    .getByRole("textbox", { name: "Clinician access code", exact: true })
    .fill(issued.data.code);
  await page.getByRole("button", { name: "Open workspace", exact: true }).click();
  const gallery = page.getByRole("list", { name: "Consultation gallery", exact: true });
  await expect(gallery).toBeVisible();
  for (const [name, width, height] of [
    ["confirmation-tablet", 1024, 768],
    ["confirmation-phone", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await capture(page, name);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: "End session", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Keep working", exact: true })
    .click();
  assert.equal(logoutRequests, 0);
  await gallery.getByRole("link", { name: "Open consultation", exact: true }).click();
  const dental = page.locator('[data-dental-editor="true"]');
  await expect(dental).toBeVisible();
  await dental.getByRole("button", { name: "End session", exact: true }).click();
  let confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toBeVisible();
  assert.equal(await confirmation.evaluate((element) => getComputedStyle(element).zIndex), "170");
  await capture(page, "end-confirmation-over-editor");
  await confirmation.getByRole("button", { name: "Keep working", exact: true }).click();
  assert.equal(logoutRequests, 0);
  await expect(dental).toBeVisible();
  report.groups.push(
    "Dashboard and full-screen saved editor ask before logout; cancel keeps the active session and editor",
  );
  await dental.getByRole("button", { name: "Clinical notes", exact: true }).click();
  await page.getByRole("link", { name: "Station home", exact: true }).click();
  await page.getByRole("link", { name: "Start walk-in", exact: true }).click();
  await expect(dental).toBeVisible();
  await dental.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByLabel("Subjective", { exact: true })
    .fill("Synthetic unsaved walk-in used only to verify explicit logout");
  await page.getByRole("tab", { name: "Dental chart", exact: true }).click();
  await expect(dental).toBeVisible();
  let nativeDialogs = 0;
  page.on("dialog", async (dialog) => {
    nativeDialogs++;
    await dialog.dismiss();
  });
  await dental.getByRole("button", { name: "End session", exact: true }).click();
  confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("Unsaved notes");
  await confirmation.getByRole("button", { name: "Confirm end session", exact: true }).click();
  await expect(page).toHaveURL(base + "/station");
  assert.equal(logoutRequests, 1);
  assert.equal(nativeDialogs, 0);
  report.groups.push(
    "Walk-in editor confirmation warns about unsaved input and performs one logout without a second browser prompt",
  );
} catch (error) {
  report.failure = String(error.message).split("\n").slice(0, 5).join("\n");
  if (page) {
    try {
      await page.screenshot({ path: path.join(out, "failure.png"), fullPage: false });
    } catch {}
  }
} finally {
  fs.writeFileSync(path.join(out, "browser-confirmation.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
if (report.failure) process.exitCode = 1;
