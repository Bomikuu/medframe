// Embedded in the Playwright CLI callback by build_workflow_run.py.
function check(condition, message) {
  if (!condition) throw new Error(message);
}
async function saveDownload(page, click, filename) {
  // Attach the listener before triggering the download. Inspect the saved file
  // with inspect_downloads.py; attachment response.text() is not a valid check.
  const pending = page.waitForEvent("download");
  await click();
  const download = await pending;
  check(!(await download.failure()), "Download failed");
  await download.saveAs(`${dir}/${filename}`);
}
async function group(name, session, run) {
  const ctx = await browser.newContext({
    storageState: `${sessions}/improvements12-${session}.json`,
    viewport: { width: 1440, height: 1000 },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  p.on("pageerror", (error) => exceptions.push({ group: name, message: error.message }));
  try {
    await run(p);
    results.push({ group: name, status: "passed" });
  } catch (error) {
    results.push({ group: name, status: "failed", error: String(error) });
    await p.screenshot({ path: `${dir}/${name}-failure.png`, fullPage: true }).catch(() => {});
  } finally {
    await ctx.close();
  }
}
async function captureWidths(p, name) {
  for (const width of [1440, 1024, 390]) {
    await p.setViewportSize({ width, height: 1000 });
    check(
      await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${name} document overflow at ${width}`,
    );
    await p.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
  }
}
async function openCase(p, key, financial = true) {
  await p.goto(`${root}/clinic/services?organization=${meta.organization}`);
  await p.getByRole("tab", { name: "Patient services", exact: true }).click();
  await p
    .getByRole("searchbox", { name: "Search patient services", exact: true })
    .fill(meta.scenarios[key].name);
  await p
    .locator("article")
    .filter({ hasText: meta.scenarios[key].name })
    .getByRole("button", { name: "Open service", exact: true })
    .click();
  await p.getByRole("dialog", { name: "Patient service", exact: true }).waitFor();
  const region = p.getByRole("region", { name: "Service payments", exact: true });
  if (financial) await region.waitFor();
  return region;
}
async function metric(region, label, amount) {
  await region
    .locator("dl > div")
    .filter({ hasText: label })
    .locator("dd")
    .filter({ hasText: amount })
    .waitFor();
}
