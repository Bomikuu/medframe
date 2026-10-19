/* One bounded native browser pass. Synthetic cookies and codes stay private. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/station-doctor.json", "utf8"),
);
const out = path.resolve(".impeccable/review/station-doctor-workspace");
const base = "http://localhost:3001";
const report = { groups: [], captures: [], errors: [], geometry: [] };
const browser = await chromium.launch({ headless: true });
async function cookie(context, name, value) {
  await context.addCookies([
    { name, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
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
  assert.equal(geometry.overflow, false);
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
try {
  const sourceContext = await browser.newContext();
  await cookie(sourceContext, "medframe_django_session", fixture.sender_session);
  const source = await sourceContext.newPage();
  await source.goto(base + "/station");
  const issued = await api(source, "stations/doctor", {
    action: "issue",
    organization_id: fixture.organization,
    branch_id: fixture.branch,
  });
  assert.equal(issued.status, 200);
  const deviceContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await cookie(deviceContext, "medframe_device", fixture.device_cookie);
  const device = await deviceContext.newPage();
  device.on("pageerror", (error) => report.errors.push(error.message));
  await device.goto(base + "/station");
  await device
    .getByRole("textbox", { name: "Clinician access code", exact: true })
    .fill(issued.data.code);
  await device.getByRole("button", { name: "Open workspace", exact: true }).click();
  await device.getByRole("button", { name: /Choose patient/ }).click();
  await device.getByRole("button", { name: /Synthetic Station Patient/ }).click();
  await expect(
    device.getByRole("heading", { name: "Synthetic Station Patient", exact: true }),
  ).toBeVisible();
  await expect(device.getByRole("link", { name: "Open consultation", exact: true })).toBeVisible();
  report.groups.push("Patient chooser opens patient context and consultation history");
  await device.getByRole("link", { name: "Station home", exact: true }).click();
  await device.getByRole("link", { name: /Start walk-in consultation/ }).click();
  const dental = device.locator('[data-dental-editor="true"]');
  await expect(dental).toBeVisible();
  await capture(device, "provisional-dental-tablet");
  await dental.getByRole("button", { name: "Notes", exact: true }).click();
  await device.getByLabel("Subjective", { exact: true }).fill("Synthetic provisional walk-in note");
  await device
    .getByRole("button", { name: "Confirm patient & save", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  const modal = device.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: "Confirm patient & save consultation", exact: true }),
  ).toBeVisible();
  await modal.getByRole("button", { name: "New patient", exact: true }).click();
  await modal.getByLabel("Full name", { exact: true }).fill("Synthetic deferred identity patient");
  await modal
    .getByLabel("Reason for consultation", { exact: true })
    .fill("Synthetic deferred-identity review");
  await modal.getByRole("checkbox").check();
  await capture(device, "walk-in-details-tablet");
  const committedResponse = device.waitForResponse((r) => r.url().endsWith("/stations/walk-in"));
  await modal.getByRole("button", { name: "Save & open review", exact: true }).click();
  const committed = await committedResponse;
  assert.equal(committed.status(), 200);
  const committedData = await committed.json();
  await expect(device).toHaveURL(new RegExp("/consultations/" + committedData.encounter_id));
  await expect(device.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic provisional walk-in note",
  );
  report.groups.push(
    "Walk-in uses shared editor, collects identity at end and saves original clinical aggregate with note intact",
  );
  const end = device.getByRole("button", { name: "End session", exact: true });
  await end.click();
  await expect(device).toHaveURL(base + "/station");
  report.groups.push("Ending doctor session returns paired device to code entry");
} catch (error) {
  report.failure = String(error.message).split("\n").slice(0, 3).join("\n");
} finally {
  fs.writeFileSync(path.join(out, "browser-remaining.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    groups: report.groups,
    captures: report.captures,
    errors: report.errors,
    failure: report.failure ?? null,
  }),
);
if (report.failure) process.exitCode = 1;
