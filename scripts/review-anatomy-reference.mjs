/* One synthetic clone journey. No private credentials are embedded in this source. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const expect = baseExpect.configure({ timeout: 12000 });
const root = process.cwd();
const output = path.join(root, ".impeccable/review/anatomy-reference");
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
async function pickFemur(page, editor) {
  const entry = registry.structures.find((value) => value.id === "skeleton.femurr");
  const file = fs.readFileSync("apps/web/public/models/anatomy-skeleton-v1.glb");
  const model = await new GLTFLoader().parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    "",
  );
  let mesh;
  model.scene.traverse((value) => {
    if (value.userData.structure_id === entry.id) mesh = value;
  });
  const lower = new THREE.Vector3(...entry.bounds.min),
    upper = new THREE.Vector3(...entry.bounds.max),
    center = lower.clone().add(upper).multiplyScalar(0.5),
    extent = upper.clone().sub(lower);
  const positions = mesh.geometry.attributes.position,
    index = mesh.geometry.index;
  let point,
    distance = Infinity;
  for (let cursor = 0; cursor < (index?.count ?? positions.count); cursor += 3) {
    const vertices = [0, 1, 2].map((offset) =>
      new THREE.Vector3().fromBufferAttribute(
        positions,
        index ? index.getX(cursor + offset) : cursor + offset,
      ),
    );
    const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
    if (normal.z <= 0) continue;
    const candidate = vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3);
    const score = Math.abs(candidate.y - center.y) + Math.abs(candidate.x - center.x) * 0.2;
    if (score < distance) {
      point = candidate;
      distance = score;
    }
  }
  const canvas = editor.locator("canvas");
  const rect = await canvas.boundingBox();
  const camera = new THREE.PerspectiveCamera(42, rect.width / rect.height, 0.01, 50),
    tangent = Math.tan((camera.fov * Math.PI) / 360);
  const fit =
    Math.max(extent.y / (2 * tangent), extent.x / ((2 * tangent * rect.width) / rect.height)) *
      1.16 +
    extent.z / 2;
  center.y -= 0.9;
  camera.position.copy(center).add(new THREE.Vector3(0, 0, fit));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  point.y -= 0.9;
  point.project(camera);
  await editor.getByRole("button", { name: "Annotate", exact: true }).click();
  await canvas.click({
    position: { x: ((point.x + 1) / 2) * rect.width, y: ((1 - point.y) / 2) * rect.height },
  });
  await expect(editor.getByLabel("Finding description", { exact: true })).toBeVisible();
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
  let page,
    group = "";
  try {
    const context = await browser.newContext({ viewport: { width: 1742, height: 980 } });
    page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.stack || error.message));
    page.on("request", (request) =>
      report.requests.push({ url: new URL(request.url()).pathname, method: request.method() }),
    );
    group = "Reference layout and explicitly unconnected AI sidebar";
    await login(page);
    const encounter = (
      await gql(
        page,
        'mutation($o:UUID!,$p:UUID!,$b:UUID!,$r:UUID!,$k:UUID!){createEncounter(organizationId:$o,patientId:$p,branchId:$b,providerId:$r,reason:"Synthetic anatomy reference UI review",requestId:$k){id}}',
        {
          o: fixture.organization,
          p: fixture.patient,
          b: fixture.branch,
          r: fixture.provider,
          k: crypto.randomUUID(),
        },
      )
    ).createEncounter;
    const id = encounter.id,
      url = `${base}/clinic/consultations/${id}?organization=${fixture.organization}`;
    report.encounter = id;
    await page.goto(url);
    let editor = page.getByRole("region", { name: "Anatomy editor", exact: true });
    await expect(editor.getByLabel("Medframe AI preview", { exact: true })).toBeVisible();
    await expect(editor.locator("canvas")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const before = report.requests.length;
    await editor
      .getByRole("button", { name: "Explain the selected structure", exact: true })
      .click();
    await expect(editor.getByLabel("AI message preview", { exact: true })).toHaveValue(
      "Explain the selected structure",
    );
    await editor
      .getByLabel("AI message preview", { exact: true })
      .fill("Local interface preview only");
    await expect(
      editor.getByRole("button", { name: "Send message — AI is not connected", exact: true }),
    ).toBeDisabled();
    assert.equal(
      report.requests.slice(before).filter((value) => value.method === "POST").length,
      0,
      "Composer generated a network mutation",
    );
    await capture(page, "desktop-reference-1742");
    await editor.getByRole("button", { name: "Close AI sidebar", exact: true }).click();
    await expect(editor.getByLabel("Medframe AI preview", { exact: true })).toHaveCount(0);
    await editor.getByRole("button", { name: "Open AI sidebar", exact: true }).click();
    await expect(editor.getByLabel("AI message preview", { exact: true })).toHaveValue("");
    report.groups.push({ name: group, result: "pass" });
    group = "Mesh annotation, save, camera presets and same consultation owner";
    const skeleton = page.waitForResponse(
      (response) => response.url().endsWith("anatomy-skeleton-v1.glb") && response.ok(),
    );
    await editor.getByRole("tab", { name: "Skeleton", exact: true }).click();
    await skeleton;
    await editor.getByLabel("Search structures", { exact: true }).fill("femur right");
    await editor
      .getByRole("navigation", { name: "Anatomical structures", exact: true })
      .getByRole("button")
      .filter({ hasText: "Femur" })
      .filter({ hasText: "Patient right" })
      .click();
    await editor.getByRole("button", { name: "Isolate structure", exact: true }).click();
    await frames(page);
    await pickFemur(page, editor);
    await editor
      .getByLabel("Finding description", { exact: true })
      .fill("Synthetic right femur reference finding");
    await editor
      .getByLabel("Clinical notes", { exact: true })
      .fill("Synthetic point note retained by the consultation form");
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await saved(editor);
    let row = await detail(page, id);
    assert.equal(row.content.anatomy_findings.length, 1);
    assert.equal(row.content.anatomy_findings[0].side, "right");
    assert.equal(row.content.anatomy_findings[0].anchor.mesh_id, "skeleton.femurr");
    await editor.getByRole("button", { name: "Back camera preset", exact: true }).click();
    await editor.getByRole("button", { name: "Zoom in", exact: true }).click();
    await editor.getByRole("button", { name: "Fit model to view", exact: true }).click();
    await capture(page, "desktop-pinned-1742");
    await editor.getByRole("button", { name: "Consultation", exact: true }).click();
    await page.getByRole("tab", { name: "Anatomy", exact: true }).click();
    editor = page.getByRole("region", { name: "Anatomy editor", exact: true });
    await expect(editor.getByLabel("Clinical notes", { exact: true })).toHaveValue(
      "Synthetic point note retained by the consultation form",
    );
    report.groups.push({ name: group, result: "pass" });
    group = "Tablet and phone drawers retain clinical fields and AI preview isolation";
    for (const [width, height, label] of [
      [1024, 768, "tablet"],
      [390, 844, "phone"],
    ]) {
      await page.setViewportSize({ width, height });
      await closePanel(page);
      await frames(page);
      await capture(page, label + "-workspace");
      await editor.getByRole("button", { name: "Open structure details", exact: true }).click();
      let dialog = page.getByRole("dialog");
      await dialog.getByRole("tab", { name: /^Findings/ }).click();
      await expect(dialog.getByLabel("Clinical notes", { exact: true })).toHaveValue(
        "Synthetic point note retained by the consultation form",
      );
      await capture(page, label + "-findings");
      await closePanel(page);
      await editor.getByRole("button", { name: "Open AI sidebar", exact: true }).click();
      dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Send message — AI is not connected", exact: true }),
      ).toBeDisabled();
      await capture(page, label + "-ai");
      await dialog.getByRole("button", { name: "Close AI sidebar", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    report.groups.push({ name: group, result: "pass" });
    group = "Forced model failure retains editable draft without AI calls";
    const fallback = await context.newPage();
    page = fallback;
    await fallback.setViewportSize({ width: 390, height: 844 });
    fallback.on("pageerror", (error) => report.errors.push("fault injection: " + error.message));
    await fallback.route("**/models/anatomy-*.glb", (route) => route.abort());
    await fallback.goto(url);
    editor = fallback.getByRole("region", { name: "Anatomy editor", exact: true });
    await expect(editor.getByText(/The 3D model is unavailable/)).toBeVisible();
    await editor.getByRole("button", { name: "Open structure details", exact: true }).click();
    let dialog = fallback.getByRole("dialog");
    await dialog.getByRole("tab", { name: /^Findings/ }).click();
    await dialog
      .getByRole("button")
      .filter({ hasText: "1. Synthetic right femur reference finding" })
      .click();
    await dialog
      .getByLabel("Clinical notes", { exact: true })
      .fill("Synthetic note saved through the 2D fallback");
    await closePanel(fallback);
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await saved(editor);
    row = await detail(fallback, id);
    assert.equal(
      row.content.anatomy_findings[0].notes,
      "Synthetic note saved through the 2D fallback",
    );
    assert.equal(row.content.anatomy_findings[0].anchor.mesh_id, "skeleton.femurr");
    await capture(fallback, "phone-fallback");
    report.groups.push({ name: group, result: "pass" });
  } catch (error) {
    report.groups.push({ name: group, result: "fail", error: error.message });
    process.exitCode = 1;
    if (page) {
      await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
      fs.writeFileSync(
        path.join(output, "failure-dom.txt"),
        await page.locator("body").innerText(),
      );
    }
  } finally {
    fs.writeFileSync(path.join(output, "browser-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(
      JSON.stringify({
        groups: report.groups,
        captures: report.captures.length,
        pageErrors: report.errors.length,
      }),
    );
  }
})();
