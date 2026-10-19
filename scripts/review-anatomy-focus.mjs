/* One synthetic clone journey. No private credentials are embedded in this source. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
import sharp from "sharp";
import ts from "typescript";
const expect = baseExpect.configure({ timeout: 12000 });
const root = process.cwd();
const output = path.join(root, ".impeccable/review/anatomy-focus");
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/batch6.json", "utf8"),
);
const registry = JSON.parse(fs.readFileSync("assets/anatomy/manifest.json", "utf8"));
const base = "http://localhost:3001";
const report = { groups: [], captures: [], geometry: [], errors: [], requests: [] };
function otp(secret) {
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((value) => parseInt(value, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = crypto.createHmac("sha1", bytes).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length - 1] & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function gql(page, query, variables = {}) {
  return page.evaluate(
    async ({ query, variables }) => {
      const { csrfToken } = await (await fetch("/api/backend/auth/csrf")).json();
      const response = await (
        await fetch("/api/backend/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({ query, variables }),
        })
      ).json();
      if (response.errors) throw new Error(response.errors[0].message);
      return response.data;
    },
    { query, variables },
  );
}
async function login(page) {
  await page.goto(base + "/login");
  await page.getByLabel("Work email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp(fixture.secret));
  await page.getByRole("button", { name: "Verify and continue", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"), {
    timeout: 20000,
    waitUntil: "domcontentloaded",
  });
}
async function frames(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function capture(page, name) {
  await frames(page);
  await page.screenshot({
    path: path.join(output, name + ".png"),
    fullPage: false,
    animations: "disabled",
  });
  report.captures.push(name);
  report.geometry.push({
    name,
    ...(await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }))),
  });
}
const detailQuery =
  "query($o:UUID!,$e:UUID!){encounter(organizationId:$o,encounterId:$e){id version content status revisionId}}";
async function detail(page, id) {
  return (await gql(page, detailQuery, { o: fixture.organization, e: id })).encounter;
}
async function saved(editor) {
  await expect(
    editor.locator('[role="status"]:visible').filter({ hasText: "Draft saved" }).first(),
  ).toBeVisible();
}
async function closePanel(page) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  if (await dialog.count())
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
}
const compiled = ts.transpileModule(
  fs.readFileSync("apps/web/features/anatomy/camera-focus.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const { structureView, fitDistance, focusDistance, boundsCenter } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const cases = [
  ["Posterior region of arm", "right", "back"],
  ["Anterior region of arm", "right", "front"],
  ["Gluteal region", "left", "back"],
  ["Scapular region", "right", "back"],
  ["Dorsum of hand", "left", "back"],
  ["Lateral region of neck", "left", "left"],
  ["Lateral region of neck", "right", "right"],
  ["Palm", "left", "front"],
];
for (const [label, side, view] of cases) {
  const entry = registry.structures.find((item) => item.label === label && item.side === side);
  assert.ok(entry, `Registry fixture: ${label}/${side}`);
  assert.equal(structureView(entry), view);
}
const body = registry.structures.filter((item) => item.layer === "body");
const full = {
  min: [0, 1, 2].map((axis) => Math.min(...body.map((item) => item.bounds.min[axis]))),
  max: [0, 1, 2].map((axis) => Math.max(...body.map((item) => item.bounds.max[axis]))),
};
const arm = body.find((item) => item.label === "Posterior region of arm" && item.side === "right");
for (const aspect of [0.5, 1, 1.8]) {
  const distance = fitDistance(full, "back", aspect, 42);
  const selected = fitDistance(arm.bounds, "back", aspect, 42);
  assert.equal(focusDistance(distance, selected), distance * 0.72);
  assert.ok(focusDistance(distance, selected) >= selected);
}
assert.deepEqual(boundsCenter(arm.bounds), [
  (arm.bounds.min[0] + arm.bounds.max[0]) / 2,
  (arm.bounds.min[1] + arm.bounds.max[1]) / 2 - 0.9,
  (arm.bounds.min[2] + arm.bounds.max[2]) / 2,
]);
report.groups.push(
  "Eight registry surface/side mappings and contextual camera bounds at three aspect ratios",
);
async function focusedPixels(editor, name) {
  await frames(page);
  const png = await editor.locator("canvas").screenshot();
  fs.writeFileSync(path.join(output, `${name}-canvas.png`), png);
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0,
    xTotal = 0,
    yTotal = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * info.channels;
      const [r, g, b] = data.subarray(index, index + 3);
      if (g > r * 1.18 && b > r * 1.13 && g > 110 && b > 100) {
        count++;
        xTotal += x;
        yTotal += y;
      }
    }
  }
  assert.ok(count > 100, `${name}: selected anatomical surface is visible`);
  const x = xTotal / count / info.width,
    y = yTotal / count / info.height;
  assert.ok(
    Math.abs(x - 0.5) < 0.18 && Math.abs(y - 0.5) < 0.18,
    `${name}: selected surface stays near viewport center (${x}, ${y})`,
  );
  report.geometry.push({ name, selectedPixels: count, normalizedCenter: { x, y } });
}
let page;
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
try {
  const context = await browser.newContext({ viewport: { width: 1742, height: 980 } });
  page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("/graphql") && /\bmutation\b/.test(request.postData() ?? ""))
      report.requests.push("GraphQL mutation");
  });
  await login(page);
  const id = "2b242f24-3f19-4cbd-a3a2-203c34cbcd36";
  await page.goto(`${base}/clinic/consultations/${id}?organization=${fixture.organization}`);
  const editor = page.getByRole("region", { name: "Anatomy editor", exact: true });
  await expect(editor.locator("canvas")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const before = await detail(page, id);
  async function choose(label, side, scope = editor) {
    await scope.getByLabel("Search structures", { exact: true }).fill(label);
    const navigator = scope.getByRole("navigation", { name: "Anatomical structures", exact: true });
    await navigator
      .getByRole("button")
      .filter({ hasText: label })
      .filter({ hasText: `Patient ${side}` })
      .click();
  }
  await choose("Posterior region of arm", "right");
  await expect(
    editor.getByRole("button", { name: "Back camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await focusedPixels(editor, "posterior-arm");
  await capture(page, "desktop-posterior-focus");
  await editor.getByRole("button", { name: "Front camera preset", exact: true }).click();
  await choose("Posterior region of arm", "right");
  await expect(
    editor.getByRole("button", { name: "Back camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await choose("Anterior region of arm", "right");
  await expect(
    editor.getByRole("button", { name: "Front camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await focusedPixels(editor, "anterior-arm");
  await choose("Lateral region of neck", "left");
  await expect(
    editor.getByRole("button", { name: "Left camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await focusedPixels(editor, "left-neck");
  await choose("Lateral region of neck", "right");
  await expect(
    editor.getByRole("button", { name: "Right camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await focusedPixels(editor, "right-neck");
  await editor.getByRole("button", { name: "Zoom in", exact: true }).click();
  await editor.getByRole("button", { name: "Fit model to view", exact: true }).click();
  await expect(editor.getByText("Focused on", { exact: false })).toHaveCount(0);
  await capture(page, "desktop-fit-restored");
  report.groups.push(
    "Desktop front/back/left/right camera, actual selected mesh centering, repeat selection and full-model reset",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.getByRole("button", { name: "Open anatomy navigator", exact: true }).click();
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  await choose("Posterior region of arm", "right", dialog);
  await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Back camera preset", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await focusedPixels(editor, "phone-posterior-arm");
  await capture(page, "phone-posterior-focus");
  const after = await detail(page, id);
  assert.deepEqual(
    after,
    before,
    "Navigation leaves persisted clinical content and version unchanged",
  );
  assert.equal(report.requests.length, 0, "Camera navigation creates no GraphQL mutations");
  assert.equal(report.errors.length, 0);
  report.groups.push(
    "Phone sidebar dismissal, back-region visibility and zero clinical mutations/page errors",
  );
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.failure = error.stack || error.message;
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: false });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(output, "browser.json"), JSON.stringify(report, null, 2));
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
