/**
 * Bake a simple pink neon sword from a procedural Three.js mesh.
 * Transparent PNG, diagonal pose for the slash swing + afterimage.
 *
 *   node scripts/bake-pink-sword-3d.mjs
 *
 * Writes: assets/imagine/weapons/pink-sword.png
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
const PINK = 0xff2ea6;
const PINK_HI = 0xff6ec7;
const PINK_DEEP = 0xd4147a;
const WHITE = 0xfff0f8;
const GOLD = 0xffe8a0;

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
  camera.position.set(0.05, 0.1, 4.4);
  camera.lookAt(0.02, 0.05, 0);

  scene.add(new THREE.AmbientLight(0xffe8ff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(2.4, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(PINK_HI, 1.15);
  fill.position.set(-2.4, 1.4, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(PINK, 2.4, 14);
  rim.position.set(0, 1.1, -1.3);
  scene.add(rim);
  const tipLight = new THREE.PointLight(WHITE, 1.3, 10);
  tipLight.position.set(0.8, 1.6, 1.2);
  scene.add(tipLight);
  return { scene, camera };
}

function mat(color, emissive, emInt = 1.1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
    metalness: 0.35,
    roughness: 0.22,
  });
}

function addPinkNeonOutline(root) {
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) meshes.push(obj);
  });
  for (const obj of meshes) {
    const edges = new THREE.EdgesGeometry(obj.geometry, 24);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: PINK_HI,
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
        color: PINK,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shell.scale.multiplyScalar(1.09);
    shell.renderOrder = 1;
    obj.add(shell);
  }
}

/** Clean katana-ish sword: grip, guard, pink blade, glowing tip. */
function buildPinkSword() {
  const g = new THREE.Group();

  // Grip
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.85, 12),
    mat(PINK_DEEP, PINK_DEEP, 0.85)
  );
  grip.position.y = -1.15;
  g.add(grip);

  // Pommel
  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    mat(GOLD, GOLD, 1.2)
  );
  pommel.position.y = -1.6;
  g.add(pommel);

  // Guard
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.12, 0.22),
    mat(PINK_HI, PINK, 1.35)
  );
  guard.position.y = -0.7;
  g.add(guard);

  // Blade (tapered)
  const blade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.16, 2.35, 8),
    mat(PINK, PINK, 1.45)
  );
  blade.position.y = 0.55;
  g.add(blade);

  // Fuller / highlight strip
  const fuller = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 2.0, 0.18),
    mat(WHITE, PINK_HI, 1.55)
  );
  fuller.position.set(0, 0.5, 0.02);
  g.add(fuller);

  // Tip glow
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.35, 10),
    mat(WHITE, PINK_HI, 1.7)
  );
  tip.position.y = 1.85;
  g.add(tip);

  addPinkNeonOutline(g);

  // Upright tip-up - runtime rotates for the slash swing
  g.rotation.x = 0.08;
  g.rotation.y = 0.18;
  g.position.set(0, 0.05, 0);
  g.scale.setScalar(0.98);
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
  const mesh = buildPinkSword();
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

  process.stdout.write("pink-sword... ");
  const arr = await page.evaluate(async () => window.__bake());
  const buf = Buffer.from(arr);
  const outPath = path.join(OUT, "pink-sword.png");
  await fs.writeFile(outPath, buf);
  console.log(`ok -> ${path.relative(ROOT, outPath)} (${buf.length} bytes)`);

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
