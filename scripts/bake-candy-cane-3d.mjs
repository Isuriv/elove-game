/**
 * Bake a neon candy-cane attack overlay from a procedural Three.js mesh.
 * Transparent PNG, striped red/white + cyan edges, diagonal pose matching the slash blade.
 *
 *   node scripts/bake-candy-cane-3d.mjs
 *
 * Writes: assets/imagine/weapons/candy-cane.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "weapons");

const HI_RES = 320;
const PIXEL = 96;

const PAGE_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<style>html,body{margin:0;background:transparent;overflow:hidden}canvas{display:block}</style>
</head><body>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.170.0/build/three.module.js"}}
</script>
<script type="module">
import * as THREE from "three";

const HI = ${HI_RES};
const PX = ${PIXEL};
const CYAN = 0x00e8ff;
const NEON = 0xff2ea6;
const RED = 0xff3a5a;
const WHITE = 0xfff5f8;

function makeRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(HI, HI, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function makeScene() {
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  // Face the cane so the long axis fills the frame (cat-length weapon)
  camera.position.set(0.1, 0.15, 4.6);
  camera.lookAt(0.05, 0.1, 0);

  scene.add(new THREE.AmbientLight(0xffe8ff, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CYAN, 1.2);
  fill.position.set(-2.5, 1.5, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(NEON, 2.2, 14);
  rim.position.set(0, 1.2, -1.4);
  scene.add(rim);
  const cyanPoint = new THREE.PointLight(CYAN, 1.5, 12);
  cyanPoint.position.set(1.2, 0.5, 1.4);
  scene.add(cyanPoint);
  return { scene, camera };
}

function mat(color, emissive, emInt = 1.05) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
    metalness: 0.25,
    roughness: 0.28,
  });
}

function addCyanNeonOutline(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) meshes.push(obj);
  });
  for (const obj of meshes) {
    const edges = new THREE.EdgesGeometry(obj.geometry, 28);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
      })
    );
    line.renderOrder = 2;
    obj.add(line);

    const shell = new THREE.Mesh(
      obj.geometry.clone(),
      new THREE.MeshBasicMaterial({
        color: NEON,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shell.scale.multiplyScalar(1.08);
    shell.renderOrder = 1;
    obj.add(shell);
  }
}

/** Classic candy cane: long shaft + crook, red/white stripe bands. */
function buildCandyCane() {
  const g = new THREE.Group();
  const radius = 0.2;
  const shaftLen = 2.2;
  const bands = 10;
  const bandH = shaftLen / bands;

  for (let i = 0; i < bands; i++) {
    const isRed = i % 2 === 0;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, bandH * 0.98, 16),
      mat(isRed ? RED : WHITE, isRed ? RED : WHITE, isRed ? 1.2 : 0.9)
    );
    seg.position.y = -shaftLen / 2 + bandH * (i + 0.5);
    g.add(seg);
  }

  // Crook built from tube curve so the hook survives pixelate
  const hookPts = [];
  const hookR = 0.55;
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const a = -Math.PI * 0.05 + t * Math.PI * 1.05;
    hookPts.push(
      new THREE.Vector3(
        Math.sin(a) * hookR,
        shaftLen / 2 + Math.cos(a) * hookR - hookR * 0.15,
        0
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(hookPts);
  const hookGeo = new THREE.TubeGeometry(curve, 28, radius * 0.95, 10, false);
  // Stripe the tube with vertex colors via two overlapping tubes
  const hookRed = new THREE.Mesh(hookGeo, mat(RED, RED, 1.25));
  g.add(hookRed);
  // White stripe rings along crook
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.05, radius * 0.42, 8, 14),
      mat(WHITE, WHITE, 1.0)
    );
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.clone().normalize());
    g.add(ring);
  }

  // Soft tip glow at crook end
  const tipP = curve.getPoint(1);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.15, 12, 12),
    mat(NEON, NEON, 1.55)
  );
  tip.position.copy(tipP);
  g.add(tip);

  addCyanNeonOutline(g);

  // Diagonal pose like the pixel neon sword (tip up-right)
  g.rotation.z = -0.78;
  g.rotation.x = 0.12;
  g.rotation.y = 0.28;
  g.position.set(0.05, 0.0, 0);
  g.scale.setScalar(0.95);
  return g;
}

const renderer = makeRenderer();
const hiCanvas = document.createElement("canvas");
hiCanvas.width = HI;
hiCanvas.height = HI;
const hiCtx = hiCanvas.getContext("2d", { alpha: true });
const outCanvas = document.createElement("canvas");
outCanvas.width = PX;
outCanvas.height = PX;
const outCtx = outCanvas.getContext("2d", { alpha: true });
outCtx.imageSmoothingEnabled = false;

window.__bake = async function () {
  const { scene, camera } = makeScene();
  const mesh = buildCandyCane();
  scene.add(mesh);
  renderer.render(scene, camera);

  hiCtx.clearRect(0, 0, HI, HI);
  hiCtx.drawImage(renderer.domElement, 0, 0);
  outCtx.clearRect(0, 0, PX, PX);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(hiCanvas, 0, 0, PX, PX);

  const img = outCtx.getImageData(0, 0, PX, PX);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a < 8) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      continue;
    }
    if (r < 22 && g < 20 && b < 26) {
      d[i + 3] = 0;
    }
  }
  outCtx.putImageData(img, 0, 0);

  const blob = await new Promise((res) => outCanvas.toBlob(res, "image/png"));
  const buf = new Uint8Array(await blob.arrayBuffer());
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
  return Array.from(buf);
};

window.__ready = true;
</script>
</body></html>`;

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: HI_RES, height: HI_RES } });
  await page.setContent(PAGE_HTML, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

  process.stdout.write("candy-cane... ");
  const arr = await page.evaluate(async () => window.__bake());
  const buf = Buffer.from(arr);
  const outPath = path.join(OUT, "candy-cane.png");
  await fs.writeFile(outPath, buf);
  console.log(`ok -> ${path.relative(ROOT, outPath)} (${buf.length} bytes)`);

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
