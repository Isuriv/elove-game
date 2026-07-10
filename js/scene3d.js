/* Three.js scene: lab geometry, camera, lights, entity mesh sync */
import * as THREE from "three";
import { CFG, TILE, toWorld, tileToWorld } from "./config.js";
import { World } from "./world.js";
import {
  createCatGirl,
  createCyborg,
  createPod,
  createCloset,
  createConsole,
  createDoor,
  createExitPad,
  createHiddenButton,
  createSwordPickup,
  createEyeKey,
  createDecorPillar,
  createMarker,
  animateCharacter,
  pulseMarker,
} from "./meshes.js";

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xfff5fb, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xfff0f8, 28, 55);
    this.scene.background = new THREE.Color(0xfff5fb);

    // Readable overhead third-person follow
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(10, 16, 18);

    this.labRoot = new THREE.Group();
    this.labRoot.name = "lab";
    this.scene.add(this.labRoot);

    this.entityRoot = new THREE.Group();
    this.entityRoot.name = "entities";
    this.scene.add(this.entityRoot);

    this.markerRoot = new THREE.Group();
    this.markerRoot.name = "markers";
    this.scene.add(this.markerRoot);

    this.playerMesh = null;
    this.enemyMeshes = [];
    this.lootMeshes = new Map();
    this.propMeshes = {};
    this.markers = {};
    this.forceRing = null;
    this.doorOpen = false;

    this._setupLights();
    this._buildLab();
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffe8f8, 0x6e4f8a, 0.85);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xfff5fb, 0.35);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(12, 22, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 25;
    key.shadow.camera.bottom = -25;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x5ce1e6, 0.25);
    fill.position.set(-10, 10, -8);
    this.scene.add(fill);

    const pinkRim = new THREE.PointLight(0xff7eb9, 0.5, 40);
    pinkRim.position.set(8, 6, 10);
    this.scene.add(pinkRim);
  }

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.65,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
  }

  _buildLab() {
    while (this.labRoot.children.length) {
      this.labRoot.remove(this.labRoot.children[0]);
    }
    this.propMeshes = {};

    const floorGeo = new THREE.BoxGeometry(1, 0.12, 1);
    const wallGeo = new THREE.BoxGeometry(1, 2.2, 1);
    const floorMatA = this._mat(CFG.COLORS.floor);
    const floorMatB = this._mat(CFG.COLORS.floorAlt);
    const wallMat = this._mat(CFG.COLORS.wall);
    const wallTopMat = this._mat(CFG.COLORS.wallDark);
    const exitMat = this._mat("#c8ffe0", { emissive: CFG.COLORS.ok, emissiveIntensity: 0.15 });

    World.forEachTile((tx, ty, t) => {
      const wx = tx + 0.5;
      const wz = ty + 0.5;
      const checker = (tx + ty) % 2 === 0;

      if (t === TILE.WALL) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(wx, 1.1, wz);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.labRoot.add(wall);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), wallTopMat);
        cap.position.set(wx, 2.22, wz);
        this.labRoot.add(cap);
        return;
      }

      // floor under walkable / special tiles
      let fmat = checker ? floorMatA : floorMatB;
      if (t === TILE.EXIT) fmat = exitMat;
      const floor = new THREE.Mesh(floorGeo, fmat);
      floor.position.set(wx, -0.06, wz);
      floor.receiveShadow = true;
      this.labRoot.add(floor);

      if (t === TILE.POD) {
        const pod = createPod();
        pod.position.set(wx, 0, wz);
        this.labRoot.add(pod);
        this.propMeshes.pod = pod;
      } else if (t === TILE.CLOSET) {
        const closet = createCloset();
        closet.position.set(wx, 0, wz);
        this.labRoot.add(closet);
        this.propMeshes.closet = closet;
      } else if (t === TILE.CONSOLE) {
        const cons = createConsole();
        cons.position.set(wx, 0, wz);
        this.labRoot.add(cons);
        this.propMeshes.console = cons;
      } else if (t === TILE.HIDDEN_BTN) {
        const btn = createHiddenButton(false);
        btn.position.set(wx, 0, wz);
        this.labRoot.add(btn);
        this.propMeshes.button = btn;
      } else if (t === TILE.DOOR_LOCKED || t === TILE.DOOR_OPEN) {
        if (!this.propMeshes.door) {
          const door = createDoor(t === TILE.DOOR_OPEN);
          // center between the two door tiles
          door.position.set(33.5, 0, 18.5);
          this.labRoot.add(door);
          this.propMeshes.door = door;
          this.doorOpen = t === TILE.DOOR_OPEN;
        }
      } else if (t === TILE.EXIT && tx === 36 && ty === 18) {
        const pad = createExitPad(false);
        pad.position.set(36.5, 0, 18.5);
        this.labRoot.add(pad);
        this.propMeshes.exit = pad;
      } else if (t === TILE.DECOR) {
        const pillar = createDecorPillar();
        pillar.position.set(wx, 0, wz);
        this.labRoot.add(pillar);
      }
    });

    // soft ceiling wash plane (atmosphere, not solid)
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(World.W + 4, World.H + 4),
      new THREE.MeshBasicMaterial({ color: 0xffe0f0, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(World.W / 2, 3.5, World.H / 2);
    this.labRoot.add(ceil);
  }

  rebuildLab() {
    this._buildLab();
  }

  clearEntities() {
    while (this.entityRoot.children.length) {
      this.entityRoot.remove(this.entityRoot.children[0]);
    }
    while (this.markerRoot.children.length) {
      this.markerRoot.remove(this.markerRoot.children[0]);
    }
    this.playerMesh = null;
    this.enemyMeshes = [];
    this.lootMeshes.clear();
    this.markers = {};
    this.forceRing = null;
  }

  spawnPlayer(player) {
    this.playerMesh = createCatGirl();
    this.entityRoot.add(this.playerMesh);
    this._syncPos(this.playerMesh, player.x, player.y);
  }

  spawnEnemies(enemies) {
    this.enemyMeshes = enemies.map((e) => {
      const m = createCyborg(e.dropsKey);
      this.entityRoot.add(m);
      this._syncPos(m, e.x, e.y);
      return m;
    });
  }

  syncLoot(loot) {
    const alive = new Set();
    for (let i = 0; i < loot.length; i++) {
      const item = loot[i];
      if (item.taken) {
        const existing = this.lootMeshes.get(i);
        if (existing) {
          this.entityRoot.remove(existing);
          this.lootMeshes.delete(i);
        }
        continue;
      }
      alive.add(i);
      let mesh = this.lootMeshes.get(i);
      if (!mesh) {
        mesh = item.type === "sword" ? createSwordPickup() : createEyeKey();
        this.entityRoot.add(mesh);
        this.lootMeshes.set(i, mesh);
      }
      this._syncPos(mesh, item.x, item.y);
      mesh.position.y = 0.15 + Math.sin(performance.now() * 0.005 + i) * 0.08;
      mesh.rotation.y += 0.02;
    }
    for (const [i, mesh] of this.lootMeshes) {
      if (!alive.has(i)) {
        this.entityRoot.remove(mesh);
        this.lootMeshes.delete(i);
      }
    }
  }

  setSwordVisible(on) {
    if (this.playerMesh?.userData.sword) {
      this.playerMesh.userData.sword.visible = !!on;
    }
  }

  setDoorOpen(open) {
    this.doorOpen = open;
    const door = this.propMeshes.door;
    if (!door) return;
    const panel = door.getObjectByName("panel");
    if (panel && panel.material) {
      panel.material.color.set(open ? CFG.COLORS.ok : CFG.COLORS.danger);
      panel.material.emissive.set(open ? CFG.COLORS.ok : CFG.COLORS.danger);
      panel.material.emissiveIntensity = open ? 0.35 : 0.45;
    }
    // slide panel aside when open
    if (panel) panel.position.x = open ? 1.2 : 0;
  }

  setButtonPressed(pressed) {
    const btn = this.propMeshes.button;
    if (!btn) return;
    const mesh = btn.getObjectByName("btn");
    if (mesh && mesh.material) {
      mesh.material.color.set(pressed ? CFG.COLORS.ok : CFG.COLORS.pink);
      mesh.material.emissive.set(pressed ? CFG.COLORS.ok : CFG.COLORS.pink);
      mesh.material.emissiveIntensity = pressed ? 0.2 : 0.55;
      mesh.position.y = pressed ? 0.02 : 0.05;
    }
  }

  setExitArmed(armed) {
    const exit = this.propMeshes.exit;
    if (!exit) return;
    const pad = exit.getObjectByName("pad");
    const ring = exit.getObjectByName("ring");
    if (pad && pad.material) {
      pad.material.color.set(armed ? CFG.COLORS.ok : "#8870a0");
      pad.material.emissive.set(armed ? CFG.COLORS.ok : "#443355");
      pad.material.emissiveIntensity = armed ? 0.5 : 0.1;
    }
    if (ring && ring.material) {
      ring.material.emissiveIntensity = armed ? 0.7 : 0.15;
    }
  }

  updateMarkers(inventory, enemies, now) {
    const ensure = (key, color, label, wx, wz, visible) => {
      let m = this.markers[key];
      if (!m) {
        m = createMarker(color, label);
        this.markerRoot.add(m);
        this.markers[key] = m;
      }
      m.visible = visible;
      m.position.set(wx, 0, wz);
      if (visible) pulseMarker(m, now);
    };

    const pod = tileToWorld(6, 5);
    ensure("pod", CFG.COLORS.cyan, "POD", pod.x, pod.z, true);

    const closet = tileToWorld(15, 11);
    ensure("closet", CFG.COLORS.gold, "CLOSET", closet.x, closet.z, !inventory.sword);

    const cons = tileToWorld(19, 4);
    ensure("console", CFG.COLORS.purple, "CONSOLE", cons.x, cons.z, !inventory.buttonPressed);

    const btn = tileToWorld(21, 5);
    ensure(
      "button",
      CFG.COLORS.pink,
      inventory.consoleRead ? "BTN?" : "",
      btn.x,
      btn.z,
      !inventory.buttonPressed
    );
    // brighter after console read
    if (this.markers.button) {
      const light = this.markers.button.getObjectByName("light");
      if (light) light.intensity = inventory.consoleRead ? 1.1 : 0.25;
    }

    const door = { x: 33.5, z: 18.5 };
    ensure(
      "door",
      inventory.doorUnlocked ? CFG.COLORS.ok : CFG.COLORS.danger,
      inventory.doorUnlocked ? "OPEN" : "DOOR",
      door.x,
      door.z,
      true
    );

    const exit = { x: 36.5, z: 18.5 };
    ensure(
      "exit",
      CFG.COLORS.ok,
      inventory.buttonPressed ? "EXIT" : inventory.doorUnlocked ? "EXIT (arm)" : "EXIT",
      exit.x,
      exit.z,
      true
    );
    if (this.markers.exit) {
      this.markers.exit.visible = inventory.doorUnlocked;
    }

    // KEY marker follows key cyborg
    const keyEnemy = enemies.find((e) => e.dropsKey && e.alive);
    if (keyEnemy) {
      const p = toWorld(keyEnemy.x, keyEnemy.y);
      ensure("key", CFG.COLORS.cyan, "KEY!", p.x, p.z, true);
    } else if (this.markers.key) {
      this.markers.key.visible = false;
    }
  }

  showForceRing(player, now) {
    if (!this.forceRing) {
      this.forceRing = new THREE.Mesh(
        new THREE.RingGeometry(CFG.FORCE_RANGE / CFG.TILE - 0.05, CFG.FORCE_RANGE / CFG.TILE, 48),
        new THREE.MeshBasicMaterial({ color: CFG.COLORS.pink, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      this.forceRing.rotation.x = -Math.PI / 2;
      this.entityRoot.add(this.forceRing);
    }
    const p = toWorld(player.x, player.y);
    this.forceRing.position.set(p.x, 0.08, p.z);
    this.forceRing.visible = true;
    this.forceRing.userData.until = now + 200;
  }

  _syncPos(mesh, gx, gy) {
    const p = toWorld(gx, gy);
    mesh.position.x = p.x;
    mesh.position.z = p.z;
  }

  syncFrame(player, enemies, loot, inventory, now) {
    if (player && this.playerMesh) {
      this._syncPos(this.playerMesh, player.x, player.y);
      animateCharacter(this.playerMesh, player, now, true);
      this.setSwordVisible(inventory.sword);

      if (!player.alive) {
        this.playerMesh.visible = false;
      } else {
        const flash = now < player.iframeUntil && Math.floor(now / 80) % 2 === 0;
        this.playerMesh.visible = !flash;
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      let mesh = this.enemyMeshes[i];
      if (!mesh) {
        mesh = createCyborg(e.dropsKey);
        this.entityRoot.add(mesh);
        this.enemyMeshes[i] = mesh;
      }
      this._syncPos(mesh, e.x, e.y);
      if (player) {
        e.lookX = player.x - e.x;
        e.lookY = player.y - e.y;
      }
      animateCharacter(mesh, e, now, false);
      // defeated husk stays but flattened
      if (!e.alive) {
        mesh.scale.set(1, 0.35, 1);
        mesh.position.y = 0;
      } else {
        mesh.scale.set(1, 1, 1);
      }
    }

    this.syncLoot(loot);
    this.setDoorOpen(inventory.doorUnlocked);
    this.setButtonPressed(inventory.buttonPressed);
    this.setExitArmed(inventory.buttonPressed);
    this.updateMarkers(inventory, enemies, now);

    if (this.forceRing) {
      if (now < (this.forceRing.userData.until || 0)) {
        this.forceRing.visible = true;
        const p = toWorld(player.x, player.y);
        this.forceRing.position.set(p.x, 0.08, p.z);
      } else {
        this.forceRing.visible = false;
      }
    }

    this._updateCamera(player);
  }

  _updateCamera(player) {
    if (!player) return;
    const p = toWorld(player.x, player.y);
    // Elevated follow — readable overhead third-person
    const desired = new THREE.Vector3(p.x - 0.5, 14, p.z + 11);
    this.camPos.lerp(desired, 0.08);
    this.camTarget.lerp(new THREE.Vector3(p.x, 0.6, p.z), 0.12);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  setTitleCamera() {
    this.camPos.set(18, 18, 28);
    this.camTarget.set(18, 0, 12);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 500;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.renderer.dispose();
  }
}
