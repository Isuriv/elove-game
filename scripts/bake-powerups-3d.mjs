/**
 * Bake weapon/powerup pickup sprites from procedural Three.js meshes.
 * Transparent PNG (no backdrop), bright neon emissive materials, 3/4 turntable pose.
 *
 *   node scripts/bake-powerups-3d.mjs
 *
 * Writes: assets/imagine/powerups/{shield,battery,heart,magnet}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "powerups");

const HI_RES = 256;
const PIXEL = 48;

const ITEMS = ["shield", "battery", "heart", "magnet"];

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

function makeScene(accentHex) {
  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(2.15, 1.55, 2.85);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.AmbientLight(0xffe8ff, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(3, 5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CYAN, 1.25);
  fill.position.set(-3, 2.2, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(new THREE.Color(accentHex), 2.4, 14);
  rim.position.set(0, 1.4, -1.6);
  scene.add(rim);
  const cyanPoint = new THREE.PointLight(CYAN, 1.6, 12);
  cyanPoint.position.set(1.4, 0.5, 1.3);
  scene.add(cyanPoint);
  const pinkPoint = new THREE.PointLight(NEON, 1.4, 12);
  pinkPoint.position.set(-1.2, 0.8, 1.0);
  scene.add(pinkPoint);
  return { scene, camera };
}

function mat(color, emissive, emInt = 0.95) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
    metalness: 0.35,
    roughness: 0.22,
  });
}

/** Cyan edge + soft neon-pink halo on every mesh (collect first - avoid recurse). */
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
        opacity: 0.98,
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
        opacity: 0.22,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shell.scale.multiplyScalar(1.1);
    shell.renderOrder = 1;
    obj.add(shell);
  }
}

function buildShield() {
  const g = new THREE.Group();
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85, 0),
    mat(0x7efcff, 0x00e8ff, 1.35)
  );
  gem.rotation.y = Math.PI / 4;
  g.add(gem);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 10, 28),
    mat(0xff7ec8, NEON, 1.4)
  );
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  addCyanNeonOutline(g);
  return g;
}

function buildBattery() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.25, 0.55),
    mat(0x5ad4ff, CYAN, 0.85)
  );
  g.add(body);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.22, 0.35),
    mat(0xff7ec8, NEON, 1.35)
  );
  cap.position.y = 0.74;
  g.add(cap);
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, 0.12),
      mat(i === 2 ? 0xffe066 : 0x7dffb3, i === 2 ? 0xffe066 : CYAN, 1.5)
    );
    led.position.set(0, -0.15 + i * 0.28, 0.28);
    g.add(led);
  }
  addCyanNeonOutline(g);
  return g;
}

function buildHeart() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.55);
  shape.bezierCurveTo(-0.15, -0.25, -0.7, -0.15, -0.7, 0.25);
  shape.bezierCurveTo(-0.7, 0.55, -0.35, 0.75, 0, 0.45);
  shape.bezierCurveTo(0.35, 0.75, 0.7, 0.55, 0.7, 0.25);
  shape.bezierCurveTo(0.7, -0.15, 0.15, -0.25, 0, -0.55);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.center();
  const mesh = new THREE.Mesh(geo, mat(0xff5ab8, 0xff2ea6, 1.45));
  mesh.scale.set(1.15, 1.15, 1.15);
  g.add(mesh);
  addCyanNeonOutline(g);
  return g;
}

function buildMagnet() {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.22, 12, 24, Math.PI),
    mat(0xd4b3ff, 0xb388ff, 1.15)
  );
  arc.rotation.z = Math.PI / 2;
  arc.rotation.y = Math.PI / 2;
  g.add(arc);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), mat(0x7efcff, CYAN, 1.5));
  tipL.position.set(-0.55, -0.45, 0);
  g.add(tipL);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.28), mat(0xff7ec8, NEON, 1.5));
  tipR.position.set(0.55, -0.45, 0);
  g.add(tipR);
  addCyanNeonOutline(g);
  return g;
}

const builders = { shield: buildShield, battery: buildBattery, heart: buildHeart, magnet: buildMagnet };
const accents = { shield: "#00e8ff", battery: "#7dffb3", heart: "#ff2ea6", magnet: "#b388ff" };

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

window.__bake = async function (name) {
  const { scene, camera } = makeScene(accents[name]);
  const mesh = builders[name]();
  // Clear 3/4 turntable pose (runtime adds continuous yaw)
  mesh.rotation.y = -0.72;
  mesh.rotation.x = 0.28;
  mesh.rotation.z = 0.06;
  mesh.scale.setScalar(1.18);
  scene.add(mesh);
  renderer.render(scene, camera);

  hiCtx.clearRect(0, 0, HI, HI);
  hiCtx.drawImage(renderer.domElement, 0, 0);
  outCtx.clearRect(0, 0, PX, PX);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(hiCanvas, 0, 0, PX, PX);

  // Drop near-black fringe only (keep bright neon pixels + true alpha)
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

  for (const name of ITEMS) {
    process.stdout.write(`${name}... `);
    const arr = await page.evaluate(async (n) => window.__bake(n), name);
    const buf = Buffer.from(arr);
    const outPath = path.join(OUT, `${name}.png`);
    await fs.writeFile(outPath, buf);
    console.log(`ok -> ${path.relative(ROOT, outPath)} (${buf.length} bytes)`);
  }

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
