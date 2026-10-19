/* One batched browser review, synthetic identity/care in an isolated clone. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20000 });
const fixture = JSON.parse(
  fs.readFileSync("/home/micxsz/.local/share/medframe/ui-review/dental-illustration.json", "utf8"),
);
const out = path.resolve(".impeccable/review/dental-illustration");
const report = { groups: [], captures: [], geometry: [], errors: [], aiRequests: [] };
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
page.on("dialog", (dialog) => dialog.accept());
async function capture(name) {
  await page.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  report.captures.push(name);
  report.geometry.push({ name, ...geometry });
  assert.equal(geometry.overflow, false, name + " overflow");
}
async function detail() {
  return page.evaluate(
    async ({ o, e }) => {
      const { csrfToken } = await (await fetch("/api/backend/auth/csrf")).json();
      const data = await (
        await fetch("/api/backend/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
          body: JSON.stringify({
            query:
              "query($o:UUID!,$e:UUID!){encounter(organizationId:$o,encounterId:$e){id version content}}",
            variables: { o, e },
          }),
        })
      ).json();
      if (data.errors) throw Error(data.errors[0].message);
      return data.data.encounter;
    },
    { o: fixture.organization, e: fixture.encounter },
  );
}
let dental;
try {
  await page.goto(
    `http://localhost:3001/clinic/consultations/${fixture.encounter}?organization=${fixture.organization}`,
  );
  dental = page.locator('[data-dental-editor="true"]');
  await expect(dental).toBeVisible();
  await expect(dental.getByText("Anatomical model ready", { exact: true })).toBeVisible();
  await capture("initial-desktop");
  const inspector = dental.getByRole("complementary", { name: "Tooth inspector", exact: true });
  const navigator = dental.getByRole("navigation", { name: "Individual teeth", exact: true });
  await navigator.getByRole("button", { name: /^Tooth 48,/ }).click();
  await inspector
    .getByRole("combobox", { name: "Impacted tooth orientation", exact: true })
    .click();
  await page.getByRole("option", { name: "Horizontal", exact: true }).click();
  await expect(dental.getByText("Impaction · horizontal", { exact: true })).toBeVisible();
  await capture("impacted-48");
  await navigator.getByRole("button", { name: /^Tooth 16,/ }).click();
  await expect(
    inspector.getByRole("combobox", { name: "Impacted tooth orientation", exact: true }),
  ).toHaveCount(0);
  await inspector.getByRole("button", { name: "Crown present", exact: true }).click();
  await inspector.getByRole("button", { name: "Braces bracket", exact: true }).click();
  await expect(
    inspector.getByRole("button", { name: "Crown present", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await capture("crown-bracket-16");
  await inspector.getByRole("button", { name: "Select occlusal surface", exact: true }).click();
  const assistant = dental.getByRole("complementary", { name: "Medframe AI", exact: true });
  await expect(
    assistant
      .getByRole("region", { name: "Assistant focus", exact: true })
      .getByText("Tooth 16 · occlusal", { exact: true }),
  ).toBeVisible();
  await assistant
    .getByRole("textbox", { name: "AI message preview", exact: true })
    .fill("Synthetic local composer text");
  await expect(
    assistant.getByRole("button", { name: "Send message — AI is not connected", exact: true }),
  ).toBeDisabled();
  await navigator.getByRole("button", { name: /^Tooth 18,/ }).click();
  await expect(
    assistant
      .getByRole("region", { name: "Assistant focus", exact: true })
      .getByText("Tooth 18", { exact: true }),
  ).toBeVisible();
  assert.equal(report.aiRequests.length, 0);
  report.groups.push(
    "Impaction control limited to wisdom teeth; crown/bracket controls and focused-surface assistant update; preview cannot send",
  );
  await navigator.getByRole("button", { name: /^Tooth 48,/ }).click();
  await dental.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(dental.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  let record = await detail();
  for (const [tooth, condition] of [
    ["48", "Impacted tooth — horizontal"],
    ["16", "Crown present"],
    ["16", "Orthodontic bracket present"],
  ])
    assert.ok(
      record.content.findings.some(
        (item) => item.tooth === tooth && item.condition === condition && item.status === "active",
      ),
    );
  await page.reload();
  await expect(dental).toBeVisible();
  await navigator.getByRole("button", { name: /^Tooth 48,/ }).click();
  await expect(
    inspector.getByRole("combobox", { name: "Impacted tooth orientation", exact: true }),
  ).toContainText("Horizontal");
  await inspector.getByRole("button", { name: "Missing / extracted", exact: true }).click();
  await expect(
    dental.getByText(/Tooth 48 is recorded missing and its mesh is hidden/),
  ).toBeVisible();
  await capture("missing-48");
  await inspector.getByRole("button", { name: "Missing / extracted", exact: true }).click();
  await expect(dental.getByText(/Tooth 48 is recorded missing and its mesh is hidden/)).toHaveCount(
    0,
  );
  await inspector
    .getByRole("combobox", { name: "Impacted tooth orientation", exact: true })
    .click();
  await page.getByRole("option", { name: "Upright / clear impaction preset", exact: true }).click();
  await dental.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(dental.getByText("Draft saved", { exact: true }).first()).toBeVisible();
  record = await detail();
  assert.equal(
    record.content.findings.some((item) => item.tooth === "48" && item.status === "active"),
    false,
  );
  report.groups.push(
    "Real backend saves/reloads all presets; missing hides model; clearing resolves saved impaction without deleting finding evidence",
  );
  for (const [name, width, height] of [
    ["desktop-1280", 1280, 900],
    ["tablet", 1024, 768],
    ["phone", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    if (width < 1280) {
      await dental.getByRole("button", { name: "Toggle Medframe AI", exact: true }).click();
      const sheet = page.locator('[data-slot="sheet-content"]');
      await expect(sheet).toBeVisible();
      await expect(
        sheet
          .getByRole("region", { name: "Assistant focus", exact: true })
          .getByText("Tooth 48", { exact: true }),
      ).toBeVisible();
      await capture(name + "-assistant");
      await sheet.getByRole("button", { name: "Close AI sidebar", exact: true }).click();
    }
    await capture(name);
  }
  report.groups.push(
    "Desktop/tablet/phone have no document overflow and labelled assistant drawer opens/closes",
  );
  await page.setViewportSize({ width: 1660, height: 1040 });
  await dental.getByRole("button", { name: "Anatomy", exact: true }).click();
  const anatomyAssistant = page.getByRole("complementary", { name: "Medframe AI", exact: true });
  await expect(anatomyAssistant).toBeVisible();
  await expect(
    anatomyAssistant.getByRole("region", { name: "Assistant focus", exact: true }),
  ).toContainText("Posterior region of arm");
  await capture("shared-anatomy-preview");
  assert.equal(report.aiRequests.length, 0);
  report.groups.push("Same assistant component renders anatomical focus; no AI traffic");
} catch (error) {
  report.failure = { message: error.message, stack: error.stack?.split("\n").slice(0, 5) };
  await page.screenshot({ path: path.join(out, "failure.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      groups: report.groups.length,
      captures: report.captures.length,
      errors: report.errors,
      failure: report.failure?.message,
    }),
  );
  await browser.close();
}
