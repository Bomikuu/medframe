/* One accumulated synthetic Station browser pass. Never output private cookies or codes. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20_000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/station.json", "utf8"),
);
const out = path.resolve(".impeccable/review/station-phase-1");
const base = "http://localhost:3001";
const report = { groups: [], captures: [], errors: [], geometry: [] };
const browser = await chromium.launch({ headless: true });
async function context(session, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  if (session)
    await context.addCookies([
      {
        name: "medframe_django_session",
        value: session,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  if (session === fixture.receiver_session && fixture.device_cookie)
    await context.addCookies([
      {
        name: "medframe_device",
        value: fixture.device_cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  context.on("page", (page) => page.on("pageerror", (error) => report.errors.push(error.message)));
  return context;
}
async function api(page, path, body) {
  return await page.evaluate(
    async ({ path, body }) => {
      const csrf = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await fetch(`/api/backend/stations/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { path, body },
  );
}
async function capture(page, name) {
  await page.screenshot({
    path: path.join(out, name + ".png"),
    animations: "disabled",
    fullPage: false,
  });
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  report.captures.push(name);
  report.geometry.push({ name, ...geometry });
  assert.equal(geometry.overflow, false, name + " has no page overflow");
}
try {
  const adminContext = await context(fixture.admin_session);
  const admin = await adminContext.newPage();
  await admin.goto(`${base}/clinic/settings/stations?organization=${fixture.organization}`);
  await expect(admin.getByRole("heading", { name: "Devices & Stations" })).toBeVisible();
  const row = admin.getByRole("row").filter({ hasText: "Review clinician tablet" });
  const receiverContext = await context(null, { width: 1024, height: 768 });
  const receiver = await receiverContext.newPage();
  if (!process.env.STATION_REMAINING) {
    await admin.getByRole("button", { name: "Add device", exact: true }).click();
    await admin.getByLabel("Device name", { exact: true }).fill("Review clinician tablet");
    await admin.getByRole("button", { name: "Create device", exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Pair device", exact: true }).click();
    const dialog = admin
      .getByRole("dialog")
      .filter({ has: admin.getByRole("heading", { name: "Pair the receiving device" }) });
    const codeText = await dialog.locator('[aria-label^="Code "]').getAttribute("aria-label");
    const pairingCode = codeText.slice(5);
    await receiver.goto(`${base}/station`);
    await expect(
      receiver.getByRole("heading", { name: "Connect this device", exact: true }),
    ).toBeVisible();
    await capture(receiver, "pairing-tablet");
    await receiver.setViewportSize({ width: 390, height: 844 });
    await capture(receiver, "pairing-phone");
    await receiver.setViewportSize({ width: 1024, height: 768 });
    await receiver.getByRole("textbox", { name: "Pairing code", exact: true }).fill(pairingCode);
    await receiver.getByRole("button", { name: "Connect device", exact: true }).click();
    await expect(
      receiver.getByRole("heading", { name: "Waiting for clinic approval" }),
    ).toBeVisible();
    await capture(receiver, "pairing-awaiting-approval");
    await admin.keyboard.press("Escape");
    await admin.getByRole("button", { name: "Refresh", exact: true }).click();
    await row.getByRole("button", { name: "Approve", exact: true }).click();
    await admin
      .getByRole("alertdialog")
      .getByRole("button", { name: "Approve device", exact: true })
      .click();
    await expect(row).toContainText("active");
    await capture(admin, "devices-desktop");
    await expect(receiver.getByRole("link", { name: "Open clinician Station" })).toBeVisible();
    report.groups.push(
      "device creation, eight-block pairing, physical approval, phone/tablet public state",
    );
  } else {
    await receiverContext.addCookies([
      {
        name: "medframe_device",
        value: fixture.device_cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  }
  await receiverContext.addCookies([
    {
      name: "medframe_django_session",
      value: fixture.receiver_session,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await receiver.goto(`${base}/station/clinician?organization=${fixture.organization}`);
  await expect(receiver.getByRole("heading", { name: "Your clinical Station" })).toBeVisible();
  const senderContext = await context(fixture.sender_session);
  const sender = await senderContext.newPage();
  await sender.goto(
    `${base}/station/clinician/consultations/${fixture.encounter}?organization=${fixture.organization}`,
  );
  const dental = sender.locator("[data-dental-editor=true]");
  await expect(dental).toBeVisible();
  await expect(
    dental.getByRole("button", { name: "Continue elsewhere", exact: true }),
  ).toBeEnabled();
  await dental.getByRole("button", { name: "Clinical notes", exact: true }).click();
  const subjective = sender.getByLabel("Subjective", { exact: true });
  await subjective.fill("Synthetic saved handoff note");
  const offerResponse = sender.waitForResponse(
    (response) =>
      response.url().endsWith("/stations/handoff") &&
      response.request().postDataJSON()?.action === "offer",
  );
  await sender.getByRole("button", { name: "Continue elsewhere", exact: true }).click();
  await sender.getByRole("button", { name: "Save & generate handoff code", exact: true }).click();
  const offer = await (await offerResponse).json();
  assert.ok(offer.code, "handoff generated after saving");
  await capture(sender, "handoff-sender");
  await receiver.getByRole("textbox", { name: "Handoff code", exact: true }).fill(offer.code);
  await receiver.getByRole("button", { name: "Review handoff", exact: true }).click();
  await expect(
    receiver
      .getByRole("region", { name: "Receive a handoff", exact: true })
      .getByRole("heading", { name: "Synthetic Station Patient", exact: true }),
  ).toBeVisible();
  await capture(receiver, "handoff-acceptance-tablet");
  await receiver.getByRole("button", { name: "Accept handoff", exact: true }).click();
  await expect(receiver.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic saved handoff note",
  );
  await capture(receiver, "station-notes-tablet");
  await expect
    .poll(
      async () =>
        (
          await api(sender, "encounter", {
            organization_id: fixture.organization,
            encounter_id: fixture.encounter,
          })
        ).body.can_edit,
    )
    .toBe(false);
  const current = await api(sender, "encounter", {
    organization_id: fixture.organization,
    encounter_id: fixture.encounter,
  });
  const blocked = await sender.evaluate(
    async ({ fixture, version }) => {
      const csrf = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await fetch("/api/backend/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken },
        body: JSON.stringify({
          query:
            "mutation($organization:UUID!,$encounter:UUID!,$version:Int!,$content:JSON!){ updateEncounterDraft(organizationId:$organization,encounterId:$encounter,content:$content,expectedVersion:$version){id} }",
          variables: {
            organization: fixture.organization,
            encounter: fixture.encounter,
            version,
            content: {},
          },
        }),
      });
      return response.json();
    },
    {
      fixture: { organization: fixture.organization, encounter: fixture.encounter },
      version: current.body.version,
    },
  );
  assert.equal(blocked.errors?.[0]?.extensions?.code, "OWNERSHIP");
  report.groups.push(
    "save acknowledged, same consultation accepted on approved tablet, notes restored, previous writer blocked by API",
  );
  await receiver.getByRole("tab", { name: "Visit & payments", exact: true }).click();
  await expect(receiver.getByRole("heading", { name: "Visit & service status" })).toBeVisible();
  await expect(
    receiver.getByText("Your membership does not include financial access.", { exact: false }),
  ).toBeVisible();
  await capture(receiver, "station-visit-tablet");
  report.groups.push("same-workspace visit status and financial permission boundary");

  await admin.getByRole("button", { name: "Refresh", exact: true }).click();
  await row.getByRole("button", { name: "Revoke", exact: true }).click();
  await admin
    .getByRole("alertdialog")
    .getByRole("button", { name: "Revoke device", exact: true })
    .click();
  const revoked = await api(receiver, "encounter", {
    organization_id: fixture.organization,
    encounter_id: fixture.encounter,
  });
  assert.equal(revoked.status, 403);
  report.groups.push("immediate device revocation denies the next clinical request");
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.errors.push(error.message);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  await browser.close();
  process.stdout.write(
    JSON.stringify({
      groups: report.groups,
      captures: report.captures.length,
      errors: report.errors,
    }) + "\n",
  );
}
