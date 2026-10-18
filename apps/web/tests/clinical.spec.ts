import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
import { PerspectiveCamera, Vector3, Quaternion } from "three";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root = resolve(process.cwd(), "../..");
const suffix = randomBytes(5).toString("hex");
const clinic = `Synthetic Clinical ${suffix}`;
const staff = [
  { role: "dentist", name: "Dr. Synthetic Clinical Safety Dentist" },
  { role: "clinic_administrator", name: "Synthetic Clinical Safety Administrator" },
  { role: "doctor", name: "Dr. Synthetic Clinical Recovery Doctor" },
].map((person) => ({
  ...person,
  email: `${person.role}-clinical-${suffix}@example.org`,
  password: randomBytes(24).toString("base64url"),
}));
const image = `/tmp/medframe-synthetic-${suffix}.png`;

test.beforeAll(() => {
  execFileSync(
    "uv",
    ["run", "--project", "services/api", "python", "services/api/tests/e2e_patients_seed.py"],
    { cwd: root, input: JSON.stringify({ clinic, staff }), stdio: ["pipe", "pipe", "pipe"] },
  );
  execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "from PIL import Image; import sys; Image.new('RGB',(32,32),'white').save(sys.argv[1])",
      image,
    ],
    { cwd: root, stdio: "pipe" },
  );
});

async function login(page: Page, person: (typeof staff)[number]) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Can’t scan the code?").click();
  const secret = await page.locator("main details code").textContent();
  const otp = execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import sys,pyotp; print(pyotp.TOTP(sys.stdin.read().strip()).now())",
    ],
    { cwd: root, input: secret ?? "", encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.getByRole("heading", { name: "Patient workspace", exact: true })).toBeVisible();
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function finalize(page: Page) {
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await page.getByRole("button", { name: "Review and finalize", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Finalize consultation", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Consultation finalized" }),
  ).toBeVisible();
}

