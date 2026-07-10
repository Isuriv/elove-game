/* Stylized low-poly character & prop meshes */
import * as THREE from "three";
import { CFG } from "./config.js";

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

function addBox(parent, w, h, d, color, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, r, color, x, y, z, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(color, opts));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Cute low-poly cat-girl Meow Hybrid */
export function createCatGirl() {
  const root = new THREE.Group();
  root.name = "catGirl";

  const bob = new THREE.Group();
  bob.name = "bob";
  root.add(bob);

  // shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshBasicMaterial({ color: 0x2a1838, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // legs
  addBox(bob, 0.14, 0.28, 0.14, CFG.COLORS.ink, -0.12, 0.14, 0.02);
  addBox(bob, 0.14, 0.28, 0.14, CFG.COLORS.ink, 0.12, 0.14, 0.02);

  // dress / body
  addBox(bob, 0.48, 0.42, 0.28, CFG.COLORS.pink, 0, 0.48, 0);
  addBox(bob, 0.2, 0.08, 0.3, CFG.COLORS.gold, 0, 0.62, 0.02);

  // arms
  const armL = addBox(bob, 0.1, 0.32, 0.1, "#ffe8f2", -0.32, 0.5, 0);
  const armR = addBox(bob, 0.1, 0.32, 0.1, "#ffe8f2", 0.32, 0.5, 0);
  armL.name = "armL";
  armR.name = "armR";

  // head
  addSphere(bob, 0.28, "#ffe8f2", 0, 0.92, 0);
  // hair
  addBox(bob, 0.58, 0.22, 0.4, CFG.COLORS.purple, 0, 1.05, -0.02);
  addBox(bob, 0.12, 0.35, 0.12, CFG.COLORS.purple, -0.28, 0.85, -0.05);
  addBox(bob, 0.12, 0.35, 0.12, CFG.COLORS.purple, 0.28, 0.85, -0.05);

  // ears
  const earGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
  const earMat = mat(CFG.COLORS.pink);
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.18, 1.22, 0);
  earL.rotation.z = 0.25;
  bob.add(earL);
  const earR = new THREE.Mesh(earGeo, earMat.clone());
  earR.position.set(0.18, 1.22, 0);
  earR.rotation.z = -0.25;
  bob.add(earR);

  // eyes
  addBox(bob, 0.08, 0.1, 0.04, CFG.COLORS.ink, -0.1, 0.94, 0.24);
  addBox(bob, 0.08, 0.1, 0.04, CFG.COLORS.ink, 0.1, 0.94, 0.24);
  addBox(bob, 0.04, 0.04, 0.02, CFG.COLORS.cyan, -0.1, 0.96, 0.26, { emissive: CFG.COLORS.cyan, emissiveIntensity: 0.4 });
  addBox(bob, 0.04, 0.04, 0.02, CFG.COLORS.cyan, 0.1, 0.96, 0.26, { emissive: CFG.COLORS.cyan, emissiveIntensity: 0.4 });

  // sword (hidden until inventory)
  const sword = new THREE.Group();
  sword.name = "sword";
  sword.visible = false;
  addBox(sword, 0.08, 0.9, 0.08, CFG.COLORS.gold, 0, 0.35, 0, { metalness: 0.4, emissive: CFG.COLORS.gold, emissiveIntensity: 0.15 });
  addBox(sword, 0.22, 0.06, 0.08, CFG.COLORS.purple, 0, 0.05, 0);
  sword.position.set(0.42, 0.35, 0.1);
  bob.add(sword);

  root.userData = { bob, armL, armR, sword, shadow };
  return root;
}

