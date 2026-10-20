// Independent groups intentionally continue after a failed assertion.
await group("aggregate-download", "staff", async (p) => {
  await p.goto(`${root}/clinic/analytics?organization=${meta.organization}`);
  await p.getByRole("region", { name: "Financial overview", exact: true }).waitFor();
  await saveDownload(
    p,
    () => p.getByRole("button", { name: "Export report CSV", exact: true }).click(),
    "aggregate-report.csv",
  );
});
await group("specialty-guidance", "staff", async (p) => {
  await p.goto(`${root}/clinic/settings/specialties?organization=${meta.organization}`);
  for (const name of ["Pediatrics", "Dermatology", "Orthopedics"]) {
    const toggle = p.getByRole("switch", { name, exact: true });
    await toggle.waitFor();
    if ((await toggle.getAttribute("data-state")) !== "checked") await toggle.click();
  }
  await p.getByRole("button", { name: "Save specialties", exact: true }).click();
  await p.getByRole("status").filter({ hasText: "Specialties saved" }).waitFor();
  await p.goto(`${root}/clinic/settings/templates?organization=${meta.organization}`);
  await p.getByRole("button", { name: "Use pediatrics", exact: true }).click();
  await p.getByRole("textbox", { name: "Template name", exact: true }).fill(meta.template_name);
  await p
    .getByRole("textbox", { name: "Subjective prompt", exact: true })
    .fill("Synthetic guidance: record the patient's own account.");
  await p.getByRole("button", { name: "Save template version", exact: true }).click();
  await p.getByRole("status").filter({ hasText: "Template version saved." }).waitFor();
  await p.goto(`${root}/clinic/consultations/${meta.encounter}?organization=${meta.organization}`);
  await p.getByRole("button", { name: "Clinical notes", exact: true }).click();
  const subjective = p.getByRole("textbox", { name: "Subjective", exact: true });
  await subjective.waitFor();
  const before = await subjective.inputValue();
  await p.getByText("Consultation template & prompts", { exact: true }).click();
  await p.getByText("Consultation guidance", { exact: true }).click();
  await p.getByRole("combobox", { name: "Clinic template", exact: true }).click();
  await p.getByRole("option", { name: `${meta.template_name} · version 1`, exact: true }).click();
  await p.getByRole("button", { name: "Save draft and apply guidance", exact: true }).click();
  await p.getByRole("complementary", { name: "Template guidance", exact: true }).waitFor();
  check((await subjective.inputValue()) === before, "Applying guidance replaced SOAP");
  await p.screenshot({ path: `${dir}/applied-guidance.png`, fullPage: true });
});
await group("historical-export-revocation", "staff", async (p) => {
  await p.goto(
    `${root}/clinic/consultations/${meta.encounter}?organization=${meta.organization}&revision=${meta.revision}`,
  );
  await p.getByRole("button", { name: "Clinical notes", exact: true }).click();
  await p.getByRole("button", { name: "Export record", exact: true }).click();
  const dialog = p.getByRole("dialog", { name: "Export record", exact: true });
  const reviewed = dialog.getByRole("region", { name: "Reviewed export", exact: true });
  await dialog.getByRole("button", { name: "Review selected revision", exact: true }).click();
  await reviewed.waitFor();
  await dialog
    .getByRole("switch", { name: "Dental findings and saved chart", exact: true })
    .click();
  check((await reviewed.count()) === 0, "Selection retained a stale export review");
  await dialog
    .getByRole("switch", { name: "Dental findings and saved chart", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Review selected revision", exact: true }).click();
  await reviewed.waitFor();
  await dialog.getByRole("switch", { name: "Confirm local download", exact: true }).click();
  await saveDownload(
    p,
    () => dialog.getByRole("button", { name: "Download JSON", exact: true }).click(),
    "clinical-export.json",
  );
  const revoked = await p.evaluate(async (meta) => {
    const token = (await (await fetch("/api/backend/auth/csrf")).json()).csrfToken;
    return (
      await fetch("/api/backend/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({
          query:
            "mutation Revoke($org:UUID!,$patient:UUID!,$member:UUID!){setPatientAccess(organizationId:$org,patientId:$patient,membershipId:$member,active:false){active}}",
          variables: { org: meta.organization, patient: meta.patient, member: meta.membership },
        }),
      })
    ).json();
  }, meta);
  check(revoked.data?.setPatientAccess.active === false, "Synthetic grant revocation failed");
  const denied = p.waitForResponse((r) => r.url().endsWith("/interoperability/download"));
  await dialog.getByRole("button", { name: "Download JSON", exact: true }).click();
  check((await denied).status() === 404, "Revoked export was not denied");
  await dialog.getByRole("alert").waitFor();
});
await group("service-draft-uninvoiced-void", "staff", async (p) => {
  let panel = await openCase(p, "draft");
  await panel.getByText(/Proposed total/).waitFor();
  await panel.getByRole("link", { name: "Review invoice", exact: true }).waitFor();
  check(
    (await panel.innerText()).includes("This draft has no payments due"),
    "Draft claims payments due",
  );
  panel = await openCase(p, "no_invoice");
  await panel.getByText(/No invoice has been prepared/).waitFor();
  await panel.getByRole("button", { name: "Prepare service invoice", exact: true }).waitFor();
  await p.goto(
    `${root}/clinic/billing/${meta.scenarios.void.invoice}?organization=${meta.organization}`,
  );
  const schedule = p.getByRole("region", { name: "Installment schedule", exact: true });
  await schedule.getByText(/This invoice is voided/).waitFor();
  check(
    (await schedule.getByRole("cell", { name: "Voided", exact: true }).count()) === 25,
    "Void schedule was not retained",
  );
  check(
    (await p.getByRole("button", { name: "Record payment", exact: true }).count()) === 0,
    "Void payment entry exposed",
  );
});
await group("payment-review-and-settlement", "staff", async (p) => {
  const panel = await openCase(p, "partial");
  await metric(panel, "Due through today", "7,000");
  await panel.getByRole("link", { name: "Manage payments", exact: true }).click();
  await p.getByRole("button", { name: "Record payment", exact: true }).click();
  const dialog = p.getByRole("dialog", { name: "Record payment", exact: true });
  const review = dialog.getByRole("region", { name: "Payment review", exact: true });
  await review.getByText(/Next unpaid:/).waitFor();
  check(
    (await dialog.getByRole("textbox", { name: "Amount (PHP)", exact: true }).inputValue()) ===
      "7000.00",
    "Suggested payment changed",
  );
  await review.getByText(/48,000/).waitFor();
  await captureWidths(p, "payment-review");
  await dialog.locator("#financial-confirm-payment").click();
  await dialog.getByRole("button", { name: "Record payment", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const schedule = p.getByRole("region", { name: "Installment schedule", exact: true });
  await schedule.getByRole("button", { name: "Settled (1)", exact: true }).click();
  await schedule.getByText("Down payment", { exact: true }).waitFor();
  await schedule.getByRole("button", { name: "Upcoming (24)", exact: true }).click();
  check((await schedule.locator("tbody tr").count()) === 24, "Upcoming schedule changed");
});
await group("long-history-refund-confirmation", "staff", async (p) => {
  await p.goto(
    `${root}/clinic/billing/${meta.scenarios.long_history.invoice}?organization=${meta.organization}`,
  );
  const payments = p
    .locator("section")
    .filter({ has: p.getByRole("heading", { name: "Recorded payments", exact: true }) });
  await payments.getByRole("button", { name: "View confirmation", exact: true }).first().waitFor();
  check((await payments.locator("ol > li").count()) === 20, "Initial payment page is not bounded");
  await payments.getByRole("button", { name: "Older records", exact: true }).click();
  await payments.getByText(/5,000/).waitFor();
  check((await payments.locator("ol > li").count()) === 4, "Older payment page count");
  await captureWidths(p, "invoice-history");
  await p.getByRole("button", { name: "Record refund", exact: true }).click();
  const refund = p.getByRole("dialog", { name: "Record refund", exact: true });
  await refund.getByRole("button", { name: "Older records", exact: true }).click();
  await refund.getByRole("combobox", { name: "Original payment", exact: true }).click();
  await p.getByRole("option").filter({ hasText: "PHP 5000.00" }).click();
  await refund.getByRole("textbox", { name: "Amount (PHP)", exact: true }).fill("1000");
  await refund
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Synthetic already returned payment");
  await refund.locator("#financial-confirm-refund").click();
  await refund.getByRole("button", { name: "Record refund", exact: true }).click();
  await refund.waitFor({ state: "hidden" });
  await payments.getByRole("button", { name: "Older records", exact: true }).click();
  const original = payments.locator("ol > li").filter({ hasText: /5,000/ });
  await original.getByRole("button", { name: "View confirmation", exact: true }).click();
  const confirmation = p.getByRole("dialog", { name: "Payment confirmation", exact: true });
  await confirmation.getByText("Amount retained", { exact: true }).waitFor();
  check((await confirmation.innerText()).includes("4,000"), "Refund missing from confirmation");
  await p.emulateMedia({ media: "print" });
  await p.pdf({ path: `${dir}/payment-confirmation.pdf`, format: "A4", printBackground: true });
  await p.emulateMedia({ media: "screen" });
  await p.screenshot({ path: `${dir}/payment-confirmation.png`, fullPage: true });
});
await group("workflow-reader-exclusion", "financial-reader", async (p) => {
  let billReads = 0;
  p.on("request", (r) => {
    if ((r.postData() || "").includes("query BillingInvoice(")) billReads++;
  });
  const panel = await openCase(p, "partial", false);
  check((await panel.count()) === 0, "Financial content exposed to workflow-only role");
  check(billReads === 0, "Unauthorized billing request issued");
});
await group("operations-reader-exclusion", "operations", async (p) => {
  await p.goto(`${root}/clinic/analytics?organization=${meta.organization}`);
  await p.getByRole("region", { name: "Clinic operations", exact: true }).waitFor();
  check(
    (await p.getByRole("region", { name: "Accessible clinical workload", exact: true }).count()) ===
      0,
    "Clinical workload leaked",
  );
  await p.goto(
    `${root}/clinic/consultations/${meta.encounter}?organization=${meta.organization}&revision=${meta.revision}`,
  );
  await p.getByRole("alert").waitFor();
  check(
    (await p.getByRole("button", { name: "Export record", exact: true }).count()) === 0,
    "Reader export exposed",
  );
});
await group("portal-statement-confirmation", "patient", async (p) => {
  await p.setViewportSize({ width: 390, height: 1000 });
  await p.goto(
    `${root}/portal/billing?link=${meta.link}&invoice=${meta.scenarios.partial.invoice}`,
  );
  await p.getByRole("region", { name: "Installment schedule", exact: true }).waitFor();
  check(
    (await p.getByRole("button", { name: "Record payment", exact: true }).count()) === 0,
    "Portal mutation exposed",
  );
  await p.getByRole("button", { name: "View confirmation", exact: true }).first().click();
  await p
    .getByRole("dialog", { name: "Payment confirmation", exact: true })
    .getByText("Source payment:", { exact: false })
    .waitFor();
  check(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "Portal phone overflow",
  );
  await p.screenshot({ path: `${dir}/portal-confirmation-phone.png`, fullPage: true });
});
