import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root = resolve(process.cwd(), "../..");
const suffix = randomBytes(5).toString("hex");
const staff = {
  role: "dentist",
  name: "Dr. Synthetic Batch Two Dentist",
  email: `batch2-${suffix}@example.org`,
  password: randomBytes(24).toString("base64url"),
};
const patientEmail = `patient-batch2-${suffix}@example.org`;
const patientPassword = randomBytes(24).toString("base64url");
const clinic = `Synthetic Batch Two ${suffix}`;
let staffSecret = "";
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
  execFileSync(
    "uv",
    ["run", "--project", "services/api", "python", "services/api/tests/e2e_patients_seed.py"],
    {
      cwd: root,
      input: JSON.stringify({ clinic, staff: [staff] }),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
});
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function enroll(page: Page, portal = false) {
  await page.getByText("Can’t scan the code?").click();
  const secret = await page.locator("main details code").textContent();
  await page.getByLabel("Authenticator code", { exact: true }).fill(otp(secret ?? ""));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", {
      name: portal ? "Shared care records" : "Patient workspace",
      exact: true,
    }),
  ).toBeVisible();
  return secret ?? "";
}
async function invitationLink(email: string) {
  let link = "";
  await expect
    .poll(
      async () => {
        const response = await fetch("http://127.0.0.1:58025/api/v1/messages");
        const data = (await response.json()) as {
          messages: { ID: string; To: { Address: string }[]; Subject: string }[];
        };
        const message = data.messages.find(
          (item) =>
            item.Subject === "Your Medframe invitation" &&
            item.To.some((recipient) => recipient.Address === email),
        );
        if (!message) return false;
        const detail = (await (
          await fetch(`http://127.0.0.1:58025/api/v1/message/${message.ID}`)
        ).json()) as { Text: string };
        link = detail.Text.match(/https?:\/\/[^\s]+\/portal\/invite#token=[^\s]+/)?.[0] ?? "";
        return !!link;
      },
      { timeout: 30000 },
    )
    .toBe(true);
  return link;
}
async function invite(page: Page, email: string, guardian = false) {
  await page.getByText("Issue a verified invitation", { exact: true }).click();
  await page.getByLabel("Verified account email").fill(email);
  if (guardian) await choose(page, "Relationship", "Verified guardian");
  await page.getByRole("checkbox", { name: /I verified this person/ }).check();
  await page.getByRole("button", { name: "Send verified invitation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Invitation queued" })).toBeVisible();
  await page.getByText("Issue a verified invitation", { exact: true }).click();
  return invitationLink(email);
}
function pdf() {
  const parts = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 18 Tf 30 200 Td (Synthetic PDF preview) Tj ET";
  parts.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let result = "%PDF-1.4\n";
  const offsets = [0];
  parts.forEach((part, index) => {
    offsets.push(Buffer.byteLength(result));
    result += `${index + 1} 0 obj\n${part}\nendobj\n`;
  });
  const xref = Buffer.byteLength(result);
  result += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(result);
}