/** Stylized cyborg */
export function createCyborg(dropsKey = false) {
  const root = new THREE.Group();
  root.name = "cyborg";

  const bob = new THREE.Group();
  bob.name = "bob";
  root.add(bob);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 16),
    new THREE.MeshBasicMaterial({ color: 0x2a1838, transparent: true, opacity: 0.3 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  addBox(bob, 0.16, 0.35, 0.16, CFG.COLORS.ink, -0.14, 0.18, 0);
  addBox(bob, 0.16, 0.35, 0.16, CFG.COLORS.ink, 0.14, 0.18, 0);
  addBox(bob, 0.55, 0.55, 0.35, CFG.COLORS.wallDark, 0, 0.6, 0, { metalness: 0.35 });
  addBox(bob, 0.35, 0.12, 0.38, CFG.COLORS.cyan, 0, 0.72, 0.02, { emissive: CFG.COLORS.cyan, emissiveIntensity: dropsKey ? 0.55 : 0.25 });

  const head = addBox(bob, 0.38, 0.32, 0.32, "#c8b8d8", 0, 1.05, 0, { metalness: 0.25 });
  head.name = "head";
  addBox(bob, 0.12, 0.08, 0.06, CFG.COLORS.danger, -0.1, 1.08, 0.16, { emissive: CFG.COLORS.danger, emissiveIntensity: 0.5 });
  addBox(bob, 0.12, 0.08, 0.06, CFG.COLORS.danger, 0.1, 1.08, 0.16, { emissive: CFG.COLORS.danger, emissiveIntensity: 0.5 });

  if (dropsKey) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: CFG.COLORS.cyan, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.05;
    marker.name = "keyRing";
    root.add(marker);
  }

  root.userData = { bob, head, shadow };
  return root;
}

export function createPod() {
  const g = new THREE.Group();
  addBox(g, 1.1, 0.15, 1.4, CFG.COLORS.wallDark, 0, 0.08, 0);
  const shell = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 0.7, 6, 12),
    mat(CFG.COLORS.pod, { transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.15, emissive: CFG.COLORS.pod, emissiveIntensity: 0.2 })
  );
  shell.position.set(0, 0.85, 0);
  shell.rotation.z = Math.PI / 2;
  g.add(shell);
  addBox(g, 0.15, 1.2, 0.15, CFG.COLORS.cyan, 0.55, 0.7, 0, { emissive: CFG.COLORS.cyan, emissiveIntensity: 0.4 });
  return g;
}

export function createCloset() {
  const g = new THREE.Group();
  addBox(g, 0.9, 1.4, 0.5, "#8a6aa8", 0, 0.7, 0);
  addBox(g, 0.15, 0.35, 0.08, CFG.COLORS.gold, 0.35, 0.7, 0.28, { emissive: CFG.COLORS.gold, emissiveIntensity: 0.3 });
  return g;
}

export function createConsole() {
  const g = new THREE.Group();
  addBox(g, 1.0, 0.7, 0.55, CFG.COLORS.wallDark, 0, 0.35, 0);
  const screen = addBox(g, 0.7, 0.4, 0.06, CFG.COLORS.cyan, 0, 0.85, 0.2, {
    emissive: CFG.COLORS.cyan,
    emissiveIntensity: 0.6,
  });
  screen.name = "screen";
  addBox(g, 0.9, 0.08, 0.4, CFG.COLORS.purple, 0, 0.72, 0.05);
  return g;
}

export function createDoor(open = false) {
  const g = new THREE.Group();
  g.name = "door";
  const frame = addBox(g, 1.2, 2.0, 0.25, CFG.COLORS.wallDark, 0, 1.0, 0);
  frame.name = "frame";
  const panel = addBox(
    g,
    0.95,
    1.7,
    0.12,
    open ? CFG.COLORS.ok : CFG.COLORS.danger,
    0,
    0.95,
    0.05,
    {
      emissive: open ? CFG.COLORS.ok : CFG.COLORS.danger,
      emissiveIntensity: open ? 0.35 : 0.45,
    }
  );
  panel.name = "panel";
  g.userData.open = open;
  return g;
}

export function createExitPad(armed = false) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.08, 24),
    mat(armed ? CFG.COLORS.ok : "#8870a0", {
      emissive: armed ? CFG.COLORS.ok : "#443355",
      emissiveIntensity: armed ? 0.5 : 0.1,
    })
  );
  pad.position.y = 0.04;
  pad.name = "pad";
  g.add(pad);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.05, 8, 32),
    mat(CFG.COLORS.ok, { emissive: CFG.COLORS.ok, emissiveIntensity: armed ? 0.7 : 0.15 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  ring.name = "ring";
  g.add(ring);
  return g;
}

export function createHiddenButton(pressed = false) {
  const g = new THREE.Group();
  const btn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16),
    mat(pressed ? CFG.COLORS.ok : CFG.COLORS.pink, {
      emissive: pressed ? CFG.COLORS.ok : CFG.COLORS.pink,
      emissiveIntensity: pressed ? 0.2 : 0.55,
    })
  );
  btn.position.y = 0.05;
  btn.name = "btn";
  g.add(btn);
  return g;
}

