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
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await cookie(adminContext, "medframe_django_session", fixture.admin_session);
  const admin = await adminContext.newPage();
  await admin.goto(`${base}/clinic/settings/stations?organization=${fixture.organization}`);
  await admin.waitForLoadState("networkidle");
  await admin.getByRole("button", { name: /^Synthetic code tablet/ }).click();
  let modal = admin.getByRole("dialog");
  await expect(modal.getByRole("heading", { name: "Manage device", exact: true })).toBeVisible();
  await modal.getByLabel("Device name", { exact: true }).fill("Synthetic doctor tablet");
  await modal.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(modal.getByText("Device settings saved.", { exact: true })).toBeVisible();
  await capture(admin, "device-modal-desktop");
  const pairingResponse = admin.waitForResponse(
    (r) => r.url().endsWith("/stations/manage") && r.request().postDataJSON()?.action === "pair",
  );
  await modal.getByRole("button", { name: "Regenerate pairing code", exact: true }).click();
  await admin
    .getByRole("alertdialog")
    .getByRole("button", { name: "Generate new code", exact: true })
    .click();
  const pairing = (await (await pairingResponse).json()).code;
  assert.ok(pairing);
  report.groups.push("Active device opens management modal, renames and regenerates pairing code");
  const deviceContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await cookie(deviceContext, "medframe_device", fixture.device_cookie);
  const device = await deviceContext.newPage();
  device.on("pageerror", (e) => report.errors.push(e.message));
  await device.goto(base + "/station");
  await device.getByRole("textbox", { name: "Pairing code", exact: true }).fill(pairing);
  await device.getByRole("button", { name: "Connect device", exact: true }).click();
  await expect(
    device.getByRole("heading", { name: "Waiting for clinic approval", exact: true }),
  ).toBeVisible();
  await modal.getByRole("button", { name: "Refresh connection", exact: true }).click();
  await modal.getByRole("button", { name: "Approve device", exact: true }).click();
  await admin
    .getByRole("alertdialog")
    .getByRole("button", { name: "Approve device", exact: true })
    .click();
  await expect(modal.getByText("Device approved.", { exact: true })).toBeVisible();
  report.groups.push(
    "Regenerated pairing code reconnects tablet and physical approval completes in modal",
  );
  const sourceContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await cookie(sourceContext, "medframe_django_session", fixture.sender_session);
  const source = await sourceContext.newPage();
  await source.goto(`${base}/station/clinician?organization=${fixture.organization}`);
  await source.getByRole("button", { name: "Connect my device", exact: true }).click();
  const issuedResponse = source.waitForResponse(
    (r) => r.url().endsWith("/stations/doctor") && r.request().postDataJSON()?.action === "issue",
  );
  await source.getByRole("button", { name: "Generate doctor code", exact: true }).click();
  const issued = await (await issuedResponse).json();
  assert.ok(issued.code);
  await capture(source, "doctor-code-desktop");
  assert.equal(
    (await deviceContext.cookies()).some((c) => c.name === "medframe_django_session"),
    false,
  );
  await device.reload();
  await device
    .getByRole("textbox", { name: "Clinician access code", exact: true })
    .fill(issued.code);
  await device.getByRole("button", { name: "Open workspace", exact: true }).click();
  await expect(device.getByRole("link", { name: /Start walk-in consultation/ })).toBeVisible();
  await expect(device.getByRole("button", { name: "End session", exact: true })).toBeVisible();
  await capture(device, "doctor-home-tablet");
  await device.setViewportSize({ width: 390, height: 844 });
  await capture(device, "doctor-home-phone");
  await device.setViewportSize({ width: 1024, height: 768 });
  report.groups.push(
    "Doctor code opens clinical home without receiving staff login; tablet and phone have no overflow",
  );
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
  modal = device.getByRole("dialog");
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
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
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
