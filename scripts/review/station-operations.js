// Embedded in a private CLI callback with fresh isolated-review metadata.
function check(value, message) {
  if (!value) throw new Error(message);
}
async function group(name, session, run) {
  if (selected && !selected.includes(name)) return;
  const context = await browser.newContext({
    storageState: `${sessions}/station4-${session}.json`,
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const p = await context.newPage();
  p.setDefaultTimeout(12000);
  p.on("pageerror", (error) => exceptions.push({ group: name, message: error.message }));
  try {
    await run(p, context);
    results.push({ group: name, status: "passed" });
  } catch (error) {
    results.push({ group: name, status: "failed", error: String(error) });
    await p.screenshot({ path: `${dir}/${name}-failure.png`, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}
async function post(context, path, body, expected = 200) {
  const csrf = await (await context.request.get(`${root}/api/backend/auth/csrf`)).json();
  const response = await context.request.post(`${root}/api/backend/stations/${path}`, {
    data: body,
    headers: { "X-CSRF-Token": csrf.csrfToken, Origin: root, Referer: root + "/station" },
  });
  const value = await response.json();
  check(
    response.status() === expected,
    `Native ${path} returned ${response.status()}: ${JSON.stringify(value)}`,
  );
  return value;
}
async function manage(context, body) {
  return post(context, "kiosk/manage", {
    organization_id: meta.organization,
    branch_id: meta.branch,
    ...body,
  });
}
async function stage(context, id, target, extra = {}) {
  const snapshot = await manage(context, { action: "snapshot" });
  const row = snapshot.tickets.find((ticket) => ticket.id === id);
  check(row, "Fixture ticket missing");
  return manage(context, {
    action: "stage",
    stage_id: id,
    target,
    expected_version: row.version,
    ...extra,
  });
}
async function choose(p, scope, label, name) {
  await scope.getByLabel(label, { exact: true }).click();
  const option = name
    ? p.getByRole("option", { name, exact: true })
    : p.getByRole("option").first();
  await option.click();
}
async function openTicket(p, item) {
  await p.goto(`${root}/clinic/stations?organization=${meta.organization}`);
  await p.getByRole("heading", { name: "Patient Stations & departments", exact: true }).waitFor();
  await choose(p, p, "Department", meta.lab_name);
  await p.getByRole("button", { name: `View ${meta.lab_name} queue`, exact: true }).click();
  await p.getByRole("button", { name: `Manage ${item.label}`, exact: true }).click();
  return p.getByRole("dialog");
}
await group("display-public-live", "display", async (p) => {
  const staff = await browser.newContext({ storageState: `${sessions}/station4-staff.json` });
  try {
    await p.addInitScript(() => {
      window.reviewSpeech = [];
      window.speechSynthesis.speak = (utterance) => window.reviewSpeech.push(utterance.text);
    });
    await p.goto(`${root}/station/display`);
    const serving = p.getByRole("region", { name: "Now serving", exact: true });
    await serving.getByText(meta.due.label, { exact: true }).waitFor();
    check(
      !(await p.locator("body").innerText()).includes(meta.due.patient_name),
      "Patient name leaked into TV",
    );
    await p.getByRole("region", { name: "Clinic announcements", exact: true }).waitFor();
    for (const width of [1920, 1024, 390]) {
      await p.setViewportSize({ width, height: 1080 });
      check(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `Display overflow at ${width}`,
      );
      await p.screenshot({ path: `${dir}/display-${width}.png`, fullPage: true });
    }
    await p.getByRole("button", { name: "Enable sound", exact: true }).click();
    await p.getByRole("switch", { name: "Speak queue numbers", exact: true }).check();
    check((await p.evaluate(() => window.reviewSpeech)).length === 0, "Initial calls replayed");
    await stage(staff, meta.due.stage, "called");
    await p.waitForFunction(() => window.reviewSpeech.length === 1, null, { timeout: 11000 });
    const spoken = await p.evaluate(() => window.reviewSpeech[0]);
    check(
      spoken.includes(meta.due.label) && !spoken.includes(meta.due.patient_name),
      "Spoken call is not public-only",
    );
    await stage(staff, meta.waiting.stage, "called");
    await serving.getByText(meta.waiting.label, { exact: true }).waitFor();
    await stage(staff, meta.waiting.stage, "skipped", {
      reason: "Synthetic patient temporarily away",
    });
    await serving.getByText(meta.waiting.label, { exact: true }).waitFor({ state: "hidden" });
  } finally {
    await staff.close();
  }
});
await group("payment-transfer-ticket", "staff", async (p, context) => {
  let dialog = await openTicket(p, meta.due);
  await choose(p, dialog, "Issued invoice");
  await dialog.getByRole("button", { name: "Link invoice", exact: true }).click();
  await dialog
    .getByText("Cashier confirmation is needed for the amount due through today.", { exact: true })
    .waitFor();
  await choose(p, dialog, "Queue action", "in service");
  await dialog.getByRole("button", { name: "Confirm action", exact: true }).click();
  await p.getByRole("alert").filter({ hasText: "Cashier confirmation" }).waitFor();
  check(await dialog.isVisible(), "Denied action lost the ticket");
  await choose(p, dialog, "Queue action", "transfer");
  await choose(p, dialog, "Transfer to", meta.cashier_name);
  await dialog
    .getByLabel("Operational reason", { exact: true })
    .fill("Review current amount due at cashier");
  const before = await manage(context, { action: "snapshot" });
  await dialog.getByRole("button", { name: "Confirm action", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const after = await manage(context, { action: "snapshot" });
  const old = before.tickets.find((row) => row.id === meta.due.stage);
  const next = after.tickets.find(
    (row) => row.visit_id === old.visit_id && row.status === "waiting",
  );
  check(next?.department_id === meta.cashier, "Cashier transfer did not preserve the visit");
  dialog = await openTicket(p, meta.future);
  await choose(p, dialog, "Issued invoice");
  await dialog.getByRole("button", { name: "Link invoice", exact: true }).click();
  await dialog
    .getByText("Nothing is due through today. Future installments remain scheduled.", {
      exact: true,
    })
    .waitFor();
  await dialog.getByRole("button", { name: "Print service ticket", exact: true }).click();
  const print = p.frameLocator("iframe[data-service-ticket-print]");
  await print.getByText(meta.future.label, { exact: true }).waitFor({ state: "attached" });
  const printed = await print.locator("body").innerText();
  check(
    !printed.includes(meta.future.patient_name) && !printed.includes("60000"),
    "Parent patient/financial content leaked into ticket",
  );
  const ticketPage = await context.newPage();
  await ticketPage.setContent(await print.locator("html").innerHTML());
  await ticketPage.pdf({ path: `${dir}/service-ticket.pdf`, width: "80mm", height: "150mm" });
  await ticketPage.close();
  await choose(p, dialog, "Queue action", "in service");
  await dialog.getByRole("button", { name: "Confirm action", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const current = await manage(context, { action: "snapshot" });
  check(
    current.tickets.find((row) => row.id === meta.future.stage).status === "in_service",
    "Future principal incorrectly blocked service",
  );
  await p
    .getByLabel("Announcement 2", { exact: true })
    .fill("Please follow the counter instructions.");
  await p.getByRole("button", { name: "Save display notices", exact: true }).click();
  await p.getByText("Display notices saved.", { exact: true }).waitFor();
  await p.screenshot({ path: `${dir}/patient-stations.png`, fullPage: true });
});
await group("pairing-current-code", "staff", async (p, context) => {
  await p.goto(`${root}/clinic/settings/stations?organization=${meta.organization}`);
  await p.getByRole("button", { name: `Pairing code for ${meta.setup_name}`, exact: true }).click();
  let dialog = p.getByRole("dialog", { name: "Pairing code", exact: true });
  await dialog.getByRole("button", { name: "Generate code", exact: true }).click();
  await p
    .getByRole("alertdialog")
    .getByRole("button", { name: "Generate new code", exact: true })
    .click();
  const code = dialog.getByRole("region", { name: "Temporary access code", exact: true });
  await code.waitFor();
  const first = await code.locator("p[aria-label^='Code ']").getAttribute("aria-label");
  check(
    (await code.locator("p[aria-label^='Code '] > span").count()) === 8,
    "Not one box per character",
  );
  await code.getByRole("button", { name: "Copy code", exact: true }).click();
  check(
    (await p.evaluate(() => navigator.clipboard.readText())) === first.slice(5),
    "Clipboard mismatch",
  );
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await p.getByRole("button", { name: `Pairing code for ${meta.setup_name}`, exact: true }).click();
  await code.waitFor();
  check(
    (await code.locator("p[aria-label^='Code ']").getAttribute("aria-label")) === first,
    "Reopening replaced the existing code",
  );
  await p.reload();
  await p.getByRole("button", { name: `Pairing code for ${meta.setup_name}`, exact: true }).click();
  await code.waitFor();
  check(
    (await code.locator("p[aria-label^='Code ']").getAttribute("aria-label")) === first,
    "Reload lost the existing code",
  );
  await dialog.getByRole("button", { name: "Regenerate code", exact: true }).click();
  await p
    .getByRole("alertdialog")
    .getByRole("button", { name: "Generate new code", exact: true })
    .click();
  await p.waitForFunction(
    (old) => document.querySelector("p[aria-label^='Code ']")?.getAttribute("aria-label") !== old,
    first,
  );
  await code.waitFor();
  const replacement = (
    await code.locator("p[aria-label^='Code ']").getAttribute("aria-label")
  ).slice(5);
  const receiver = await browser.newContext();
  try {
    await post(receiver, "pair", { code: replacement });
  } finally {
    await receiver.close();
  }
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await p.getByRole("button", { name: `Pairing code for ${meta.setup_name}`, exact: true }).click();
  await dialog.getByText("Ready for your approval", { exact: true }).waitFor();
  check(
    (await dialog.getByRole("region", { name: "Temporary access code", exact: true }).count()) ===
      0,
    "Consumed code remained visible",
  );
  await p.screenshot({ path: `${dir}/pairing-consumed.png`, fullPage: true });
});
await group("display-stale-revocation", "display", async (p) => {
  await p.goto(`${root}/station/display`);
  await p.getByRole("region", { name: "Now serving", exact: true }).waitFor();
  await p.route("**/api/backend/stations/display", (route) => route.abort());
  await p
    .getByText("Connection interrupted · updates paused", { exact: true })
    .waitFor({ timeout: 24000 });
  await p
    .getByRole("heading", { name: "Queue updates are unavailable", exact: true })
    .waitFor({ timeout: 35000 });
  check(
    (await p.getByRole("region", { name: "Now serving", exact: true }).count()) === 0,
    "Stale calls remained visible",
  );
  await p.screenshot({ path: `${dir}/display-stale.png`, fullPage: true });
  await p.unroute("**/api/backend/stations/display");
  await p.getByRole("region", { name: "Now serving", exact: true }).waitFor();
  const staff = await browser.newContext({ storageState: `${sessions}/station4-staff.json` });
  try {
    const list = await post(staff, "manage", {
      organization_id: meta.organization,
      action: "list",
    });
    const device = list.devices.find((row) => row.id === meta.display_device);
    await post(staff, "manage", {
      organization_id: meta.organization,
      device_id: device.id,
      action: "revoke",
      expected_version: device.version,
    });
  } finally {
    await staff.close();
  }
  await p
    .getByRole("heading", { name: "This display needs clinic approval", exact: true })
    .waitFor();
  check(
    (await p.getByRole("region", { name: "Now serving", exact: true }).count()) === 0,
    "Revoked display retained queue content",
  );
});