export function createSwordPickup() {
  const g = new THREE.Group();
  addBox(g, 0.1, 1.1, 0.1, CFG.COLORS.gold, 0, 0.55, 0, { metalness: 0.45, emissive: CFG.COLORS.gold, emissiveIntensity: 0.25 });
  addBox(g, 0.28, 0.08, 0.1, CFG.COLORS.purple, 0, 0.15, 0);
  return g;
}

export function createEyeKey() {
  const g = new THREE.Group();
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 14, 12),
    mat(CFG.COLORS.cyan, { emissive: CFG.COLORS.cyan, emissiveIntensity: 0.7, metalness: 0.3 })
  );
  eye.position.y = 0.35;
  g.add(eye);
  addBox(g, 0.08, 0.08, 0.08, CFG.COLORS.ink, 0, 0.38, 0.18);
  return g;
}

export function createDecorPillar() {
  const g = new THREE.Group();
  addBox(g, 0.55, 1.6, 0.55, CFG.COLORS.wallDark, 0, 0.8, 0);
  addBox(g, 0.25, 0.2, 0.25, CFG.COLORS.cyan, 0, 1.5, 0, { emissive: CFG.COLORS.cyan, emissiveIntensity: 0.4 });
  return g;
}

/** Floating glow marker ring + optional label sprite */
export function createMarker(color, label = "") {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.5, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.name = "ring";
  g.add(ring);

  const light = new THREE.PointLight(color, 0.6, 4);
  light.position.y = 1.2;
  light.name = "light";
  g.add(light);

  if (label) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = "rgba(42,24,56,0.75)";
    roundRect(ctx, 16, 12, 224, 40, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "bold 28px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.y = 2.2;
    sprite.name = "label";
    g.add(sprite);
  }

  g.userData.pulse = Math.random() * Math.PI * 2;
  return g;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function animateCharacter(mesh, entity, now, isPlayer = false) {
  if (!mesh) return;
  const bob = mesh.userData.bob;
  if (!bob) return;

  const walking = entity.state === "walk" || entity.state === "attack";
  const t = entity.frame;
  const bobY = walking ? Math.sin(t * 0.8) * 0.04 : Math.sin(now * 0.003) * 0.015;
  bob.position.y = bobY;

  if (isPlayer && mesh.userData.armR) {
    if (entity.state === "slash") {
      mesh.userData.armR.rotation.z = -1.2;
      mesh.userData.armR.rotation.x = 0.4;
    } else {
      mesh.userData.armR.rotation.z = walking ? Math.sin(t) * 0.35 : 0;
      mesh.userData.armR.rotation.x = 0;
    }
    if (mesh.userData.armL) {
      mesh.userData.armL.rotation.z = walking ? -Math.sin(t) * 0.35 : 0;
    }
  }

  // Model faces +Z; map 2D facing (±X) and optional look vector into yaw
  if (entity.lookX != null && entity.lookY != null) {
    const len = Math.hypot(entity.lookX, entity.lookY);
    if (len > 0.01) mesh.rotation.y = Math.atan2(entity.lookX, entity.lookY);
  } else {
    mesh.rotation.y = entity.facing >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  if (!isPlayer && mesh.userData.head) {
    mesh.userData.head.visible = !entity.headless;
  }
}

export function pulseMarker(marker, now, speed = 0.008) {
  if (!marker) return;
  const ring = marker.getObjectByName("ring");
  const light = marker.getObjectByName("light");
  const phase = (marker.userData.pulse || 0) + now * speed;
  const s = 1 + Math.sin(phase) * 0.12;
  if (ring) {
    ring.scale.set(s, s, s);
    if (ring.material) ring.material.opacity = 0.45 + Math.sin(phase) * 0.3;
  }
  if (light) light.intensity = 0.4 + Math.sin(phase) * 0.35;
  const label = marker.getObjectByName("label");
  if (label) label.position.y = 2.2 + Math.sin(now * 0.005) * 0.08;
}
