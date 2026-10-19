/* One synthetic clone journey. No private credentials are embedded in this source. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
import * as THREE from "three";
import ts from "typescript";
import { OrbitControls } from "three-stdlib";
const expect = baseExpect.configure({ timeout: 12000 });
const root = process.cwd();
const output = path.join(root, ".impeccable/review/selection-focus");
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
async function loadTypescript(file, imports = {}) {
  let compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [from, to] of Object.entries({ three: import.meta.resolve("three"), ...imports }))
    compiled = compiled.replaceAll(`from "${from}"`, `from "${to}"`);
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
const anatomyModule = await loadTypescript("apps/web/features/dental/anatomy.ts");
const dentalModule = await loadTypescript("apps/web/features/dental/camera-focus.ts", {
  "./anatomy": anatomyModule,
});
const { toothDirection, dentalFitDistance } = await import(dentalModule);
const { placeCamera } = await import(await loadTypescript("apps/web/lib/three/place-camera.ts"));
const { PERMANENT_IDS } = await import(anatomyModule);
if (!process.env.SELECTION_FOCUS_REMAINING) {
  const bounds = new THREE.Box3(new THREE.Vector3(-1, -0.5, -0.7), new THREE.Vector3(1, 0.5, 0.7));
  for (const id of PERMANENT_IDS) {
    for (const surface of [
      null,
      "buccal",
      "lingual",
      "palatal",
      "mesial",
      "distal",
      "occlusal",
      "incisal",
    ]) {
      const direction = toothDirection(id, surface);
      assert.ok(Math.abs(direction.length() - 1) < 1e-8);
      if (surface === "occlusal" || surface === "incisal")
        assert.equal(direction.y, Number(id[0]) <= 2 ? -1 : 1);
      if (surface === "lingual" || surface === "palatal")
        assert.ok(direction.dot(toothDirection(id, "buccal")) < -0.999);
      for (const aspect of [0.6, 1.6]) {
        const camera = new THREE.PerspectiveCamera(35, aspect, 0.001, 100);
        const controls = new OrbitControls(camera);
        controls.enableDamping = true;
        controls.target.set(5, 4, 3);
        camera.position.set(1, 2, 6);
        controls.update();
        const up =
          Math.abs(direction.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
        const distance = dentalFitDistance(bounds, direction, up, aspect, 35);
        const center = bounds.getCenter(new THREE.Vector3());
        placeCamera(camera, controls, center, direction, distance, up);
        controls.update();
        camera.updateMatrixWorld();
        const projected = center.clone().project(camera);
        assert.ok(Math.abs(projected.x) < 1e-8 && Math.abs(projected.y) < 1e-8);
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const p = new THREE.Vector3(x, y, z).project(camera);
              assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1);
            }
        assert.equal(controls.enableDamping, true);
        controls.dispose();
      }
    }
  }
  report.groups.push(
    "32 FDI teeth × 8 surface orientations × 2 aspect ratios: centered camera/target, bounded framing and damping preservation",
  );
}
let page;
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
try {
  const context = await browser.newContext({ viewport: { width: 1742, height: 980 } });
  page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("/graphql") && /\bmutation\b/.test(request.postData() ?? ""))
      report.requests.push("mutation");
  });
  await login(page);
  const id = "2b242f24-3f19-4cbd-a3a2-203c34cbcd36";
  await page.goto(`${base}/clinic/consultations/${id}?organization=${fixture.organization}`);
  const before = await detail(page, id);
  const anatomy = page.getByRole("region", { name: "Anatomy editor", exact: true });
  await expect(anatomy.locator("canvas")).toBeVisible();
  if (!process.env.SELECTION_FOCUS_REMAINING) {
    await anatomy.getByLabel("Search structures", { exact: true }).fill("Posterior region of arm");
    await anatomy
      .getByRole("navigation", { name: "Anatomical structures", exact: true })
      .getByRole("button")
      .filter({ hasText: "Posterior region of arm" })
      .filter({ hasText: "Patient right" })
      .click();
    await expect(
      anatomy.getByRole("button", { name: "Back camera preset", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await capture(page, "anatomy-centered-back");
  }
  await anatomy.getByRole("button", { name: "Consultation", exact: true }).click();
  await page.getByRole("tab", { name: "Dental chart", exact: true }).click();
  const dental = page.locator("[data-dental-editor=true]");
  const model = dental.getByLabel("Interactive anatomical dental model", { exact: true });
  await expect(model.getByText("Anatomical model ready", { exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  async function centered(tooth) {
    await frames(page);
    const viewport = await model.locator("canvas").boundingBox();
    const label = await model
      .locator("span")
      .filter({ hasText: new RegExp(`^${tooth}$`) })
      .boundingBox();
    assert.ok(label, `Tooth ${tooth} label available at real mesh center`);
    const offset = {
      x: (label.x + label.width / 2 - viewport.x) / viewport.width - 0.5,
      y: (label.y + label.height / 2 - viewport.y) / viewport.height - 0.5,
    };
    assert.ok(
      Math.abs(offset.x) < 0.025 && Math.abs(offset.y) < 0.025,
      `Tooth ${tooth} center ${JSON.stringify(offset)}`,
    );
    report.geometry.push({ tooth, offset });
  }
  const teeth = dental.getByRole("navigation", { name: "Individual teeth", exact: true });
  for (const tooth of ["11", "18", "28", "38", "48"]) {
    await teeth.getByRole("button", { name: new RegExp(`^Tooth ${tooth},`) }).click();
    await expect(model.getByText(`Focused on tooth ${tooth}`, { exact: true })).toBeVisible();
    await centered(tooth);
    if (tooth === "18") await capture(page, "dental-upper-right-centered");
  }
  await capture(page, "dental-lower-right-centered");
  await teeth.getByRole("button", { name: /^Tooth 18,/ }).click();
  for (const surface of ["occlusal", "palatal", "mesial", "distal", "buccal"]) {
    await dental.getByRole("button", { name: `Select ${surface} surface`, exact: true }).click();
    await expect(
      model.getByText(`Focused on tooth 18 · ${surface}`, { exact: true }),
    ).toBeVisible();
    await centered("18");
    if (surface === "occlusal") await capture(page, "dental-occlusal-centered");
  }
  await model
    .getByRole("toolbar", { name: "Camera navigation", exact: true })
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  await expect(model.getByText("Focused on tooth", { exact: false })).toHaveCount(0);
  await teeth.getByRole("button", { name: /^Tooth 18,/ }).click();
  await centered("18");
  await teeth.getByRole("button", { name: "Isolate selected tooth", exact: true }).click();
  await centered("18");
  await teeth.getByRole("button", { name: "Both jaws", exact: true }).click();
  await expect(model.getByText("Focused on tooth", { exact: false })).toHaveCount(0);
  report.groups.push(
    "Desktop anterior and four posterior quadrants, five selected surfaces, reselect, reset, isolate and whole-jaw restore; actual mesh-center label within 2.5% of viewport center",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const chart = dental
    .locator("details")
    .filter({ has: dental.locator("summary").filter({ hasText: "2D tooth selector" }) });
  await chart.locator("summary").click();
  // The accessible 2D selector is the existing narrow-screen tooth navigator.
  const button = chart.getByRole("button", { name: /Tooth 28/ });
  if ((await button.count()) === 0)
    throw new Error("Mobile tooth selector label requires a recorded harness update");
  await button.first().click();
  await model.scrollIntoViewIfNeeded();
  await centered("28");
  await capture(page, "phone-tooth-centered");
  assert.deepEqual(await detail(page, id), before);
  assert.equal(report.requests.length, 0);
  assert.equal(report.errors.length, 0);
  report.groups.push(
    "Phone 2D tooth navigation focuses 3D, with unchanged persisted clinical record and no mutation/page errors",
  );
  report.result = "passed";
} catch (error) {
  report.result = "failed";
  report.failure = error.stack || error.message;
  process.exitCode = 1;
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: false });
} finally {
  fs.writeFileSync(
    path.join(
      output,
      process.env.SELECTION_FOCUS_REMAINING ? "browser-remaining.json" : "browser.json",
    ),
    JSON.stringify(report, null, 2),
  );
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
