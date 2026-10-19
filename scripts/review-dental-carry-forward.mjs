/* Focused activation confirmation only: carry prior finalized illustration into a new visit. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/dental-illustration.json", "utf8"),
);
const output = path.resolve(".impeccable/review/dental-illustration");
const report = { groups: [], errors: [] };
const browser = await chromium.launch({ headless: true });
try {
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
  await page.goto(
    `http://localhost:3001/clinic/consultations/${fixture.encounter}?organization=${fixture.organization}`,
  );
  const editor = page.locator('[data-dental-editor="true"]');
  await expect(editor).toBeVisible();
  await editor
    .getByRole("navigation", { name: "Individual teeth", exact: true })
    .getByRole("button", { name: /^Tooth 16,/ })
    .click();
  const crown = editor
    .getByRole("complementary", { name: "Tooth inspector", exact: true })
    .getByRole("button", { name: "Crown present", exact: true });
  await expect(crown).toHaveAttribute("aria-pressed", "true");
  await crown.click();
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(editor.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  const records = await page.evaluate(
    async ({ o, current, prior }) => {
      const { csrfToken } = await (await fetch("/api/backend/auth/csrf")).json();
      const result = await (
        await fetch("/api/backend/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({
            query:
              "query($o:UUID!,$current:UUID!,$prior:UUID!){current:encounter(organizationId:$o,encounterId:$current){content} prior:encounter(organizationId:$o,encounterId:$prior){content status}}",
            variables: { o, current, prior },
          }),
        })
      ).json();
      if (result.errors) throw Error(result.errors[0].message);
      return result.data;
    },
    { o: fixture.organization, current: fixture.encounter, prior: fixture.prior_encounter },
  );
  const current = records.current.content.findings.find(
    (item) => item.tooth === "16" && item.condition === "Crown present",
  );
  assert.equal(current.status, "resolved");
  assert.equal("encounter_id" in current, false);
  assert.ok(
    records.prior.content.findings.some(
      (item) => item.key === current.key && item.status === "active",
    ),
  );
  assert.equal(records.prior.status, "finalized");
  await page.reload();
  await expect(editor).toBeVisible();
  await editor
    .getByRole("navigation", { name: "Individual teeth", exact: true })
    .getByRole("button", { name: /^Tooth 16,/ })
    .click();
  await expect(crown).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({
    path: path.join(output, "carry-forward-confirmation.png"),
    animations: "disabled",
  });
  report.groups.push(
    "Prior finalized crown resolves in a new visit, saves without chart metadata, reloads cleared, and retains active original exact evidence",
  );
} catch (error) {
  report.failure = { message: error.message };
  process.exitCode = 1;
} finally {
  fs.writeFileSync(
    path.join(output, "carry-forward-browser.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  await browser.close();
}
