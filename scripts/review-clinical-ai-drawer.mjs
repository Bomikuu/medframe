/* One bounded native browser pass against synthetic isolated care records. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 15000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/dental-illustration.json", "utf8"),
);
const out = path.resolve(".impeccable/review/clinical-ai-drawer");
const report = { groups: [], bounds: [], errors: [], captures: [], aiRequests: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1660, height: 1040 } });
await context.addCookies([
  {
    name: "medframe_django_session",
    value: fixture.sender_session,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);
const page = await context.newPage();
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("request", (request) => {
  if (/openai|anthropic|generativelanguage|\/api\/.*(?:chat|assistant)/.test(request.url()))
    report.aiRequests.push(new URL(request.url()).pathname);
});
async function capture(name) {
  await page.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
  report.captures.push(name);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  );
}
async function checkDrawer(canvas, open, close, name) {
  const before = await canvas.boundingBox();
  await open();
  const drawer = page.getByRole("dialog", { name: "Medframe AI", exact: true });
  await expect(drawer).toBeVisible();
  const after = await canvas.boundingBox();
  for (const key of ["x", "y", "width", "height"])
    assert.ok(Math.abs(before[key] - after[key]) < 1, `${name} parent ${key} changed`);
  const box = await drawer.boundingBox();
  assert.ok(Math.abs(box.y) < 1);
  assert.ok(Math.abs(box.height - (await page.evaluate(() => innerHeight))) < 1);
  report.bounds.push({ name, before, after, drawer: box });
  await capture(name);
  await expect(
    drawer.getByRole("button", { name: "Send message — AI is not connected", exact: true }),
  ).toBeDisabled();
  await close(drawer);
  await expect(drawer).toBeHidden();
}
try {
  await page.goto(
    `http://localhost:3001/clinic/consultations/${fixture.encounter}?organization=${fixture.organization}`,
  );
  const dental = page.locator('[data-dental-editor="true"]');
  await expect(dental).toBeVisible();
  await expect(dental.getByText("Anatomical model ready", { exact: true })).toBeVisible();
  await checkDrawer(
    dental.locator("canvas"),
    () => dental.getByRole("button", { name: "Toggle Medframe AI", exact: true }).click(),
    (drawer) => drawer.getByRole("button", { name: "Close AI sidebar", exact: true }).click(),
    "dental-desktop-drawer",
  );
  report.groups.push(
    "Dental drawer is full viewport height and does not move or resize the canvas; sending remains disabled",
  );
  const inspector = dental.getByRole("complementary", { name: "Tooth inspector", exact: true });
  await inspector.getByRole("button", { name: "Crown present", exact: true }).click();
  await expect(dental.getByText("Gold overlay · crown present", { exact: true })).toBeVisible();
  await capture("gold-crown-selected");
  await inspector.getByRole("button", { name: "Missing / extracted", exact: true }).click();
  await expect(dental.getByText(/The red reference tooth marks its position/)).toBeVisible();
  await expect(dental.locator("canvas")).toBeVisible();
  await capture("red-missing-selected");
  await dental.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(dental.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(dental).toBeVisible();
  await expect(dental.getByText(/The red reference tooth marks its position/)).toBeVisible();
  report.groups.push(
    "Crown illustration has gold status; missing red placeholder survives real draft save/reload",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await checkDrawer(
    dental.locator("canvas"),
    () => dental.getByRole("button", { name: "Toggle Medframe AI", exact: true }).click(),
    (drawer) => drawer.getByRole("button", { name: "Close AI sidebar", exact: true }).click(),
    "dental-phone-drawer",
  );
  await page.setViewportSize({ width: 1660, height: 1040 });
  await dental.getByRole("button", { name: "Anatomy", exact: true }).click();
  const anatomy = page.getByRole("region", { name: "Anatomy editor", exact: true });
  await expect(anatomy).toBeVisible();
  await checkDrawer(
    anatomy.locator("canvas"),
    () => anatomy.getByRole("button", { name: "Open AI sidebar", exact: true }).click(),
    (drawer) => drawer.getByRole("button", { name: "Close AI sidebar", exact: true }).click(),
    "anatomy-desktop-drawer",
  );
  assert.equal(report.aiRequests.length, 0);
  report.groups.push(
    "Phone and anatomy reuse the same full-height overlay without canvas resizing or AI traffic",
  );
} catch (error) {
  report.failure = { message: error.message };
  await page.screenshot({ path: path.join(out, "failure.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      groups: report.groups.length,
      errors: report.errors,
      failure: report.failure,
    }),
  );
  await browser.close();
}
