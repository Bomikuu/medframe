/* One accumulated Phase 2 browser pass. Isolated synthetic patients/identities only. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 18000 });
const f = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/station-kiosk.json", "utf8"),
);
const out = path.resolve(".impeccable/review/station-kiosk");
const report = { groups: [], captures: [], geometry: [], errors: [] };
const browser = await chromium.launch({ headless: true });
async function cookie(context, name, value) {
  await context.addCookies([
    { name, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}
async function api(page, path, body) {
  return page.evaluate(
    async ({ path, body }) => {
      const { csrfToken } = await (
        await fetch("/api/backend/" + (path.startsWith("portal/") ? "portal/" : "") + "auth/csrf")
      ).json();
      const response = await fetch("/api/backend/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, body },
  );
}
async function capture(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  report.captures.push(name);
  report.geometry.push({ name, ...geometry });
  assert.equal(geometry.overflow, false, name + " overflow");
}
async function select(page, label, value) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
let page;
try {
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await cookie(staffContext, "medframe_django_session", f.admin_session);
  const staff = await staffContext.newPage();
  staff.on("pageerror", (error) => report.errors.push(error.message));
  await staff.goto(`http://localhost:3001/clinic/stations?organization=${f.organization}`);
  await expect(
    staff.getByRole("heading", { name: "Patient Stations & departments", exact: true }),
  ).toBeVisible();
  await capture(staff, "confirmation-staff-overview");
  const portalContext = await browser.newContext();
  await cookie(portalContext, "medframe_django_session", f.portal_session);
  const portal = await portalContext.newPage();
  await portal.goto(`http://localhost:3001/portal/appointments?link=${f.link}`);
  await portal.getByRole("button", { name: "Get a patient kiosk code", exact: true }).click();
  const portalDialog = portal.getByRole("dialog");
  await expect(portalDialog).toBeVisible();
  const firstCode = (await portalDialog.locator("p.select-all").innerText()).trim();
  assert.equal(firstCode.length, 8);
  await portalDialog.getByRole("button", { name: "Close", exact: true }).click();
  const kioskContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await cookie(kioskContext, "medframe_device", f.device_cookie);
  page = await kioskContext.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.goto("http://localhost:3001/station/kiosk");
  const home = page.getByRole("heading", {
    name: "Welcome. What brings you in today?",
    exact: true,
  });
  await expect(home).toBeVisible();
  for (const [name, width, height] of [
    ["home-desktop", 1440, 1000],
    ["home-tablet", 1024, 768],
    ["home-phone", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await capture(page, name);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  async function verify(task, patient = f.patient, code = null) {
    if (!code) {
      const issued = await api(staff, "stations/kiosk/manage", {
        organization_id: f.organization,
        branch_id: f.branch,
        action: "issue",
        patient_id: patient,
        method: "in_person_identity_verified",
      });
      assert.equal(issued.status, 200);
      code = issued.data.code;
    }
    await page.getByRole("button", { name: new RegExp("^" + task) }).click();
    await page.getByRole("textbox", { name: "Patient verification code", exact: true }).fill(code);
    await page.getByRole("button", { name: "Verify and continue", exact: true }).click();
    await expect(page.getByText(/verified for this kiosk session/)).toBeVisible();
  }
  async function finish() {
    await page
      .getByRole("button", { name: "Finish and clear my information", exact: true })
      .click();
    await expect(home).toBeVisible();
    await expect(page.getByText(/verified for this kiosk session/)).toHaveCount(0);
  }
  await verify("Book an appointment", f.patient, firstCode);
  await select(page, "Service / department", "Consultation");
  await select(page, "Doctor / dentist", "Dr. Synthetic");
  await page.getByLabel("Appointment date", { exact: true }).fill(f.date);
  const times = page.getByRole("region", { name: "Available times", exact: true });
  await expect(times.getByRole("button").first()).toBeVisible();
  await times.getByRole("button").first().click();
  await page.getByRole("button", { name: "Review appointment", exact: true }).click();
  await capture(page, "booking-review");
  await page.getByRole("button", { name: "Confirm appointment", exact: true }).click();
  await expect(
    page.getByText("Appointment confirmed. This is not admission to today's queue.", {
      exact: true,
    }),
  ).toBeVisible();
  await capture(page, "appointment-confirmed");
  await finish();
  report.groups.push(
    "Portal-issued code verifies on paired kiosk; real availability, review and confirmed appointment distinguish future booking from queue admission; finish clears patient UI",
  );
  await verify("Join the walk-in queue");
  await select(page, "Service / department", "Laboratory");
  await page.getByRole("button", { name: "Review queue admission", exact: true }).click();
  await page.getByRole("button", { name: "Confirm queue admission", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Your queue ticket", exact: true })
      .getByText("L-001", { exact: true }),
  ).toBeVisible();
  await capture(page, "laboratory-ticket");
  await finish();
  const snapshot = await api(staff, "stations/kiosk/manage", {
    organization_id: f.organization,
    branch_id: f.branch,
    action: "snapshot",
  });
  assert.equal(snapshot.status, 200);
  const lab = snapshot.data.tickets.find(
    (row) => row.patient === "Synthetic Kiosk Patient" && row.department === "Laboratory",
  );
  assert.ok(lab);
  for (const target of ["called", "in_service", "completed"]) {
    const response = await api(staff, "stations/kiosk/manage", {
      organization_id: f.organization,
      branch_id: f.branch,
      action: "stage",
      stage_id: lab.id,
      expected_version: lab.version++,
      target,
    });
    assert.equal(response.status, 200);
  }
  const moved = await api(staff, "stations/kiosk/manage", {
    organization_id: f.organization,
    branch_id: f.branch,
    action: "stage",
    stage_id: lab.id,
    expected_version: lab.version,
    target: "transfer",
    department_id: f.departments.cashier,
    reason: "Continue to payment desk",
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.ticket.visit_id, lab.visit_id);
  report.groups.push(
    "Laboratory issues a real provider-independent ticket; attributed staff call/service/complete/transfer keeps one visit when moving to cashier",
  );
  await verify("Pay for clinic services");
  await expect(page.getByText(/PHP 750.00 due/)).toBeVisible();
  await expect(page.getByText("Other patient private invoice", { exact: true })).toHaveCount(0);
  await select(page, "Cashier", "Cashier");
  await capture(page, "own-bills-cashier");
  await page.getByRole("button", { name: "Review queue admission", exact: true }).click();
  await expect(page.getByText(/No payment will be collected or marked paid/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm queue admission", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Your queue ticket", exact: true })
      .getByText(moved.data.ticket.label, { exact: true }),
  ).toBeVisible();
  await finish();
  report.groups.push(
    "Verified bills show own issued line and balance only; payment action reuses same cashier stage and never claims paid",
  );
  await verify("I.m here for my appointment", f.second_patient);
  await select(page, "Service / department", "Consultation");
  await page
    .getByRole("region", { name: "Your appointments", exact: true })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "Review queue admission", exact: true }).click();
  await page.getByRole("button", { name: "Confirm queue admission", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Your queue ticket", exact: true })
      .getByText("C-001", { exact: true }),
  ).toBeVisible();
  await capture(page, "check-in-ticket");
  await finish();
  report.groups.push(
    "Same-day appointment check-in creates a consultation queue ticket using a real provider",
  );
  await page.getByRole("button", { name: /^Join the walk-in queue/ }).click();
  await page
    .getByRole("button", { name: "I need to register as a new patient", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic New Kiosk Arrival");
  await page.getByLabel("Contact number", { exact: true }).fill("09005556666");
  await page.getByRole("button", { name: "Send to reception for review", exact: true }).click();
  await expect(page.getByText(/Your registration request is ready for reception/)).toBeVisible();
  await capture(page, "registration-pending");
  await finish();
  await staff.reload();
  await expect(
    staff.getByRole("heading", { name: "Synthetic New Kiosk Arrival", exact: true }),
  ).toBeVisible();
  await capture(staff, "staff-intake-review");
  const intakeSnapshot = await api(staff, "stations/kiosk/manage", {
    organization_id: f.organization,
    branch_id: f.branch,
    action: "snapshot",
  });
  const intake = intakeSnapshot.data.intakes.find(
    (row) => row.name === "Synthetic New Kiosk Arrival",
  );
  assert.ok(intake);
  const reviewed = await api(staff, "stations/kiosk/manage", {
    organization_id: f.organization,
    branch_id: f.branch,
    action: "review_intake",
    intake_id: intake.id,
    expected_version: intake.version,
    decision: "create",
    identity_verified: true,
  });
  assert.equal(reviewed.status, 200);
  report.groups.push(
    "New registration stays pending until authorized duplicate/identity review, then registers through existing patient service",
  );
  // Advance only the browser clock; backend still enforces its separate real deadline.
  await page.clock.install();
  await page.getByRole("button", { name: /^Book an appointment/ }).click();
  await page.clock.fastForward(95000);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await capture(page, "timeout-warning");
  await page.clock.fastForward(31000);
  await expect(home).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Patient verification code", exact: true }),
  ).toHaveCount(0);
  report.groups.push(
    "Inactivity warning then reset clears unverified form state and returns to four-action home",
  );
  const forbidden = await api(page, "graphql", { query: "{__typename}" });
  assert.equal(forbidden.status, 403);
  report.groups.push("Paired patient kiosk still cannot use broad staff GraphQL");
} catch (error) {
  report.failure = { message: error.message, stack: error.stack?.split("\n").slice(0, 4) };
  if (page)
    await page
      .screenshot({ path: path.join(out, "browser-confirmation-failure.png") })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser-confirmation.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      groups: report.groups.length,
      captures: report.captures.length,
      errors: report.errors,
      failure: report.failure?.message,
    }),
  );
  await browser.close();
}
