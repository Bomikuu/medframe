import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const projectRoot = resolve(process.cwd(), "../..");
const suffix = randomBytes(5).toString("hex");
const clinic = `Synthetic Patient Clinic ${suffix}`;
const staff = [
  { role: "dentist", name: "Dr. Synthetic Patient Dentist" },
  { role: "doctor", name: "Dr. Synthetic Assigned Doctor" },
  { role: "clinic_administrator", name: "Synthetic Patient Administrator" },
  { role: "receptionist", name: "Synthetic Receptionist" },
  { role: "dentist", name: "Dr. Synthetic Safety Dentist" },
].map((person) => ({
  ...person,
  email: `${person.role}-${person.name.includes("Safety") ? "safety-" : ""}${suffix}@example.org`,
  password: randomBytes(24).toString("base64url"),
}));

test.beforeAll(() => {
  execFileSync(
    "uv",
    ["run", "--project", "services/api", "python", "services/api/tests/e2e_patients_seed.py"],
    { cwd: projectRoot, input: JSON.stringify({ clinic, staff }), stdio: ["pipe", "pipe", "pipe"] },
  );
});

async function signIn(page: Page, person: (typeof staff)[number]) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Protect your account" })).toBeVisible();
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
    { cwd: projectRoot, input: secret ?? "", encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.getByRole("heading", { name: "Patient workspace" })).toBeVisible();
}

