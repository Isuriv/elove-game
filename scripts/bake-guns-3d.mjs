/**
 * Bake three neon/cyan-outlined gun pickup sprites from procedural Three.js meshes.
 * Transparent PNG (no backdrop), bright neon emissive materials, 3/4 turntable pose.
 *
 *   node scripts/bake-guns-3d.mjs
 *
 * Writes: assets/imagine/powerups/{gun-pistol,gun-blaster,gun-cannon}.png
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

const ITEMS = ["gun-pistol", "gun-blaster", "gun-cannon"];

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
const BODY = 0x8a6aff;

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
  camera.position.set(2.15, 1.35, 2.75);
  camera.lookAt(0, 0.05, 0);

  scene.add(new THREE.AmbientLight(0xffe8ff, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(3, 5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(CYAN, 1.3);
  fill.position.set(-3, 2, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(new THREE.Color(accentHex), 2.5, 14);
  rim.position.set(0, 1.3, -1.5);
  scene.add(rim);
  const cyanPoint = new THREE.PointLight(CYAN, 1.7, 12);
  cyanPoint.position.set(1.5, 0.4, 1.2);
  scene.add(cyanPoint);
  const pinkPoint = new THREE.PointLight(NEON, 1.35, 12);
  pinkPoint.position.set(-1.3, 0.7, 1.0);
  scene.add(pinkPoint);
  return { scene, camera };
}

function mat(color, emissive, emInt = 0.95) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
    metalness: 0.4,
    roughness: 0.2,
  });
}

/** Neon + cyan edge outline on every mesh in a group (collect first - avoid recurse). */
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
        opacity: 0.24,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shell.scale.multiplyScalar(1.1);
    shell.renderOrder = 1;
    shell.userData.outlineShell = true;
    obj.add(shell);
  }
}

/** Compact sidearm pistol. */
function buildGunPistol() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.38, 0.28), mat(BODY, CYAN, 0.95));
  body.position.set(0.1, 0.05, 0);
  g.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.7, 12), mat(0x6ad8ff, CYAN, 1.25));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.75, 0.1, 0);
  g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), mat(CYAN, CYAN, 1.7));
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(1.12, 0.1, 0);
  g.add(muzzle);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.24), mat(0xff7ec8, NEON, 1.05));
  grip.position.set(-0.15, -0.35, 0);
  grip.rotation.z = 0.18;
  g.add(grip);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), mat(NEON, NEON, 1.5));
  sight.position.set(0.15, 0.3, 0);
  g.add(sight);
  addCyanNeonOutline(g);
  g.scale.setScalar(1.25);
  return g;
}

/** Mid-size energy blaster rifle. */
function buildGunBlaster() {
  const g = new THREE.Group();
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.22), mat(0xc89bff, NEON, 0.9));
  stock.position.set(-0.7, 0.0, 0);
  g.add(stock);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.32), mat(BODY, CYAN, 1.0));
  receiver.position.set(0.05, 0.08, 0);
  g.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.15, 14), mat(0x6ad8ff, CYAN, 1.3));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.05, 0.12, 0);
  g.add(barrel);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 12), mat(CYAN, CYAN, 1.7));
  tip.rotation.z = -Math.PI / 2;
  tip.position.set(1.75, 0.12, 0);
  g.add(tip);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 16), mat(NEON, NEON, 1.55));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.55 + i * 0.28, 0.12, 0);
    g.add(ring);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.22), mat(0xff7ec8, CYAN, 1.1));
  grip.position.set(-0.05, -0.32, 0);
  g.add(grip);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.18), mat(NEON, NEON, 1.25));
  mag.position.set(0.25, -0.28, 0);
  g.add(mag);
  addCyanNeonOutline(g);
  g.scale.setScalar(1.05);
  return g;
}

/** Heavy neon cannon with coiled energy core. */
function buildGunCannon() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.9, 16), mat(BODY, CYAN, 1.15));
  core.rotation.z = Math.PI / 2;
  core.position.set(0.1, 0.1, 0);
  g.add(core);
  const breech = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), mat(0xc89bff, NEON, 1.0));
  breech.position.set(-0.55, 0.05, 0);
  g.add(breech);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 16), mat(0x6ad8ff, CYAN, 1.4));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.05, 0.12, 0);
  g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 10, 20), mat(CYAN, CYAN, 1.8));
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(1.6, 0.12, 0);
  g.add(muzzle);
  for (let i = 0; i < 4; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 18), mat(NEON, NEON, 1.6));
    coil.rotation.y = Math.PI / 2;
    coil.position.set(-0.2 + i * 0.18, 0.1, 0);
    g.add(coil);
  }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.26), mat(0xff7ec8, CYAN, 1.15));
  handle.position.set(-0.35, -0.4, 0);
  g.add(handle);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.55), mat(CYAN, CYAN, 1.5));
  vent.position.set(0.2, 0.42, 0);
  g.add(vent);
  addCyanNeonOutline(g);
  g.scale.setScalar(0.98);
  return g;
}

const builders = {
  "gun-pistol": buildGunPistol,
  "gun-blaster": buildGunBlaster,
  "gun-cannon": buildGunCannon,
};
const accents = {
  "gun-pistol": "#00e8ff",
  "gun-blaster": "#00e8ff",
  "gun-cannon": "#00e8ff",
};

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
  mesh.rotation.y = -0.78;
  mesh.rotation.x = 0.3;
  mesh.rotation.z = 0.05;
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
