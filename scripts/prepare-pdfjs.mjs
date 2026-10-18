import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "apps/web/package.json"));
const manifest = require.resolve("pdfjs-dist/package.json");
const distribution = dirname(manifest);
const { version } = JSON.parse(await readFile(manifest, "utf8"));
if (version !== "6.4.299")
  throw new Error("Update the private preview and its matching PDF.js worker together.");
const target = resolve(root, "apps/web/public/vendor/pdfjs");
await mkdir(target, { recursive: true });
await cp(
  resolve(distribution, "build/pdf.worker.min.mjs"),
  resolve(target, `pdf.worker-${version}.min.mjs`),
);
for (const resource of ["LICENSE", "standard_fonts", "cmaps"]) {
  await cp(resolve(distribution, resource), resolve(target, resource), { recursive: true });
}
console.log(`Prepared matching local PDF.js ${version} resources.`);