test("walk-in SOAP, dental findings, private documents, finalization, amendment, and treatment evidence", async ({
  page,
}) => {
  test.setTimeout(180000);
  await login(page, staff[0]);
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByLabel("Full name (required)").fill(`Synthetic Clinical Patient ${suffix}`);
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await page.getByRole("link", { name: "Start consultation", exact: true }).click();
  await page.getByLabel("Reason for visit").fill("Synthetic walk-in care");
  await page.getByRole("button", { name: "Start walk-in consultation" }).click();
  await expect(page.getByRole("heading", { name: "Consultation notes" })).toBeVisible();
  await page.getByLabel("Subjective", { exact: true }).fill("Synthetic patient-reported concern");
  await page.getByLabel("Objective", { exact: true }).fill("Synthetic original observation");
  await page.getByRole("button", { name: "Add diagnosis", exact: true }).click();
  await page.getByLabel("Diagnosis 1", { exact: true }).fill("Synthetic clinician-entered concern");
  await page.getByRole("button", { name: "Add finding for tooth 16" }).click();
  await page.getByLabel("Finding or condition").fill("Synthetic recorded finding");
  await page.getByLabel("occlusal", { exact: true }).check();
  await page.getByRole("button", { name: "Add procedure", exact: true }).click();
  await page.getByLabel("Procedure 1", { exact: true }).fill("Synthetic completed procedure");
  await page.getByLabel("FDI tooth (optional)").fill("16");
  await choose(page, "Procedure status", "completed");
  await page.getByLabel("Choose clinical image or PDF").setInputFiles(image);
  await page.getByLabel("Document label").fill("Synthetic clinical attachment");
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(page.getByText(/Security scan passed/)).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Attach to visit" }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic patient-reported concern",
  );
  await expect(page.getByLabel("Finding or condition")).toHaveValue("Synthetic recorded finding");
  const modelLoaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/models/dental-schematic-v1.glb") && response.status() === 200,
    { timeout: 30000 },
  );
  await page.getByRole("button", { name: "Show 3D view" }).click();
  await modelLoaded;
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Schematic model ready" })).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document.querySelector("canvas")?.getAttribute("data-engine")?.startsWith("three.js"),
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  if (process.env.MEDFRAME_CAPTURE_REVIEW) {
    mkdirSync(resolve(root, ".impeccable/review"), { recursive: true });
    await canvas.screenshot({ path: resolve(root, ".impeccable/review/dental.png") });
  }
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const model = readFileSync(resolve(root, "apps/web/public/models/dental-schematic-v1.glb"));
  const gltf = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString()) as {
    nodes: { name: string; translation?: number[]; scale?: number[]; rotation?: number[] }[];
  };
  const tooth = gltf.nodes.find((node) => node.name === "tooth_46")!;
  const point = new Vector3(0, 0.99, 0.1)
    .multiply(new Vector3(...(tooth.scale as [number, number, number])))
    .applyQuaternion(new Quaternion(...(tooth.rotation as [number, number, number, number])))
    .add(new Vector3(...(tooth.translation as [number, number, number])));
  const camera = new PerspectiveCamera(45, bounds!.width / bounds!.height, 0.1, 1000);
  camera.position.set(0, 5, 13);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  point.project(camera);
  await page.mouse.click(
    bounds!.x + ((point.x + 1) / 2) * bounds!.width,
    bounds!.y + ((1 - point.y) / 2) * bounds!.height,
  );
  await expect(
    page.getByRole("button", { name: /Tooth 46, lower right first molar/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Selected tooth surface", exact: true }),
  ).toContainText("occlusal");
  await page.getByRole("button", { name: /Tooth 26, upper left first molar/ }).click();
  await expect(
    page.getByRole("button", { name: /Tooth 26, upper left first molar/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Tooth 16, upper right first molar/ }).click();
  await expect(page.getByLabel("Finding or condition")).toHaveValue("Synthetic recorded finding");
  await page.getByRole("button", { name: "Hide 3D view" }).click();
  await finalize(page);
  await expect(page.getByLabel("Objective", { exact: true })).toHaveAttribute("readonly", "");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.png$/);
  await page.getByLabel("Reason for amendment").fill("Correct a synthetic observation");
  await page.getByRole("button", { name: "Start amendment", exact: true }).click();
  await page.getByLabel("Objective", { exact: true }).fill("Synthetic corrected observation");
  await finalize(page);
  await page.getByRole("link", { name: "Open revision 1", exact: true }).click();
  await expect(page.getByLabel("Objective", { exact: true })).toHaveValue(
    "Synthetic original observation",
  );
  await page.getByRole("link", { name: "Patient record", exact: true }).click();
  await page.getByText("Create a treatment plan", { exact: true }).click();
  await page.getByLabel("Plan title").fill("Synthetic care sequence");
  await page.getByLabel("Item 1", { exact: true }).fill("Synthetic completed procedure");
  await page.getByLabel("FDI tooth", { exact: true }).fill("16");
  await page.getByRole("button", { name: "Create plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic care sequence" })).toBeVisible();
  await page.getByRole("combobox", { name: "Finalized procedure evidence" }).click();
  await page.getByRole("option", { name: "Synthetic walk-in care, revision 2" }).click();
  await page.getByRole("button", { name: "Complete plan item" }).click();
  await expect(page.getByText("1 of 1 completed", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open preserved visit revision" })).toHaveCount(2);
});

test("white defaults, scoped branding, logo/avatar persistence, personal dark mode, and dashboard ordering", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await login(page, staff[1]);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");
  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Clinic branding", exact: true }).click();
  await page.getByLabel("Primary action color").fill("#263F63");
  await choose(page, "Font family", "source sans 3");
  await page.getByRole("button", { name: "Cancel preview", exact: true }).click();
  await expect(page.getByLabel("Primary action color")).toHaveValue("#0F2D4A");
  await page.getByLabel("Primary action color").fill("#263F63");
  await page.getByLabel("Choose logo image").setInputFiles(image);
  await page.getByLabel("Image label").fill("Synthetic clinic logo");
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(page.getByText(/Security scan passed/)).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Use image", exact: true }).click();
  await page.getByRole("button", { name: "Save clinic appearance", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Clinic appearance saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Clinic logo", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Clinic logo", { exact: true })
        .evaluate(
          (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await choose(page, "Organization", `${clinic} Second`);
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--clinic-primary").trim(),
      ),
    )
    .toBe("#0F2D4A");
  await choose(page, "Organization", clinic);
  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await choose(page, "Color mode", "dark");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your appearance preferences are saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await expect(page.getByAltText("Clinic logo", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Clinic logo", { exact: true })
        .evaluate(
          (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
        ),
    )
    .toBe(true);
  if (process.env.MEDFRAME_CAPTURE_REVIEW) {
    mkdirSync(resolve(root, ".impeccable/review"), { recursive: true });
    await page.screenshot({ path: resolve(root, ".impeccable/review/dark.png") });
  }
  await page.getByLabel("Choose avatar image").setInputFiles(image);
  await page.getByLabel("Image label").fill("Synthetic profile image");
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(page.getByText(/Security scan passed/)).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Use image", exact: true }).click();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByAltText("Your profile image", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Your profile image", { exact: true })
        .evaluate(
          (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(
    page.getByRole("status").filter({ hasText: "Your appearance preferences are saved" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dashboard layout", exact: true }).click();
  await page.getByRole("button", { name: "Move recent consultations up", exact: true }).click();
  await page.getByRole("button", { name: "Save dashboard layout", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Dashboard layout saved" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "recent_consultations",
  );
  await page.reload();
  await expect(page.locator("[data-widget]").first()).toHaveAttribute(
    "data-widget",
    "recent_consultations",
  );
  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Your preferences", exact: true }).click();
  await page.getByRole("button", { name: "Preview defaults", exact: true }).click();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await expect(
    page.getByRole("status").filter({ hasText: "Your appearance preferences are saved" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clinic branding", exact: true }).click();
  await page.getByRole("button", { name: "Preview defaults", exact: true }).click();
  await page.getByRole("button", { name: "Save clinic appearance", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Clinic appearance saved" }),
  ).toBeVisible();
  if (process.env.MEDFRAME_CAPTURE_REVIEW) {
    mkdirSync(resolve(root, ".impeccable/review"), { recursive: true });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: resolve(root, ".impeccable/review/desktop.png") });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.MEDFRAME_CAPTURE_REVIEW) {
    await page.screenshot({ path: resolve(root, ".impeccable/review/mobile.png") });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("SOAP input survives failed autosave, offline refresh, and a concurrent saved version", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...options: unknown[]
    ) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
      return Reflect.apply(original, this, [kind, ...options]);
    } as typeof original;
  });
  await login(page, staff[2]);
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByLabel("Full name (required)").fill(`Synthetic Recovery Patient ${suffix}`);
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await page.getByRole("link", { name: "Start consultation", exact: true }).click();
  await page.getByLabel("Reason for visit").fill("Synthetic recovery verification");
  await page.getByRole("button", { name: "Start walk-in consultation" }).click();
  await expect(page.getByLabel("Subjective", { exact: true })).toBeVisible();
  await page.route("**/api/backend/graphql", async (route) => {
    const body = route.request().postDataJSON() as { query: string };
    if (body.query.includes("mutation SaveConsultation")) await route.abort();
    else await route.continue();
  });
  await page.getByLabel("Subjective", { exact: true }).fill("Synthetic unsaved SOAP must survive");
  await expect(page.getByRole("status").filter({ hasText: "Autosave paused" })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic unsaved SOAP must survive",
  );
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("link", { name: "Patient record", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic unsaved SOAP must survive",
  );
  await page.unroute("**/api/backend/graphql");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic unsaved SOAP must survive",
  );
  const location = new URL(page.url());
  const variables = {
    organizationId: location.searchParams.get("organization"),
    encounterId: location.pathname.split("/").pop(),
  };
  const { csrfToken } = await (await page.request.get("/api/backend/auth/csrf")).json();
  const headers = { Origin: location.origin, "X-CSRF-Token": csrfToken };
  const current = await page.request.post("/api/backend/graphql", {
    headers,
    data: {
      query:
        "query($organizationId:UUID!,$encounterId:UUID!){encounter(organizationId:$organizationId,encounterId:$encounterId){version content}}",
      variables,
    },
  });
  const saved = (await current.json()).data.encounter as {
    version: number;
    content: { soap: { subjective: string } };
  };
  await page.getByLabel("Subjective", { exact: true }).fill("Synthetic local conflicting SOAP");
  const changed = await page.request.post("/api/backend/graphql", {
    headers,
    data: {
      query:
        "mutation($organizationId:UUID!,$encounterId:UUID!,$content:JSON!,$expectedVersion:Int!){updateEncounterDraft(organizationId:$organizationId,encounterId:$encounterId,content:$content,expectedVersion:$expectedVersion){version}}",
      variables: {
        ...variables,
        content: {
          ...saved.content,
          soap: { ...saved.content.soap, subjective: "Synthetic concurrent SOAP" },
        },
        expectedVersion: saved.version,
      },
    },
  });
  expect((await changed.json()).data.updateEncounterDraft.version).toBe(saved.version + 1);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "record changed" })).toBeVisible();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic local conflicting SOAP",
  );
  await page.getByRole("button", { name: "Discard input and load latest", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Synthetic concurrent SOAP",
  );
  await page.getByLabel("Objective", { exact: true }).fill("Synthetic reconciled objective");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
  await page.getByRole("button", { name: "Show 3D view", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "3D is unavailable" })).toBeVisible();
  const alternative = page.getByRole("button", { name: /Tooth 26, upper left first molar/ });
  await alternative.focus();
  await page.keyboard.press("Enter");
  await expect(alternative).toHaveAttribute("aria-pressed", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
