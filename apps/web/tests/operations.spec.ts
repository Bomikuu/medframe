import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const root = resolve(process.cwd(), "../..");
const suffix = randomBytes(4).toString("hex");
const roles = ["clinic_administrator", "dentist", "receptionist"];
const staff = roles.map((role, index) => ({
  role,
  name: `Synthetic Operations ${role}`,
  email: `ops-${index}-${suffix}@example.test`,
  password: randomBytes(20).toString("base64url"),
  secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
}));
const patientEmail = `ops-patient-${suffix}@example.test`;
const patientPassword = randomBytes(20).toString("base64url");
let seed: { organization: string; patient: string; branch: string; invitation: string };
function otp(secret: string) {
  return execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      "import sys,pyotp; print(pyotp.TOTP(sys.stdin.read().strip()).now())",
    ],
    { cwd: root, input: secret, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}
test.beforeAll(() => {
  seed = JSON.parse(
    execFileSync(
      "uv",
      ["run", "--project", "services/api", "python", "services/api/tests/e2e_operations_seed.py"],
      {
        cwd: root,
        input: JSON.stringify({
          staff,
          clinic: `Synthetic Operations ${suffix}`,
          patient_email: patientEmail,
        }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    ),
  ) as typeof seed;
});
async function select(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function signIn(page: Page, person: (typeof staff)[number]) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp(person.secret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.getByRole("heading", { name: "Patient workspace", exact: true })).toBeVisible();
}

test("one connected operations journey: schedule, booking, reschedule, check-in, clinical handoff and verified private queue", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, staff[0]);
  await adminPage.getByRole("link", { name: "Schedules", exact: true }).click();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(Date.now() + 86400000),
  );
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(`${day}T12:00:00+08:00`).getUTCDay()
  ];
  await select(adminPage, "Provider", staff[1].name);
  await select(adminPage, "Weekday", weekday);
  await adminPage.getByLabel("Effective from", { exact: true }).fill(day);
  await adminPage.getByLabel("Effective through", { exact: true }).fill(day);
  await adminPage.getByLabel("Opens", { exact: true }).fill("09:00");
  await adminPage.getByLabel("Closes", { exact: true }).fill("17:00");
  await adminPage.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();
  const receptionContext = await browser.newContext();
  const reception = await receptionContext.newPage();
  await signIn(reception, staff[2]);
  await reception.getByRole("link", { name: "Appointments", exact: true }).click();
  await reception.getByText("Book an appointment", { exact: true }).click();
  await reception.getByLabel("Visit date (Asia/Manila)").fill(day);
  await reception.getByRole("combobox", { name: "Available time", exact: true }).click();
  await reception.getByRole("option").first().click();
  await reception.getByRole("button", { name: "Book appointment", exact: true }).click();
  await expect(reception.getByRole("status").filter({ hasText: "Changes saved" })).toBeVisible();
  await reception.getByLabel("Date", { exact: true }).fill(day);
  await expect(
    reception.getByRole("heading", { name: /Synthetic Operations Browser Patient/ }),
  ).toBeVisible();
  await reception.getByRole("button", { name: "Reschedule", exact: true }).click();
  const reschedule = reception
    .locator("section")
    .filter({ has: reception.getByRole("heading", { name: "Reschedule booking", exact: true }) });
  await reschedule.getByLabel("Visit date (Asia/Manila)").fill(day);
  await reschedule.getByRole("combobox", { name: "Available time", exact: true }).click();
  await reception.getByRole("option").last().click();
  await reschedule.getByRole("button", { name: "Confirm reschedule", exact: true }).click();
  await reception.getByRole("button", { name: "Check in patient", exact: true }).click();
  await reception.getByRole("link", { name: "Queue", exact: true }).click();
  await expect(reception.getByRole("heading", { name: /Ticket 1/ })).toBeVisible();
  await reception.getByRole("button", { name: "Call patient", exact: true }).click();
  await reception.getByRole("button", { name: "Confirm queue change", exact: true }).click();
  const clinicianContext = await browser.newContext();
  const clinician = await clinicianContext.newPage();
  await signIn(clinician, staff[1]);
  await clinician.getByRole("link", { name: "Queue", exact: true }).click();
  await expect(
    clinician.getByRole("link", { name: "Start consultation for patient", exact: true }),
  ).toBeVisible();
  const patientContext = await browser.newContext();
  const patient = await patientContext.newPage();
  const url = new URL(seed.invitation);
  await patient.goto(`${url.pathname}${url.hash}`);
  await patient.getByLabel("Your display name (new accounts)").fill("Synthetic Operations Patient");
  await patient.getByLabel("Account password", { exact: true }).fill(patientPassword);
  await patient.getByRole("button", { name: /continue/i }).click();
  await patient.getByText("Can’t scan the code?").click();
  const secret = await patient.locator("main details code").textContent();
  await patient.getByLabel("Authenticator code", { exact: true }).fill(otp(secret ?? ""));
  await patient.getByRole("button", { name: "Verify and continue", exact: true }).click();
  await patient.getByRole("checkbox").check();
  await patient.getByRole("button", { name: "Open workspace", exact: true }).click();
  await patient.getByRole("link", { name: "My queue", exact: true }).click();
  await expect(patient.getByRole("heading", { name: "Your ticket 1", exact: true })).toBeVisible();
  await expect(patient.getByText("Live updates connected", { exact: false })).toBeVisible();
  await reception.getByText("Queue controls and care link", { exact: true }).click();
  await reception
    .getByLabel("Operational reason", { exact: true })
    .fill("Synthetic operational delay");
  await reception.getByRole("button", { name: "Record delay", exact: true }).click();
  await reception.getByRole("button", { name: "Confirm queue change", exact: true }).click();
  await expect(
    patient.getByText("Reception recorded a 5-minute delay.", { exact: true }),
  ).toBeVisible();
  await patient.setViewportSize({ width: 390, height: 844 });
  await expect(patient.getByRole("heading", { name: "My queue", exact: true })).toBeVisible();
  await Promise.all([
    adminContext.close(),
    receptionContext.close(),
    clinicianContext.close(),
    patientContext.close(),
  ]);
});
