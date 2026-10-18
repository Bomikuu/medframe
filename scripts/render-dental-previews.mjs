import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "apps/web/public/models/dental-previews");
const source = path.join(root, "apps/web/public/models/dental-permanent-dundee-v1.glb");
const html = `<!doctype html><html><head><style>body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1); renderer.setClearColor(0xffffff,0);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff,0xa7adb5,2));
const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(3,5,5);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(-3,-3,-3);scene.add(fill);
const model=await new GLTFLoader().loadAsync('/model.glb');scene.add(model.scene);model.scene.updateMatrixWorld(true);
const teeth=[];model.scene.traverse(mesh=>{if(mesh.isMesh){teeth.push(mesh);const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const material of materials)material.roughness=Math.max(.45,material.roughness);}});
window.renderPreview=({tooth,view,width,height})=>{
 for(const mesh of teeth)mesh.visible=tooth?mesh.userData.tooth_id===tooth:view==='upper'?mesh.userData.jaw==='upper':view==='lower'?mesh.userData.jaw==='lower':true;
 const bounds=new THREE.Box3();for(const mesh of teeth)if(mesh.visible)bounds.union(new THREE.Box3().setFromObject(mesh));
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const directions={front:[0,0,1],upper:[0,-1,0],lower:[0,1,0],left:[1,0,0],right:[-1,0,0]};
 const top=view==='upper'||view==='lower',lateral=view==='left'||view==='right';
 const vertical=top?size.z:size.y,horizontal=lateral?size.z:size.x;
 const fit=Math.max(vertical,horizontal*height/width)*1.14;
 const camera=new THREE.OrthographicCamera(-fit*width/height/2,fit*width/height/2,fit/2,-fit/2,.001,100000);
 camera.position.copy(center).addScaledVector(new THREE.Vector3(...directions[view]),Math.max(1,size.length()*3));
 camera.up.set(0,top?0:1,top?1:0);camera.lookAt(center);camera.updateProjectionMatrix();
 renderer.setSize(width,height);renderer.render(scene,camera);
};
window.previewsReady=true;
</script></body></html>`;

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/") {
      response.setHeader("Content-Type", "text/html");
      response.end(html);
      return;
    }
    let file;
    if (url.pathname === "/model.glb") file = source;
    else if (url.pathname.startsWith("/three/")) {
      const moduleRoot = path.join(root, "node_modules/three");
      file = path.resolve(moduleRoot, url.pathname.slice(7));
      if (!file.startsWith(moduleRoot + path.sep)) throw new Error("Invalid module path");
    } else throw new Error("Unknown path");
    response.setHeader(
      "Content-Type",
      file.endsWith(".js") ? "text/javascript" : "model/gltf-binary",
    );
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
const entries = [];
try {
  await fs.mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 280 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.previewsReady, { timeout: 30000 });
  for (let quadrant = 1; quadrant <= 4; quadrant++) {
    for (let tooth = 1; tooth <= 8; tooth++) {
      const id = `${quadrant}${tooth}`;
      await page.evaluate(
        (tooth) => window.renderPreview({ tooth, view: "front", width: 192, height: 224 }),
        id,
      );
      const file = `tooth-${id}.png`;
      await page
        .locator("canvas")
        .screenshot({ path: path.join(output, file), omitBackground: true });
      entries.push({ file, tooth: id, view: "front", width: 192, height: 224 });
    }
  }
  for (const view of ["front", "upper", "lower", "left", "right"]) {
    await page.evaluate((view) => window.renderPreview({ view, width: 240, height: 160 }), view);
    const file = `view-${view}.png`;
    await page
      .locator("canvas")
      .screenshot({ path: path.join(output, file), omitBackground: true });
    entries.push({ file, view, width: 240, height: 160 });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  const manifest = {
    author: "University of Dundee, School of Dentistry",
    source: "https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b",
    license: "https://creativecommons.org/licenses/by/4.0/",
    prepared_model: "apps/web/public/models/dental-permanent-dundee-v1.glb",
    modifications:
      "Transparent PNG renders of existing mesh geometry/materials; isolated teeth and camera views only. No anatomy reshaped or invented.",
    limits:
      "Educational tooth identity previews, not clinical surface segmentation or calibrated measurements.",
    files: entries,
  };
  await fs.writeFile(
    path.join(root, "assets/dental/previews.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  execFileSync(
    "uv",
    [
      "run",
      "--project",
      "services/api",
      "python",
      "-c",
      `
import json
from pathlib import Path
from PIL import Image, PngImagePlugin
manifest=json.loads(Path('assets/dental/previews.json').read_text())
for item in manifest['files']:
    target=Path('apps/web/public/models/dental-previews') / item['file']
    image=Image.open(target)
    info=PngImagePlugin.PngInfo()
    for key,value in [('Author',manifest['author']),('Source',manifest['source']),('License',manifest['license']),('Modifications',manifest['modifications'])]:
        info.add_text(key,value)
    image.save(target,pnginfo=info)
`,
    ],
    { cwd: root },
  );
  console.log(`Rendered ${entries.length} previews from the existing permanent dentition.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