test("connected templates, ordered plans, verified self/guardian portal, exact releases, private PDF and separate reports", async ({
  page,
  browser,
}) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(15000);
  await page.goto("/login");
  await page.getByLabel("Work email").fill(staff.email);
  await page.getByLabel("Password", { exact: true }).fill(staff.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  staffSecret = await enroll(page);
  await page.getByRole("link", { name: "Templates", exact: true }).click();
  await page.getByLabel("Template name").fill("Synthetic dental guidance");
  await page.getByLabel("Subjective prompt").fill("Ask about the patient-reported concern.");
  await page.getByRole("button", { name: "Save template version" }).click();
  await expect(page.getByRole("status")).toContainText("Template version saved");
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await page.getByRole("link", { name: "Register patient", exact: true }).click();
  await page.getByLabel("Full name (required)").fill(`Synthetic Batch Two Patient ${suffix}`);
  await page.getByRole("button", { name: "Register patient", exact: true }).click();
  await expect(page.getByRole("link", { name: "Start consultation", exact: true })).toBeVisible();
  const patientUrl = page.url();
  await page.getByRole("link", { name: "Start consultation", exact: true }).click();
  await page.getByLabel("Reason for visit").fill("Synthetic Batch Two consultation");
  await page.getByRole("button", { name: "Start walk-in consultation" }).click();
  await page
    .getByLabel("Objective", { exact: true })
    .fill("Synthetic original recorded observation");
  await page.getByText("Consultation guidance", { exact: true }).click();
  await choose(page, "Clinic template", "Synthetic dental guidance · version 1");
  await page.getByRole("button", { name: "Save draft and apply guidance" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guidance applied" })).toBeVisible();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Objective", { exact: true })).toHaveValue(
    "Synthetic original recorded observation",
  );
  await page.getByRole("button", { name: "Add finding for tooth 16" }).click();
  await page.getByLabel("Finding or condition").fill("Synthetic finding for comparison");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
  await page.getByRole("button", { name: "Mark completed", exact: true }).click();
  await page.getByRole("button", { name: "Review and finalize", exact: true }).click();
  await page.getByRole("button", { name: "Finalize consultation", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Consultation finalized" }),
  ).toBeVisible();
  await page.goto(patientUrl);
  await page.getByText("Create a treatment plan", { exact: true }).click();
  await page.getByLabel("Plan title").fill("Synthetic ordered plan");
  await page.getByLabel("Item 1", { exact: true }).fill("Synthetic first treatment");
  await page.getByRole("button", { name: "Add plan item", exact: true }).click();
  await page.getByLabel("Item 2", { exact: true }).fill("Synthetic second treatment");
  await page.getByRole("button", { name: "Create plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic ordered plan" })).toBeVisible();
  await page.getByRole("button", { name: "Move Synthetic second treatment earlier" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "1. Synthetic second treatment" }),
  ).toBeVisible();
  await page.getByText("Add or edit follow-up", { exact: true }).click();
  await page.getByLabel("Follow-up instructions").fill("Synthetic review instructions");
  await page.getByLabel("Review date (optional)").fill("2026-11-20");
  await page.getByRole("button", { name: "Save follow-up", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Follow-up saved" })).toBeVisible();
  const pdfBytes = pdf();
  await page
    .getByLabel("Choose clinical image or PDF")
    .setInputFiles({ name: "synthetic-batch2.pdf", mimeType: "application/pdf", buffer: pdfBytes });
  await page.getByLabel("Document label").fill("Synthetic portal PDF");
  await page.getByRole("button", { name: "Upload file", exact: true }).click();
  await expect(page.getByText("Security scan passed", { exact: false })).toBeVisible({
    timeout: 60000,
  });
  console.info("Synthetic clinician records prepared; beginning verified invitations.");
  const selfLink = await invite(page, patientEmail);
  const guardianLink = await invite(page, staff.email, true);
  const selfContext = await browser.newContext();
  selfContext.setDefaultTimeout(15000);
  const self = await selfContext.newPage();
  await self.goto(selfLink);
  await self.getByLabel("Your display name (new accounts)").fill("Synthetic Patient Portal");
  await self.getByLabel("Account password", { exact: true }).fill(patientPassword);
  await self.getByRole("button", { name: "Continue with invitation" }).click();
  await enroll(self, true);
  await expect(self.getByText("No records shared yet", { exact: true })).toBeVisible();
  expect(self.url()).not.toContain("token=");
  console.info("Synthetic self account activated; beginning existing-identity guardian claim.");
  const guardianContext = await browser.newContext();
  guardianContext.setDefaultTimeout(15000);
  const guardian = await guardianContext.newPage();
  await guardian.goto(guardianLink);
  await guardian.getByLabel("Account password", { exact: true }).fill(staff.password);
  await guardian.getByRole("button", { name: "Continue with invitation" }).click();
  await expect(guardian.getByRole("heading", { name: "Verify it’s you" })).toBeVisible();
  await guardian
    .getByLabel("Authenticator or recovery code", { exact: true })
    .fill(otp(staffSecret));
  await guardian.getByRole("button", { name: "Verify and continue" }).click();
  await expect(guardian.getByText("No records shared yet", { exact: true })).toBeVisible();
  await expect(guardian.getByText(/Verified guardian access/)).toBeVisible();
  console.info("Synthetic self and guardian accounts active; beginning release preview.");
  await page.getByText("Prepare a clinical release", { exact: true }).click();
  await page.getByLabel("Patient-facing care summary").fill("Synthetic reviewed care summary");
  const consultation = page.getByRole("group", { name: "Finalized consultation (optional)" });
  await consultation.getByRole("radio").check();
  await consultation.getByRole("checkbox", { name: "Objective", exact: true }).check();
  await page
    .getByRole("group", { name: "Dental chart snapshot (optional)" })
    .getByRole("radio")
    .check();
  await page.getByRole("group", { name: "Plan versions" }).getByRole("checkbox").first().check();
  await page
    .getByRole("group", { name: "Follow-up versions" })
    .getByRole("checkbox")
    .first()
    .check();
  await page.getByRole("group", { name: "Clean file versions" }).getByRole("checkbox").check();
  await page.getByRole("button", { name: "Preview selected records" }).click();
  await expect(page.getByRole("heading", { name: "Patient preview", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish patient release", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish patient release", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Patient release published" }),
  ).toBeVisible();
  await self.reload();
  await self.getByRole("link", { name: "Release 1", exact: true }).click();
  await expect(
    self.getByText("Synthetic original recorded observation", { exact: true }),
  ).toBeVisible();
  await expect(self.getByText("Synthetic review instructions", { exact: true })).toBeVisible();
  await self.getByRole("button", { name: "Preview Synthetic portal PDF", exact: true }).click();
  await expect(self.getByRole("status").filter({ hasText: "Page 1 of 1" })).toBeVisible();
  await self.getByText("Accessible page text", { exact: true }).click();
  await expect(self.getByText("Synthetic PDF preview", { exact: true })).toBeVisible();
  const download = self.waitForEvent("download");
  await self.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("synthetic-batch2.pdf");
  await self.getByRole("link", { name: "My reports", exact: true }).click();
  await self
    .getByLabel("Information for your clinic")
    .fill("Synthetic patient-reported history to review");
  await self.getByRole("button", { name: "Send report for review" }).click();
  await expect(self.getByRole("status").filter({ hasText: "Report received" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Synthetic patient-reported history to review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect(page.getByRole("heading", { name: "history · reviewed" })).toBeVisible();
  const review = resolve(root, ".impeccable/review/batch2");
  mkdirSync(review, { recursive: true });
  await self.screenshot({ path: resolve(review, "portal-desktop.png"), fullPage: true });
  await self.setViewportSize({ width: 390, height: 844 });
  expect(await self.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page: self }).analyze()).violations).toEqual([]);
  await self.screenshot({ path: resolve(review, "portal-mobile.png"), fullPage: true });
  await self.getByText("Display preferences", { exact: true }).click();
  await choose(self, "Color mode", "Dark");
  await self.getByRole("button", { name: "Save display preferences", exact: true }).click();
  await expect(self.locator("html")).toHaveAttribute("data-mode", "dark");
  expect((await new AxeBuilder({ page: self }).analyze()).violations).toEqual([]);
  await self.screenshot({ path: resolve(review, "portal-dark-mobile.png"), fullPage: true });

  await page.screenshot({ path: resolve(review, "clinical-desktop.png"), fullPage: true });
  await page.getByLabel("Reason for withdrawal").fill("Synthetic release withdrawal");
  await page.getByText(/Release 1 · published/).click();
  await page.getByRole("button", { name: "Withdraw release 1", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Withdraw release", exact: true })
    .click();
  await guardian.reload();
  await expect(guardian.getByText("No records shared yet", { exact: true })).toBeVisible();

  await page
    .getByLabel("Reason for revocation", { exact: true })
    .fill("Synthetic connection revoked");
  await page.getByRole("button", { name: "Revoke connection", exact: true }).last().click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await self.reload();
  await expect(
    self.getByRole("heading", { name: "No active patient connection", exact: true }),
  ).toBeVisible();
  await selfContext.close();
  await guardianContext.close();
});
