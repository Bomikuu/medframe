/* Synthetic clone review only. Private credentials and records never enter this file. */
const { chromium, expect: baseExpect } = require("@playwright/test");
const expect = baseExpect.configure({ timeout: 15000 });
const fs = require("node:fs");
const crypto = require("node:crypto");
const THREE = require("three");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, ".impeccable/review/batch6");
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/batch6.json", "utf8"),
);
const report = { groups: [], errors: [], captures: [], geometry: [], assetRequests: [] };
const base = "http://localhost:3001";
function otp(secret) {
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((value) => parseInt(value, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac("sha1", bytes).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function gql(page, query, variables = {}, portal = false) {
  return page.evaluate(
    async ({ query, variables, portal }) => {
      const prefix = portal ? "/api/backend/portal" : "/api/backend";
      const { csrfToken } = await (await fetch(prefix + "/auth/csrf")).json();
      const result = await (
        await fetch(prefix + "/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({ query, variables }),
        })
      ).json();
      if (result.errors) throw new Error(result.errors[0].message);
      return result.data;
    },
    { query, variables, portal },
  );
}
async function login(page, person, portal = false) {
  await page.goto(base + (portal ? "/portal/login" : "/login"));
  await page
    .getByLabel(portal ? "Account email" : "Work email", { exact: true })
    .fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp(person.secret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL((url) => !url.pathname.includes("login"));
}
async function captures(page, name) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: path.join(out, `${name}-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    report.captures.push(`${name}-${width}`);
    report.geometry.push({
      name: `${name}-${width}`,
      ...(await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }))),
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
const detailQuery =
  "query($o:UUID!,$e:UUID!){encounter(organizationId:$o,encounterId:$e){id version revisionId content status}}";
async function detail(page, id) {
  return (await gql(page, detailQuery, { o: fixture.organization, e: id })).encounter;
}
async function lifecycle(page, id, state) {
  const row = await detail(page, id);
  return (
    await gql(
      page,
      "mutation($o:UUID!,$e:UUID!,$s:String!,$v:Int!){transitionEncounter(organizationId:$o,encounterId:$e,status:$s,expectedVersion:$v){id version}}",
      { o: fixture.organization, e: id, s: state, v: row.version },
    )
  ).transitionEncounter;
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  let group = "";
  let activePage;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    activePage = page;
    page.on("pageerror", (error) => report.errors.push(error.stack || error.message));
    page.on("request", (request) => {
      if (request.url().includes("anatomy-") && request.url().endsWith(".glb"))
        report.assetRequests.push(request.url().split("/").pop());
    });
    group = "MFA, general-medicine default, real skeleton selection and exact 3D point";
    await login(page, fixture);
    let id, saved;
    if (process.env.BATCH6_REVIEW_STAGE === "remaining") {
      id = fixture.review_encounter;
      await page.goto(`${base}/clinic/consultations/${id}?organization=${fixture.organization}`);
      await expect(
        page.getByRole("button", { name: /1. Synthetic left femur observation/ }),
      ).toBeVisible();
      saved = await detail(page, id);
      if (
        saved.content.anatomy_findings[0].side !== "left" ||
        saved.content.anatomy_findings[0].anchor.kind !== "model"
      )
        throw new Error("Saved model anchor or patient side changed after reload");
      report.groups.push({
        name: "Saved 3D pin and patient side persist after reload",
        result: "pass",
      });
    } else {
      const encounter = (
        await gql(
          page,
          'mutation($o:UUID!,$p:UUID!,$b:UUID!,$r:UUID!,$k:UUID!){createEncounter(organizationId:$o,patientId:$p,branchId:$b,providerId:$r,reason:"Synthetic Batch 6 anatomy review",requestId:$k){id}}',
          {
            o: fixture.organization,
            p: fixture.patient,
            b: fixture.branch,
            r: fixture.provider,
            k: crypto.randomUUID(),
          },
        )
      ).createEncounter;
      id = encounter.id;
      const url = `${base}/clinic/consultations/${id}?organization=${fixture.organization}`;
      await page.goto(url);
      await expect(page.getByRole("tab", { name: "Anatomy", exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("canvas").first()).toBeVisible();
      const skeletonReady = page.waitForResponse(
        (response) => response.url().endsWith("anatomy-skeleton-v1.glb") && response.ok(),
      );
      await page.getByLabel("Anatomical layer", { exact: true }).selectOption("skeleton");
      await page.getByLabel("Find a structure", { exact: true }).fill("femur left");
      await page.getByRole("listitem").filter({ hasText: "Femur" }).click();
      await page.getByLabel("Isolate selected structure", { exact: true }).check();
      await expect(page.locator("canvas").first()).toBeVisible();
      await skeletonReady;
      await expect(page.getByText("Loading anatomical model…", { exact: true })).toHaveCount(0);
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const file = fs.readFileSync(
        path.join(root, "apps/web/public/models/anatomy-skeleton-v1.glb"),
      );
      const gltf = await new GLTFLoader().parseAsync(
        file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
        "",
      );
      let femur;
      gltf.scene.traverse((object) => {
        if (object.userData.structure_id === "skeleton.femurl") femur = object;
      });
      femur.geometry.computeBoundingBox();
      const target = femur.geometry.boundingBox.getCenter(new THREE.Vector3());
      const positions = femur.geometry.attributes.position;
      let closest,
        distance = Infinity;
      const indices = femur.geometry.index;
      for (let index = 0; index < (indices?.count ?? positions.count); index += 3) {
        const vertices = [0, 1, 2].map((offset) =>
          new THREE.Vector3().fromBufferAttribute(
            positions,
            indices ? indices.getX(index + offset) : index + offset,
          ),
        );
        const normal = new THREE.Vector3()
          .subVectors(vertices[1], vertices[0])
          .cross(new THREE.Vector3().subVectors(vertices[2], vertices[0]));
        if (normal.z <= 0) continue;
        const point = vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3);
        const score = Math.abs(point.y - target.y) + Math.abs(point.x - target.x) * 0.2;
        if (score < distance) {
          closest = point;
          distance = score;
        }
      }
      const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 50);
      const rect = await page.locator("canvas").first().boundingBox();
      camera.aspect = rect.width / rect.height;
      camera.position.set(0, 0, 2.8);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      report.pick = { localPoint: closest.toArray(), rect };
      closest.y -= 0.9;
      closest.project(camera);
      report.pick.projected = closest.toArray();
      await page.getByRole("button", { name: "Annotate", exact: true }).click();
      await page
        .locator("canvas")
        .first()
        .click({
          position: {
            x: ((closest.x + 1) / 2) * rect.width,
            y: ((1 - closest.y) / 2) * rect.height,
          },
        });
      await expect(page.getByText("Pinned to exact 3D mesh", { exact: true })).toBeVisible();
      await page
        .getByLabel("Finding description", { exact: true })
        .fill("Synthetic left femur observation");
      await page
        .getByLabel("Clinical notes", { exact: true })
        .fill("Synthetic anatomy note for explicit release review");
      await page.getByRole("button", { name: "Save consultation draft", exact: true }).click();
      await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
      saved = await detail(page, id);
      if (
        saved.content.anatomy_findings[0].side !== "left" ||
        saved.content.anatomy_findings[0].anchor.kind !== "model"
      )
        throw new Error("Incorrect patient-side/model anchor contract");
      await page.getByLabel("Camera view", { exact: true }).selectOption("back");
      await page.getByRole("button", { name: "Expand editor", exact: true }).click();
      await captures(page, "anatomy-expanded");
      await page.getByRole("button", { name: "Exit expanded view", exact: true }).click();
      await page.getByRole("tab", { name: "Dental chart", exact: true }).click();
      if (await page.getByRole("button", { name: "Back to consultation", exact: true }).isVisible())
        await page.getByRole("button", { name: "Back to consultation", exact: true }).click();
      await page.getByRole("tab", { name: "Anatomy", exact: true }).click();
      await expect(page.getByLabel("Finding description", { exact: true })).toHaveValue(
        "Synthetic left femur observation",
      );
      await page.reload();
      await expect(
        page.getByRole("button", { name: /1. Synthetic left femur observation/ }),
      ).toBeVisible();
      report.groups.push({ name: group, result: "pass" });
      if (process.env.BATCH6_REVIEW_STAGE === "editor") return;
    }
    group = "Anatomy-only finalization, exact snapshot, amendment and comparison";
    await lifecycle(page, id, "in_progress");
    await lifecycle(page, id, "completed");
    saved = await detail(page, id);
    const first = (
      await gql(
        page,
        "mutation($o:UUID!,$e:UUID!,$v:Int!){finalizeEncounter(organizationId:$o,encounterId:$e,expectedVersion:$v){revisionId}}",
        { o: fixture.organization, e: id, v: saved.version },
      )
    ).finalizeEncounter.revisionId;
    let amended = (
      await gql(
        page,
        'mutation($o:UUID!,$e:UUID!){createEncounterAmendment(organizationId:$o,encounterId:$e,reason:"Synthetic status correction",expectedFinalizedVersion:1){content version}}',
        { o: fixture.organization, e: id },
      )
    ).createEncounterAmendment;
    amended.content.anatomy_findings[0].status = "resolved";
    await gql(
      page,
      "mutation($o:UUID!,$e:UUID!,$c:JSON!,$v:Int!){updateEncounterDraft(organizationId:$o,encounterId:$e,content:$c,expectedVersion:$v){id}}",
      { o: fixture.organization, e: id, c: amended.content, v: amended.version },
    );
    await lifecycle(page, id, "completed");
    saved = await detail(page, id);
    const second = (
      await gql(
        page,
        "mutation($o:UUID!,$e:UUID!,$v:Int!){finalizeEncounter(organizationId:$o,encounterId:$e,expectedVersion:$v){revisionId}}",
        { o: fixture.organization, e: id, v: saved.version },
      )
    ).finalizeEncounter.revisionId;
    const comparison = (
      await gql(
        page,
        "query($o:UUID!,$p:UUID!,$l:UUID!,$r:UUID!){anatomyComparison(organizationId:$o,patientId:$p,leftRevisionId:$l,rightRevisionId:$r)}",
        { o: fixture.organization, p: fixture.patient, l: first, r: second },
      )
    ).anatomyComparison;
    if (
      !comparison.items.some(
        (value) =>
          value.kind === "changed" &&
          value.left.status === "active" &&
          value.right.status === "resolved",
      )
    )
      throw new Error("Exact revision comparison failed");
    await page.goto(
      `${base}/clinic/patients/${fixture.patient}?organization=${fixture.organization}&tab=anatomy`,
    );
    await expect(
      page.getByText("Synthetic left femur observation", { exact: true }).first(),
    ).toBeVisible();
    await captures(page, "patient-anatomy-history");
    report.groups.push({ name: group, result: "pass" });
    group = "Explicit anatomical release, notes opt-in, patient read and withdrawal";
    const revisions = (
      await gql(
        page,
        "query($o:UUID!,$p:UUID!){anatomyRevisions(organizationId:$o,patientId:$p)}",
        { o: fixture.organization, p: fixture.patient },
      )
    ).anatomyRevisions;
    const chart = revisions.items.find((value) => value.revision_id === second);
    saved = await detail(page, id);
    const selection = {
      summary: "Synthetic anatomical care summary",
      anatomy_chart_revision_id: chart.id,
      anatomy_finding_keys: [saved.content.anatomy_findings[0].key],
      anatomy_include_notes: true,
    };
    const preview = (
      await gql(
        page,
        "mutation($o:UUID!,$p:UUID!,$s:JSON!){previewPortalRelease(organizationId:$o,patientId:$p,selection:$s)}",
        { o: fixture.organization, p: fixture.patient, s: selection },
      )
    ).previewPortalRelease;
    if (preview.payload.anatomy.findings.length !== 1 || !preview.payload.anatomy.notes_included)
      throw new Error("Explicit release selection failed");
    const release = (
      await gql(
        page,
        "mutation($o:UUID!,$p:UUID!,$s:JSON!,$d:String!,$k:UUID!){publishPortalRelease(organizationId:$o,patientId:$p,selection:$s,previewDigest:$d,requestId:$k)}",
        {
          o: fixture.organization,
          p: fixture.patient,
          s: selection,
          d: preview.digest,
          k: crypto.randomUUID(),
        },
      )
    ).publishPortalRelease;
    const patientContext = await browser.newContext();
    const patient = await patientContext.newPage();
    await login(patient, fixture.portal, true);
    const links = (await gql(patient, "{portalLinks}", {}, true)).portalLinks;
    const link = links[0];
    await patient.goto(`${base}/portal/records/${release.id}?link=${link.id}`);
    await expect(
      patient.getByText("Synthetic anatomy note for explicit release review", { exact: true }),
    ).toBeVisible();
    await captures(patient, "patient-anatomy-release");
    await gql(
      page,
      'mutation($o:UUID!,$r:UUID!){withdrawPortalRelease(organizationId:$o,releaseId:$r,expectedVersion:1,reason:"Synthetic release withdrawal")}',
      { o: fixture.organization, r: release.id },
    );
    await patient.reload();
    await expect(
      patient.getByText("Synthetic anatomy note for explicit release review", { exact: true }),
    ).toHaveCount(0);
    report.groups.push({ name: group, result: "pass" });
    group = "Model fetch failure, keyboard structure selection and retained 2D draft";
    await page.route("**/models/anatomy-*.glb", (route) => route.abort());
    const fallbackEncounter = (
      await gql(
        page,
        'mutation($o:UUID!,$p:UUID!,$b:UUID!,$r:UUID!,$k:UUID!){createEncounter(organizationId:$o,patientId:$p,branchId:$b,providerId:$r,reason:"Synthetic fallback review",requestId:$k){id}}',
        {
          o: fixture.organization,
          p: fixture.patient,
          b: fixture.branch,
          r: fixture.provider,
          k: crypto.randomUUID(),
        },
      )
    ).createEncounter;
    await page.goto(
      `${base}/clinic/consultations/${fallbackEncounter.id}?organization=${fixture.organization}`,
    );
    await expect(
      page
        .getByLabel("Anatomical viewport", { exact: true })
        .getByText(/Illustrative map. Select the named structure first/),
    ).toBeVisible();
    await page.getByLabel("Find a structure", { exact: true }).fill("gluteal left");
    const structure = page.getByRole("listitem").filter({ hasText: "Gluteal region" });
    await structure.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Add finding for selected structure", exact: true })
      .click();
    await page
      .getByLabel("Finding description", { exact: true })
      .fill("Synthetic keyboard fallback finding");
    await page.getByRole("button", { name: "Save consultation draft", exact: true }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await captures(page, "anatomy-fallback");
    report.groups.push({ name: group, result: "pass" });
  } catch (error) {
    if (activePage) {
      await activePage.screenshot({ path: path.join(out, "failure-debug.png"), fullPage: true });
      fs.writeFileSync(
        path.join(out, "failure-dom.txt"),
        await activePage.locator("body").innerText(),
      );
    }
    report.groups.push({ name: group, result: "fail", error: error.message });
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, "browser-report.json"), JSON.stringify(report, null, 2));
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
