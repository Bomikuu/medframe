import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";
const root = process.cwd();
const output = path.join(root, "apps/web/public/models/anatomy-previews");
const html = `<!doctype html><html><head><style>body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script></head><body><script type="module">
import * as THREE from 'three';
import {GLTFLoader} from '/three/examples/jsm/loaders/GLTFLoader.js';
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0xb9c2c9,2));
const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(3,5,5);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-3,2,-4);scene.add(fill);
const models={};for(const layer of ['body','skeleton']){
 const model=await new GLTFLoader().loadAsync('/anatomy-'+layer+'-v1.glb');
 model.scene.traverse(mesh=>{if(mesh.isMesh)mesh.material=new THREE.MeshStandardMaterial({color:layer==='body'?0xc9d0d2:0xe1ded5,roughness:.8});});
 models[layer]=model.scene;scene.add(model.scene);model.scene.visible=false;
}
window.renderPreview=({layer,view,width,height})=>{
 for(const [name,model]of Object.entries(models))model.visible=name===layer;
 const bounds=new THREE.Box3().setFromObject(models[layer]),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const lateral=view==='left'||view==='right',horizontal=lateral?size.z:size.x;
 const fit=Math.max(size.y,horizontal*height/width)*1.08;
 const camera=new THREE.OrthographicCamera(-fit*width/height/2,fit*width/height/2,fit/2,-fit/2,.001,100);
 const direction={front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0]}[view];
 camera.position.copy(center).addScaledVector(new THREE.Vector3(...direction),5);camera.lookAt(center);camera.updateProjectionMatrix();
 renderer.setSize(width,height);renderer.render(scene,camera);
};window.previewsReady=true;
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
    if (/^\/anatomy-(body|skeleton)-v1\.glb$/.test(url.pathname))
      file = path.join(root, "apps/web/public/models", url.pathname.slice(1));
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
  const page = await browser.newPage({ viewport: { width: 144, height: 200 } });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.previewsReady, { timeout: 30000 });
  for (const layer of ["body", "skeleton"])
    for (const view of ["front", "back", "left", "right"]) {
      await page.evaluate(
        ({ layer, view }) => window.renderPreview({ layer, view, width: 144, height: 200 }),
        { layer, view },
      );
      const file = `${layer}-${view}.png`;
      await page
        .locator("canvas")
        .screenshot({ path: path.join(output, file), omitBackground: true });
      entries.push({ layer, view, file, width: 144, height: 200 });
    }
  await fs.writeFile(
    "assets/anatomy/previews.json",
    JSON.stringify(
      {
        license: "CC-BY-SA-4.0",
        attribution: "Z-Anatomy / BodyParts3D; see assets/anatomy/ATTRIBUTION.md",
        modifications:
          "Camera-only transparent renders of the existing licensed GLBs; no anatomy reshaped.",
        files: entries,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Rendered ${entries.length} real anatomy camera previews.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
