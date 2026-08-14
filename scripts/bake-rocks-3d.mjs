/**
 * Bake moon/mars rock collectibles from procedural Three.js meshes.
 * Transparent PNG (no backdrop), neon cyan edges, 3/4 turntable pose.
 *
 *   node scripts/bake-rocks-3d.mjs
 *
 * Writes: assets/imagine/powerups/{moon-rock,mars-rock}.png
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

const ITEMS = ["moon-rock", "mars-rock"];

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

function mat(color, emissive, emInt = 0.95, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emInt,
    metalness: opts.metalness ?? 0.22,
    roughness: opts.roughness ?? 0.55,
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
        opacity: 0.18,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    shell.scale.multiplyScalar(1.1);
    shell.renderOrder = 1;
    obj.add(shell);
  }
}

/** Deterministic jitter so moon/mars stay distinct across runs. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makeCraggyRock(radius, detail, seed, squashY = 0.82) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const rnd = seeded(seed);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    // Multi-lobe noise: big chunks + finer grit
    const big = 0.78 + rnd() * 0.42;
    const mid = 0.9 + rnd() * 0.22;
    const lobe = 1 + 0.12 * Math.sin(n.x * 7.3 + seed) * Math.cos(n.y * 5.1);
    v.copy(n).multiplyScalar(radius * big * mid * lobe);
    v.y *= squashY;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function addCraters(group, count, seed, darkMat, rimMat, radius) {
  const rnd = seeded(seed + 99);
  for (let i = 0; i < count; i++) {
    const theta = rnd() * Math.PI * 2;
    const phi = 0.35 + rnd() * 1.1;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi) * 0.85,
      Math.sin(phi) * Math.sin(theta)
    ).normalize();
    const craterR = radius * (0.14 + rnd() * 0.16);
    const pit = new THREE.Mesh(
      new THREE.SphereGeometry(craterR, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      darkMat
    );
    pit.position.copy(dir).multiplyScalar(radius * (0.72 + rnd() * 0.08));
    pit.lookAt(dir.clone().multiplyScalar(3));
    pit.rotateX(Math.PI);
    group.add(pit);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(craterR * 0.95, craterR * 0.14, 6, 14),
      rimMat
    );
    rim.position.copy(dir).multiplyScalar(radius * 0.88);
    rim.lookAt(0, 0, 0);
    rim.rotateX(Math.PI / 2);
    group.add(rim);
  }
}

function buildMoonRock() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    makeCraggyRock(0.95, 2, 0x4d00e1, 0.78),
    mat(0xc8c8d8, 0x6a6a88, 0.55, { metalness: 0.15, roughness: 0.62 })
  );
  g.add(body);

  // Secondary chunk for silhouette
  const chunk = new THREE.Mesh(
    makeCraggyRock(0.42, 1, 0x91a2b3, 0.9),
    mat(0x9090a8, 0x505068, 0.45, { metalness: 0.12, roughness: 0.7 })
  );
  chunk.position.set(0.55, -0.15, 0.25);
  chunk.rotation.set(0.4, 0.8, -0.2);
  g.add(chunk);

  addCraters(
    g,
    4,
    0x4d00e2,
    mat(0x3a3a48, 0x222230, 0.35, { roughness: 0.8 }),
    mat(0xa8a8c0, 0x00e8ff, 0.85, { metalness: 0.3, roughness: 0.4 }),
    0.95
  );

  // Cyan mineral flecks
  const fleckMat = mat(0x7efcff, CYAN, 1.45, { metalness: 0.5, roughness: 0.25 });
  for (const [x, y, z, s] of [
    [0.35, 0.45, 0.55, 0.08],
    [-0.5, 0.2, 0.4, 0.07],
    [0.1, -0.35, 0.7, 0.06],
  ]) {
    const fleck = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 6), fleckMat);
    fleck.position.set(x, y, z);
    g.add(fleck);
  }

  addCyanNeonOutline(g);
  return g;
}

function buildMarsRock() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    makeCraggyRock(0.95, 2, 0xa15501, 0.8),
    mat(0xe06030, 0x8a2810, 0.7, { metalness: 0.18, roughness: 0.58 })
  );
  g.add(body);

  const chunk = new THREE.Mesh(
    makeCraggyRock(0.4, 1, 0xc0ffee, 0.88),
    mat(0xa03818, 0x5a1808, 0.55, { metalness: 0.14, roughness: 0.68 })
  );
  chunk.position.set(-0.5, -0.2, 0.3);
  chunk.rotation.set(-0.3, -0.6, 0.25);
  g.add(chunk);

  addCraters(
    g,
    3,
    0xa15502,
    mat(0x5a2010, 0x301008, 0.4, { roughness: 0.82 }),
    mat(0xff9060, 0xffe066, 0.95, { metalness: 0.35, roughness: 0.38 }),
    0.95
  );

  // Warm gold flecks
  const fleckMat = mat(0xffe066, 0xffc040, 1.4, { metalness: 0.45, roughness: 0.28 });
  for (const [x, y, z, s] of [
    [0.4, 0.4, 0.5, 0.075],
    [-0.35, 0.15, 0.55, 0.065],
    [0.15, -0.4, 0.65, 0.06],
  ]) {
    const fleck = new THREE.Mesh(new THREE.SphereGeometry(s, 6, 6), fleckMat);
    fleck.position.set(x, y, z);
    g.add(fleck);
  }

  addCyanNeonOutline(g);
  return g;
}

const builders = { "moon-rock": buildMoonRock, "mars-rock": buildMarsRock };
const accents = { "moon-rock": "#00e8ff", "mars-rock": "#ffe066" };

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
