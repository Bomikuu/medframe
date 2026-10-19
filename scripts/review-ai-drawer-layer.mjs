/* One synthetic Station browser check for the reported header occlusion. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 15000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/ai-drawer-layer.json", "utf8"),
);
const out = path.resolve(".impeccable/review/ai-drawer-layer");
const report = { errors: [], groups: [] };
const browser = await chromium.launch({ headless: true });
async function cookie(context, name, value) {
  await context.addCookies([
    { name, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}
try {
  const issuer = await browser.newContext();
  await cookie(issuer, "medframe_django_session", fixture.sender_session);
  const sender = await issuer.newPage();
  await sender.goto("http://localhost:3001/station");
  const code = await sender.evaluate(
    async (f) => {
      const { csrfToken } = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await fetch("/api/backend/stations/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({
          action: "issue",
          organization_id: f.organization,
          branch_id: f.branch,
        }),
      });
      if (!response.ok) throw Error("Synthetic clinician code issuance failed");
      return (await response.json()).code;
    },
    { organization: fixture.organization, branch: fixture.branch },
  );
  const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await cookie(tablet, "medframe_device", fixture.device_cookie);
  const page = await tablet.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto("http://localhost:3001/station");
  await page.getByRole("textbox", { name: "Clinician access code", exact: true }).fill(code);
  await page.getByRole("button", { name: "Open workspace", exact: true }).click();
  const gallery = page.getByRole("list", { name: "Consultation gallery", exact: true });
  await expect(gallery).toBeVisible();
  await gallery.getByRole("link", { name: "Open consultation", exact: true }).click();
  const editor = page.locator('[data-dental-editor="true"]');
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Toggle Medframe AI", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Medframe AI", exact: true });
  await expect(drawer).toBeVisible();
  await drawer.evaluate(
    async (el) =>
      await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))),
  );
  const close = drawer.getByRole("button", { name: "Close AI sidebar", exact: true });
  report.layers = await drawer.evaluate((el) => ({
    drawer: Number(getComputedStyle(el).zIndex),
    station: Math.max(
      ...Array.from(document.querySelectorAll('[role="status"]')).map(
        (e) => Number(getComputedStyle(e).zIndex) || 0,
      ),
    ),
  }));
  assert.equal(report.layers.drawer, 150);
  assert.equal(report.layers.station, 130);
  assert.equal(
    await close.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return el === top || el.contains(top);
    }),
    true,
    "Station header must not cover the drawer close control",
  );
  const box = await drawer.boundingBox();
  assert.equal(box.y, 0);
  assert.equal(box.height, 768);
  await page.screenshot({
    path: path.join(out, "station-drawer-above-header.png"),
    animations: "disabled",
  });
  await close.click();
  await expect(drawer).toBeHidden();
  await expect(editor).toBeVisible();
  report.groups.push(
    "Actual doctor-code Station drawer sits above identity header, top close control wins hit testing, full height and close preserve editor",
  );
} catch (error) {
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}
