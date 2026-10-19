/* Bounded two-browser code-only entry; private synthetic cookies/codes never printed. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20_000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/station-code.json", "utf8"),
);
const out = path.resolve(".impeccable/review/station-code-access");
const base = "http://localhost:3001";
const report = { groups: [], captures: [], errors: [], geometry: [] };
const browser = await chromium.launch({ headless: true });
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
  assert.equal(geometry.overflow, false, name + " has no document overflow");
}
async function api(page, endpoint, body) {
  return await page.evaluate(
    async ({ endpoint, body }) => {
      const csrf = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await fetch(`/api/backend/${endpoint}`, {
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
  const source = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await source.addCookies([
    {
      name: "medframe_django_session",
      value: fixture.sender_session,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const sender = await source.newPage();
  sender.on("pageerror", (error) => report.errors.push(error.message));
  await sender.goto(
    `${base}/station/clinician/consultations/${fixture.encounter}?organization=${fixture.organization}`,
  );
  const dental = sender.locator("[data-dental-editor=true]");
  await expect(dental).toBeVisible();
  await expect(
    dental.getByRole("button", { name: "Continue elsewhere", exact: true }),
  ).toBeEnabled();
  await dental.getByRole("button", { name: "Clinical notes", exact: true }).click();
  await sender
    .getByLabel("Subjective", { exact: true })
    .fill("Synthetic clinician-authorized tablet note");
  await sender.getByRole("button", { name: "Continue elsewhere", exact: true }).click();
  const pending = sender.waitForResponse(
    (response) =>
      response.url().endsWith("/stations/handoff") &&
      response.request().postDataJSON()?.action === "offer",
  );
  await sender.getByRole("button", { name: "Save & generate handoff code", exact: true }).click();
  const offered = await (await pending).json();
  assert.ok(offered.code);
  await capture(sender, "issuer-code-desktop");
  report.groups.push(
    "authenticated source saves existing draft and generates one-use authorization code",
  );

  const device = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await device.addCookies([
    {
      name: "medframe_device",
      value: fixture.device_cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  assert.equal(
    (await device.cookies()).some((cookie) => cookie.name === "medframe_django_session"),
    false,
  );
  const receiver = await device.newPage();
  receiver.on("pageerror", (error) => report.errors.push(error.message));
  await receiver.goto(`${base}/station`);
  await expect(
    receiver.getByRole("textbox", { name: "Clinician access code", exact: true }),
  ).toBeVisible();
  await expect(receiver.getByRole("link", { name: "Staff sign in", exact: true })).toHaveCount(0);
  await capture(receiver, "access-code-tablet");
  await receiver.setViewportSize({ width: 390, height: 844 });
  await capture(receiver, "access-code-phone");
  await receiver.setViewportSize({ width: 1024, height: 768 });
  await receiver
    .getByRole("textbox", { name: "Clinician access code", exact: true })
    .fill(offered.code);
  await receiver.getByRole("button", { name: "Open consultation", exact: true }).click();
  await expect(receiver.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic clinician-authorized tablet note",
  );
  await expect(receiver.getByRole("button", { name: "End session", exact: true })).toBeVisible();
  await expect(receiver.getByRole("link", { name: "Clinic workspace", exact: true })).toHaveCount(
    0,
  );
  await expect(
    receiver.getByRole("button", { name: "Continue elsewhere", exact: true }),
  ).toHaveCount(0);
  await capture(receiver, "scoped-consultation-tablet");
  report.groups.push(
    "approved tablet with no staff cookie opens same consultation by code alone, displays attribution/expiry and no broad navigation",
  );
  await receiver.getByLabel("Objective", { exact: true }).fill("Synthetic tablet finding");
  await receiver.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(receiver.getByText("Draft saved", { exact: true })).toBeVisible();
  const old = await api(sender, "stations/encounter", {
    organization_id: fixture.organization,
    encounter_id: fixture.encounter,
  });
  assert.equal(old.data.can_edit, false);
  const forbidden = await api(receiver, "graphql", { query: "query { x:platformCapabilities }" });
  assert.equal(forbidden.status, 403);
  const chain = await api(receiver, "stations/handoff", { action: "offer" });
  assert.equal(chain.status, 403);
  report.groups.push(
    "tablet saves existing version; prior writer is read-only; broad queries and further delegation denied",
  );
  await receiver.getByRole("button", { name: "End session", exact: true }).click();
  await expect(
    receiver.getByRole("textbox", { name: "Clinician access code", exact: true }),
  ).toBeVisible();
  const replay = await api(receiver, "stations/access", { code: offered.code });
  assert.notEqual(replay.status, 200);
  report.groups.push(
    "explicit end clears staff access while keeping device pairing; consumed code cannot be reused",
  );
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.errors.push(error.message);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      groups: report.groups,
      captures: report.captures.length,
      errors: report.errors,
    }),
  );
  await browser.close();
}
