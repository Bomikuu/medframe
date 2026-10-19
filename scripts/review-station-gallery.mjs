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
  await expect(gallery.getByText("Delayed · +12 min", { exact: true })).toBeVisible();
  await expect(gallery.getByText("Arrived 15 min late", { exact: true })).toBeVisible();
  await expect(gallery.getByText("Rescheduled", { exact: true })).toBeVisible();
  await expect(gallery.getByText(/past scheduled time · awaiting arrival/)).toBeVisible();
  const agenda = page.getByRole("complementary", { name: "Upcoming care", exact: true });
  await expect(agenda.getByText("Synthetic Tomorrow Patient", { exact: true })).toBeVisible();
  await expect(page.locator('[aria-label="Current clinic time"] time[datetime]')).toBeVisible();
  report.groups.push(
    "Doctor-code session receives authorized gallery, clinic clock, upcoming queue and factual late/delayed/rescheduled states",
  );
  await gallery
    .getByRole("button", { name: "Change photo for Synthetic Station Patient", exact: true })
    .click();
  const photo = page.getByRole("dialog");
  await expect(photo.getByRole("heading", { name: "Patient photo", exact: true })).toBeVisible();
  await expect(
    photo.getByRole("button", { name: "Choose profile image", exact: true }),
  ).toBeVisible();
  await photo.getByRole("button", { name: /Synthetic patient portrait/ }).click();
  await photo.getByRole("button", { name: "Use selected photo", exact: true }).click();
  await expect(photo).toHaveCount(0);
  const image = gallery.getByRole("img", {
    name: "Photo of Synthetic Station Patient",
    exact: true,
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
    .toBe(true);
  report.groups.push(
    "Circular photo picker selects a same-patient scanned image and protected image bytes render in gallery",
  );
  for (const [name, width, height] of [
    ["gallery-tablet-landscape", 1024, 768],
    ["gallery-desktop", 1440, 1000],
    ["gallery-tablet-portrait", 768, 1024],
    ["gallery-phone", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await capture(page, name);
  }
  report.groups.push(
    "Desktop, landscape tablet, portrait tablet and phone captures have no document overflow",
  );
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("tab", { name: "All consultations", exact: true }).click();
  await expect(gallery.getByRole("link", { name: "Open consultation", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(gallery.getByText("Rescheduled", { exact: true })).toBeVisible();
  report.groups.push("Today and All consultations switch without losing clinical access");
  await page.getByRole("button", { name: "End session", exact: true }).click();
  let confirmation = page.getByRole("alertdialog");
  await expect(
    confirmation.getByRole("heading", { name: "End this Station session?", exact: true }),
  ).toBeVisible();
  assert.equal(logoutRequests, 0);
  await confirmation.getByRole("button", { name: "Keep working", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  assert.equal(logoutRequests, 0);
  await gallery.getByRole("link", { name: "Open consultation", exact: true }).click();
  const dental = page.locator('[data-dental-editor="true"]');
  await expect(dental).toBeVisible();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toBeVisible();
  assert.equal(await confirmation.evaluate((element) => getComputedStyle(element).zIndex), "170");
  await capture(page, "end-confirmation-over-editor");
  await confirmation.getByRole("button", { name: "Confirm end session", exact: true }).click();
  await expect(page).toHaveURL(base + "/station");
  assert.equal(logoutRequests, 1);
  report.groups.push(
    "End session waits for confirmation, cancel sends no logout, and confirmation works above the full-screen editor",
  );
} catch (error) {
  report.failure = String(error.message).split("\n").slice(0, 5).join("\n");
  if (page) {
    try {
      await page.screenshot({ path: path.join(out, "failure.png"), fullPage: false });
    } catch {}
  }
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
if (report.failure) process.exitCode = 1;