async function inspect(page: Page, surface: string) {
  const output = resolve(projectRoot, "test-results/patients-review");
  await mkdir(output, { recursive: true });
  await page.waitForLoadState("networkidle");
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    for (const [device, viewport] of [
      ["desktop", { width: 1440, height: 1000 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (process.env.MEDFRAME_CAPTURE_REVIEW === "1")
        await page.screenshot({
          path: `${output}/${surface}-${device}-${theme}.png`,
          fullPage: true,
          caret: "initial",
        });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
}

test("patient registration, clinical history, conflict, and persisted revisions", async ({
  page,
}) => {
  test.setTimeout(180000);
  await signIn(page, staff[0]);
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect(page.getByText("Enter the patient’s full name.")).toBeVisible();
  await page.getByLabel("Full name (required)").fill(`李 María Dela Cruz ${suffix}`);
  await page.getByLabel("Date of birth", { exact: true }).fill("2001-02-03");
  await page.getByLabel("Email address", { exact: true }).fill("synthetic-patient@example.org");
  await page
    .getByLabel("Address", { exact: true })
    .fill(
      "Synthetic address with a deliberately long building and street name for responsive layout verification.",
    );
  await inspect(page, "registration");
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Full name (required)")).toHaveValue(`李 María Dela Cruz ${suffix}`);
  let interrupted = false;
  await page.route("**/api/backend/graphql", async (route) => {
    if (
      route.request().postData()?.includes('"operationName":"RegisterPatient"') ||
      route.request().postData()?.includes("mutation RegisterPatient")
    ) {
      await route.fetch();
      interrupted = true;
      return route.abort();
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect.poll(() => interrupted).toBe(true);
  await expect(
    page.getByRole("alert").filter({ hasText: "request could not be completed" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name (required)")).toHaveValue(`李 María Dela Cruz ${suffix}`);
  await page.unroute("**/api/backend/graphql");
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect(page.getByRole("heading", { name: `李 María Dela Cruz ${suffix}` })).toBeVisible();
  const patientUrl = page.url();
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^Not reviewed$/ })).toHaveCount(2);
  await page.getByText("Review and update medical history", { exact: true }).click();
  await page
    .getByLabel("Medical history", { exact: true })
    .fill("Synthetic history recorded during development.");
  await page.getByRole("button", { name: "Add allergy", exact: true }).click();
  await page.getByLabel("Allergen 1", { exact: true }).fill("Synthetic allergen");
  await page.getByLabel("Reaction 1", { exact: true }).fill("Synthetic reaction");
  await page.getByRole("button", { name: "Save medical history", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Medical history saved as version 1" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Synthetic allergen", { exact: true })).toBeVisible();
  await inspect(page, "record");
  await page.getByText("Review and update medical history", { exact: true }).click();
  await page
    .getByLabel("Medical history", { exact: true })
    .fill("Local unsaved history must survive conflict.");
  const parsed = new URL(patientUrl);
  const patientId = parsed.pathname.split("/").pop();
  const organizationId = parsed.searchParams.get("organization");
  const csrf = await page.request.get("/api/backend/auth/csrf");
  const { csrfToken } = await csrf.json();
  const changed = await page.request.post("/api/backend/graphql", {
    headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrfToken },
    data: {
      query:
        "mutation($org:UUID!,$id:UUID!,$data:SaveClinicalHistoryInput!){savePatientClinicalHistory(organizationId:$org,patientId:$id,data:$data){version}}",
      variables: {
        org: organizationId,
        id: patientId,
        data: { expectedVersion: 1, medicalHistory: "Concurrent saved history" },
      },
    },
  });
  expect((await changed.json()).data.savePatientClinicalHistory.version).toBe(2);
  await page.getByRole("button", { name: "Save medical history", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "record changed" })).toContainText(
    "record changed",
  );
  await expect(page.getByLabel("Medical history", { exact: true })).toHaveValue(
    "Local unsaved history must survive conflict.",
  );
  await page.getByRole("button", { name: "Load latest version" }).click();
  await page.getByRole("button", { name: "Load latest", exact: true }).click();
  await expect(page.getByLabel("Medical history", { exact: true })).toHaveValue(
    "Concurrent saved history",
  );
  const unicodeHistory = {
    expectedVersion: 2,
    medicalHistory: "界".repeat(2000),
    conditions: "界".repeat(1800),
  };
  const largeSave = await page.request.post("/api/backend/graphql", {
    headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrfToken },
    data: {
      query:
        "mutation($org:UUID!,$id:UUID!,$data:SaveClinicalHistoryInput!){savePatientClinicalHistory(organizationId:$org,patientId:$id,data:$data){version}}",
      variables: { org: organizationId, id: patientId, data: unicodeHistory },
    },
  });
  expect((await largeSave.json()).data.savePatientClinicalHistory.version).toBe(3);
  const oversizedSave = await page.request.post("/api/backend/graphql", {
    headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrfToken },
    data: {
      query:
        "mutation($org:UUID!,$id:UUID!,$data:SaveClinicalHistoryInput!){savePatientClinicalHistory(organizationId:$org,patientId:$id,data:$data){version}}",
      variables: {
        org: organizationId,
        id: patientId,
        data: { ...unicodeHistory, expectedVersion: 3, conditions: "界".repeat(2000) },
      },
    },
  });
  expect((await oversizedSave.json()).errors[0].extensions.code).toBe("INVALID_INPUT");
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Medical history revisions" })).toBeVisible();
  await page.getByText("Version 1 · Dr. Synthetic Patient Dentist", { exact: true }).click();
  await expect(page.getByText("Synthetic allergen", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("link", { name: `李 María Dela Cruz ${suffix}` })).toBeVisible();
  await inspect(page, "directory");
  await page.getByLabel("Name or patient reference").fill("%_");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching patients" })).toBeVisible();
  await page.getByRole("button", { name: "Clear patient search" }).click();
  await expect(page.getByRole("link", { name: `李 María Dela Cruz ${suffix}` })).toBeVisible();
});

test("administrator manages demographics and grants without clinical bypass", async ({ page }) => {
  test.setTimeout(90000);
  await signIn(page, staff[2]);
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByLabel("Full name (required)").fill(`Synthetic Administrator Patient ${suffix}`);
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Synthetic Administrator Patient ${suffix}` }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Medical history", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Clinical access" })).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: staff[1].name })
    .getByRole("button", { name: "Grant access" })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(staff[1].name);
  await page.getByRole("button", { name: "Grant access", exact: true }).last().click();
  await expect(
    page.getByRole("status").filter({ hasText: "Patient access granted to" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Medical history", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit details", exact: true }).click();
  await page.getByLabel("Phone number", { exact: true }).fill("+63 900 000 0000");
  await page.getByRole("button", { name: "Save patient details", exact: true }).click();
  await expect(page.getByText("+63 900 000 0000", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("+63 900 000 0000", { exact: true })).toBeVisible();
});

test("drafts survive offline refresh and history navigation; obsolete saves cannot change clinics", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signIn(page, staff[4]);
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByRole("combobox", { name: "Registration branch", exact: true }).click();
  await page.getByRole("option", { name: "Secondary branch", exact: true }).click();
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.goBack();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    page.getByRole("combobox", { name: "Registration branch", exact: true }),
  ).toContainText("Secondary branch");
  await page.getByLabel("Full name (required)").fill("Synthetic safety patient");
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic safety patient", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit details", exact: true }).click();
  await page.getByLabel("Phone number", { exact: true }).fill("+63 911 111 1111");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Connection interrupted.", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue("+63 911 111 1111");
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Connection interrupted.", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue("+63 911 111 1111");
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Discard unsaved changes?");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toContainText("Discard unsaved changes?");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue("+63 911 111 1111");
  await page.goBack();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic safety patient", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page.getByLabel("Phone number", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await page.getByText("Review and update medical history", { exact: true }).click();
  await page
    .getByLabel("Medical history", { exact: true })
    .fill("Synthetic clinical draft survives offline refresh and history navigation.");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Connection interrupted.", { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel("Medical history", { exact: true })).toHaveValue(
    "Synthetic clinical draft survives offline refresh and history navigation.",
  );
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Connection interrupted.", { exact: false })).toHaveCount(0);
  await page.goBack();
  await page.getByRole("button", { name: "Keep editing" }).click();
  if (!(await page.getByLabel("Medical history", { exact: true }).isVisible()))
    await page.getByText("Review and update medical history", { exact: true }).click();
  await expect(page.getByLabel("Medical history", { exact: true })).toHaveValue(
    "Synthetic clinical draft survives offline refresh and history navigation.",
  );
  await page.getByRole("button", { name: "Save medical history", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Medical history saved as version 1" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByLabel("Full name (required)").fill("Synthetic delayed registration");
  let release: (() => void) | undefined;
  let reached: (() => void) | undefined;
  const requested = new Promise<void>((resolve) => {
    reached = resolve;
  });
  await page.route("**/api/backend/graphql", async (route) => {
    if (!route.request().postData()?.includes("mutation RegisterPatient")) return route.continue();
    const response = await route.fetch();
    const responseBody = await response.body();
    reached?.();
    await Promise.race([
      new Promise<void>((resolve) => {
        release = resolve;
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 10000)),
    ]);
    await route.fulfill({ response, body: responseBody });
  });
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await requested;
  await page.getByRole("combobox", { name: "Organization", exact: true }).click();
  await page.getByRole("option", { name: clinic + " Second", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible();
  const newOrganizationUrl = page.url();
  await page.goBack();
  await expect(page.getByLabel("Full name (required)")).toHaveValue("");
  await page.getByLabel("Full name (required)").fill("Synthetic later activation draft");
  const restoredFormUrl = page.url();
  expect(restoredFormUrl).not.toBe(newOrganizationUrl);
  release?.();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(restoredFormUrl);
  await expect(page.getByLabel("Full name (required)")).toHaveValue(
    "Synthetic later activation draft",
  );
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.unroute("**/api/backend/graphql");
});
