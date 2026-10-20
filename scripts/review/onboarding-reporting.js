// Independent groups against fresh isolated-review state; no hidden retries.
function check(value, message) {
  if (!value) throw new Error(message);
}
async function group(name, session, run) {
  if (selected && !selected.includes(name)) return;
  const ctx = await browser.newContext({
    ...(session ? { storageState: `${sessions}/phase5-${session}.json` } : {}),
    viewport: { width: 1440, height: 1000 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  p.on("pageerror", (error) => exceptions.push({ group: name, message: error.message }));
  try {
    await run(p, ctx);
    results.push({ group: name, status: "passed" });
  } catch (error) {
    results.push({ group: name, status: "failed", error: String(error) });
    await p.screenshot({ path: `${dir}/${name}-failure.png`, fullPage: true }).catch(() => {});
  } finally {
    await ctx.close();
  }
}
async function widths(p, name) {
  for (const width of [1440, 1024, 390]) {
    await p.setViewportSize({ width, height: 1000 });
    check(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${name} overflow at ${width}`,
    );
    await p.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
  }
}
async function choose(p, label, name) {
  await p.getByRole("combobox", { name: label, exact: true }).click();
  await p.getByRole("option", { name, exact: true }).click();
}
await group("setup-review", "review", async (p) => {
  await p.goto(`${root}/onboarding/setup`);
  await p.getByRole("heading", { name: "Review & confirm", exact: true }).waitFor();
  await p.getByText("20+ providers", { exact: true }).waitFor();
  await p.getByText("Monday, Wednesday, Friday", { exact: true }).waitFor();
  const name = p.locator("dd").filter({ hasText: meta.review.administrator });
  await name.waitFor();
  check(
    (await name.evaluate((node) => getComputedStyle(node).textTransform)) === "none",
    "Account name is transformed",
  );
  const email = p.getByText(meta.review.email, { exact: true });
  await email.waitFor();
  check(
    (await email.evaluate((node) => getComputedStyle(node).textTransform)) === "none",
    "Email is transformed",
  );
  await p
    .getByRole("region", { name: "Live clinic workspace preview", exact: true })
    .getByText(meta.review.name, { exact: true })
    .waitFor();
  await widths(p, "setup-review");
  await p.getByRole("button", { name: "Edit Clinical capabilities", exact: true }).click();
  await p.getByRole("heading", { name: "Medical specialties", exact: true }).waitFor();
  await p
    .getByRole("combobox", { name: "How many doctors or dentists work here?", exact: true })
    .waitFor();
});
await group("first-run-dashboard", "first-run", async (p) => {
  const home = `${root}/clinic?organization=${meta["first-run"].organization}`;
  await p.goto(home);
  const checklist = p.getByRole("region", { name: "New clinic setup checklist", exact: true });
  await checklist.waitFor();
  await checklist
    .getByRole("heading", { name: `Welcome to ${meta["first-run"].name}`, exact: true })
    .waitFor();
  check(
    (await p.getByRole("region", { name: "Financial overview", exact: true }).count()) === 0,
    "First-run dashboard duplicates empty financial widgets",
  );
  await widths(p, "first-run");
  await checklist.getByRole("link", { name: "Register patient", exact: true }).click();
  await p.waitForURL(/\/clinic\/patients\/new/);
  await p.goto(home);
  await checklist.getByRole("button", { name: "Dismiss setup checklist", exact: true }).click();
  await checklist.waitFor({ state: "hidden" });
  await p.getByRole("region", { name: "Financial overview", exact: true }).waitFor();
});
await group("specialty-template-discovery", "staff", async (p) => {
  const templates = `${root}/clinic/settings/templates?organization=${meta.organization}`;
  await p.goto(templates);
  await p.getByRole("button", { name: "Use Pediatrics", exact: true }).click();
  await p.getByLabel("Template name", { exact: true }).fill(meta.template_name);
  await p.getByText("Unsaved template changes", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Save template version", exact: true }).click();
  await p.getByText("Template version saved.", { exact: true }).waitFor();
  const row = p
    .getByRole("region", { name: "Saved templates", exact: true })
    .locator("li")
    .filter({ hasText: meta.template_name });
  await row.getByText("Active · Enabled for new templates", { exact: true }).waitFor();
  await p.getByLabel("Template name", { exact: true }).fill("Unsaved synthetic name");
  await p.getByRole("button", { name: "Discard changes", exact: true }).click();
  await p
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  check(
    (await p.getByLabel("Template name", { exact: true }).inputValue()) === meta.template_name,
    "Discard lost the last saved template",
  );
  await widths(p, "templates");
  await p.goto(`${root}/clinic/settings/specialties?organization=${meta.organization}`);
  await p.getByRole("switch", { name: "Pediatrics", exact: true }).uncheck();
  await p.getByText("Unsaved selections", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Save specialties", exact: true }).click();
  await p.getByRole("status").filter({ hasText: "Specialties saved" }).waitFor();
  await p.goto(templates);
  await p.getByRole("heading", { name: "Start with standard guidance", exact: true }).waitFor();
  await row.getByText("Active · Existing templates only", { exact: true }).waitFor();
  await p.screenshot({ path: `${dir}/generic-guidance.png`, fullPage: true });
});
await group("report-periods-download", "staff", async (p) => {
  await p.goto(`${root}/clinic/analytics?organization=${meta.organization}`);
  await p.getByRole("region", { name: "Report period and snapshot", exact: true }).waitFor();
  await choose(p, "Comparison period", "Last 7 completed days");
  const snapshot = p.getByRole("region", { name: "Current balance snapshot", exact: true });
  await snapshot.getByText("Due through today", { exact: true }).waitFor();
  await snapshot.getByText("Scheduled for later", { exact: true }).waitFor();
  await p.getByText("View exact daily counts", { exact: true }).first().click();
  await widths(p, "analytics");
  const pending = p.waitForEvent("download");
  await p.getByRole("button", { name: "Export report CSV", exact: true }).click();
  const file = await pending;
  check(!(await file.failure()), "CSV download failed");
  await file.saveAs(`${dir}/analytics.csv`);
});
await group("public-host-metadata", null, async (p, ctx) => {
  function values(html) {
    return {
      canonical: html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1],
      og: html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/)?.[1],
      business: JSON.parse(
        html.match(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)?.[1] ?? "null",
      )?.url,
    };
  }
  const expected = `https://${meta.website.host}/`;
  const custom = await ctx.request.get(root, { headers: { Host: meta.website.host } });
  check(custom.status() === 200, "Verified-state host did not resolve");
  const urls = values(await custom.text());
  check(
    urls.canonical === expected && urls.og === expected && urls.business === expected,
    "Host metadata URLs disagree",
  );
  const forged = await ctx.request.get(`${root}/clinics/${meta.website.slug}`, {
    headers: { "x-medframe-site-host": "untrusted.synthetic.example" },
  });
  const app = values(await forged.text());
  check(
    app.canonical === `${root}/clinics/${meta.website.slug}` && app.business === app.canonical,
    "Untrusted host header was honored",
  );
  for (const path of ["/login", "/clinic", "/api/backend/auth/session"]) {
    const response = await ctx.request.get(root + path, { headers: { Host: meta.website.host } });
    check(response.status() === 404, `Private path ${path} exposed on custom host`);
  }
  const unknown = await ctx.request.get(root, {
    headers: { Host: "unverified.synthetic.example" },
  });
  check(unknown.status() >= 400, "Unverified hostname exposed a website");
  const robots = await ctx.request.get(root + "/robots.txt", {
    headers: { Host: meta.website.host },
  });
  check(
    (await robots.text()).includes(`https://${meta.website.host}/sitemap.xml`),
    "Robots sitemap uses a different host",
  );
  const sitemap = await ctx.request.get(root + "/sitemap.xml", {
    headers: { Host: meta.website.host },
  });
  check((await sitemap.text()).includes(`<loc>${expected}</loc>`), "Sitemap canonical differs");
  await p.goto(`${root}/clinics/${meta.website.slug}`);
  await p.getByRole("heading", { name: "Synthetic clinic introduction", exact: true }).waitFor();
  await p.screenshot({ path: `${dir}/public-clinic.png`, fullPage: true });
});

await group("generic-guidance", "staff", async (p) => {
  await p.goto(`${root}/clinic/settings/specialties?organization=${meta.organization}`);
  for (const name of ["Pediatrics", "Dermatology", "Orthopedics"]) {
    const control = p.getByRole("switch", { name, exact: true });
    if (await control.isChecked()) await control.uncheck();
  }
  const save = p.getByRole("button", { name: "Save specialties", exact: true });
  if (await save.isEnabled()) {
    await save.click();
    await p.getByRole("status").filter({ hasText: "Specialties saved" }).waitFor();
  }
  await p.goto(`${root}/clinic/settings/templates?organization=${meta.organization}`);
  await p.getByRole("heading", { name: "Start with standard guidance", exact: true }).waitFor();
  const row = p
    .getByRole("region", { name: "Saved templates", exact: true })
    .locator("li")
    .filter({ hasText: meta.template_name });
  await row.getByText("Active · Existing templates only", { exact: true }).waitFor();
  await p.screenshot({ path: `${dir}/generic-guidance.png`, fullPage: true });
});
await group("custom-report-dates", "staff", async (p) => {
  await p.goto(`${root}/clinic/analytics?organization=${meta.organization}`);
  await p.getByRole("region", { name: "Report period and snapshot", exact: true }).waitFor();
  await choose(p, "Comparison period", "Custom dates");
  await p.getByLabel("From date", { exact: true }).fill("2026-10-10");
  await p.getByLabel("Through date", { exact: true }).fill("2026-10-14");
  check(
    await p.getByRole("button", { name: "Export report CSV", exact: true }).isDisabled(),
    "Unapplied dates can be exported",
  );
  const report = p.waitForResponse(
    (response) =>
      response.url().endsWith("/api/backend/graphql") &&
      (response.request().postData() ?? "").includes("clinicInsights") &&
      (response.request().postData() ?? "").includes("2026-10-10"),
  );
  await p.getByRole("button", { name: "Apply custom dates", exact: true }).click();
  const result = await (await report).json();
  check(
    result.data?.clinicInsights?.days === 5 &&
      result.data.clinicInsights.current_to === "2026-10-14" &&
      result.data.clinicInsights.previous_from === "2026-10-05",
    "Custom calendar comparison differs",
  );
  await p
    .getByRole("region", { name: "Report period and snapshot", exact: true })
    .getByText("Oct 10, 2026 – Oct 14, 2026", { exact: true })
    .waitFor();
  await p.getByRole("region", { name: "Current balance snapshot", exact: true }).waitFor();
  const pending = p.waitForEvent("download");
  await p.getByRole("button", { name: "Export report CSV", exact: true }).click();
  const file = await pending;
  check(!(await file.failure()), "Custom CSV download failed");
  await file.saveAs(`${dir}/custom-analytics.csv`);
  await p.getByLabel("Through date", { exact: true }).fill("2026-10-09");
  await p.getByRole("button", { name: "Apply custom dates", exact: true }).click();
  await p.getByRole("alert").filter({ hasText: "1–366 completed clinic days" }).waitFor();
  await widths(p, "custom-report");
});
