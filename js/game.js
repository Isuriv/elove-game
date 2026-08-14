/* Side-scroller combat run - clear drones, cyborgs, Optimus, L3 Carbot & L4 Rocket bosses, reach exit */
import { CFG, frameScale } from "./config.js?v=coding-fixes-20260811f";
import { World } from "./world.js";
import { Art } from "./assets.js?v=coding-fixes-20260811f";
import { Player, Cyborg, Drone, Optimus, Carbot, RocketBoss } from "./entities.js?v=coding-fixes-20260811f";
import { AudioFX } from "./audio.js";
import {
  LEVELS,
  getLevel,
  isLevelUnlocked,
  unlockLevel,
  getLevelPhysics,
  BASE_PHYSICS,
} from "./levels.js?v=coding-fixes-20260811f";
import {
  LEVEL_ENEMY_SPAWNS,
  BASE_LOOT,
  LEVEL_EXTRA_LOOT,
  getProgression,
} from "./level-data.js?v=coding-fixes-20260811f";

export const Game = (() => {
  const STATE = {
    TITLE: "title",
    WAKE: "wake",
    PLAY: "play",
    WIN: "win",
    DEAD: "dead",
  };

  let mode = STATE.TITLE;
  let player = null;
  let enemies = [];
  let loot = [];
  let bullets = [];
  /** Orbiting L3 helper droids that fire slow friendly bolts. */
  let helpers = [];
  let inventory = { sword: false, cleared: false };
  let runStart = 0;
  let runTime = 0;
  let bestMs = null;
  let toast = "";
  let toastUntil = 0;
  let wakeUntil = 0;
  let tutorialUntil = 0;
  let keys = { left: false, right: false, jump: false };
  let scene = null;
  let hud = null;
  /** Selected / active level id (1 canyon ... 4.5 moon, 5 starship). */
  let levelId = 1;
  let pendingAdvance = false;
  /** Level 5 win cinematic: { t0, until } while hug -> blast-off -> vacation plays. */
  let winCinematic = null;
  /** Hug (~1.8s) + mars-love-movie + mars-vacation-movie before SAVED card. */
  function eloveCineMs() {
    const videoMs = Art.starship?.movieVideoMs || 9200;
    const vacationMs = Art.starship?.vacationVideoMs || 9100;
    return 1800 + videoMs + vacationMs + 150;
  }

  function level() {
    return getLevel(levelId);
  }

  /** Apply Moon Bouncing low-g / higher jump only while on 4.5; restore baseline otherwise. */
  function applyPhysics() {
    const ov = getLevelPhysics(levelId);
    Object.assign(CFG, ov || BASE_PHYSICS);
  }

  function clearKeys() {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  }

  function syncMovementKeys(state) {
    if (!state) {
      clearKeys();
      return;
    }
    keys.left = !!state.left;
    keys.right = !!state.right;
    keys.jump = !!state.jump;
  }

  function loadBest() {
    try {
      const v = localStorage.getItem(level().storageBest);
      bestMs = v ? Number(v) : null;
    } catch (_) {
      bestMs = null;
    }
  }

  function saveBest(ms) {
    if (bestMs == null || ms < bestMs) {
      bestMs = ms;
      try {
        localStorage.setItem(level().storageBest, String(ms));
      } catch (_) {}
      return true;
    }
    return false;
  }

  function showToast(text, ms = 2200) {
    toast = text;
    toastUntil = performance.now() + ms;
  }

  function bind(scene2d, hudEls) {
    scene = scene2d;
    hud = hudEls;
  }

  function applyTheme() {
    applyPhysics();
    if (scene) scene.setTheme(level().theme);
  }

  function selectLevel(id) {
    if (!isLevelUnlocked(id)) {
      const name = getLevel(id)?.name || "that level";
      showToast(`Clear prior levels first to unlock ${name}!`, 2400);
      return false;
    }
    levelId = id;
    loadBest();
    applyTheme();
    pendingAdvance = false;
    syncLevelSelectUI();
    return true;
  }

  function parseLevelId(raw) {
    if (raw == null || raw === "") return NaN;
    const s = String(raw).trim();
    if (s === "2.5.5" || s === "2_5_5" || s === "255" || s === "neuralink") return 2.55;
    if (s === "2.5" || s === "2_5" || s === "25" || s === "boring") return 2.5;
    if (s === "4.5" || s === "4_5" || s === "45" || s === "moon") return 4.5;
    if (s === "5" || s === "starship" || s === "ship") return 5;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function syncLevelSelectUI() {
    if (!hud?.levelBtns) return;
    for (const btn of hud.levelBtns) {
      const id = parseLevelId(btn.dataset.level);
      const unlocked = isLevelUnlocked(id);
      btn.classList.toggle("selected", id === levelId);
      btn.classList.toggle("locked", !unlocked);
      btn.disabled = !unlocked;
      const bestEl = btn.querySelector(".lvl-best");
      if (bestEl) {
        try {
          const v = localStorage.getItem(getLevel(id).storageBest);
          bestEl.textContent = v ? `Best ${formatTime(Number(v))}` : "";
        } catch (_) {
          bestEl.textContent = "";
        }
      }
    }
  }


  const ENEMY_CTORS = {
    cyborg: Cyborg,
    drone: Drone,
    optimus: Optimus,
    carbot: Carbot,
    rocket: RocketBoss,
  };

  function buildEnemies(id, floorY, platY) {
    const defs = LEVEL_ENEMY_SPAWNS[id] || LEVEL_ENEMY_SPAWNS[1];
    return defs.map(([kind, xt, yMode, yArg]) => {
      const Ctor = ENEMY_CTORS[kind];
      let y;
      if (yMode === "floor") y = floorY;
      else if (yMode === "plat") y = platY(yArg);
      else y = yArg * CFG.TILE;
      return new Ctor(xt * CFG.TILE, y);
    });
  }

  function buildLoot(id) {
    const collectY = (ty) => ty * CFG.TILE - 6;
    const toItem = (d) => ({
      type: d.type,
      x: d.x * CFG.TILE,
      y: collectY(d.yTile),
      taken: false,
    });
    const items = BASE_LOOT.map(toItem);
    const extra = LEVEL_EXTRA_LOOT[id];
    if (extra) {
      for (const d of extra) items.push(toItem(d));
    }
    return items;
  }
  function spawnRun() {
    World.reset();
    applyTheme();
    if (scene) {
      scene.rebuildLab();
      scene.clearEntities();
    }

    const spawn = World.spawnPoint();
    player = new Player(spawn.x, spawn.y);
    // Floor / platform cyborg y ~ (tileY - 1) * TILE so feet sit on lip (HH~10)
    const floorY = (World.H - 4) * CFG.TILE;
    const platY = (ty) => ty * CFG.TILE - 10;
    enemies = buildEnemies(levelId, floorY, platY);
    loot = buildLoot(levelId);
    bullets = [];
    helpers = [];
    inventory = {
      sword: false,
      cleared: false,
      shield: 0,
      magnetUntil: 0,
      battery: false,
      gunFireUntil: 0,
      gunNextShot: 0,
      gunType: null,
      collects: 0,
      helpers: 0,
    };
    clearKeys();
    winCinematic = null;
    if (scene?.clearEloveCinematic) scene.clearEloveCinematic();
    runStart = performance.now();
    runTime = 0;
    mode = STATE.WAKE;
    wakeUntil = performance.now() + 1200;
    tutorialUntil = wakeUntil + 3500;
    showToast(level().toast, 1600);

    if (scene) {
      scene.spawnPlayer(player);
      scene.spawnEnemies(enemies);
    }
  }

  function start(opts = {}) {
    // Production default: Ultra Earth. Debug boot may pass Cake Realm.
    levelId = opts.levelId != null ? opts.levelId : 1;
    if (!isLevelUnlocked(levelId)) levelId = 1;
    loadBest();
    applyTheme();
    mode = STATE.TITLE;
    if (scene) scene.setTitleCamera();
    syncLevelSelectUI();
  }

  function restart() {
    AudioFX.ensure();
    AudioFX.startBed();
    pendingAdvance = false;
    spawnRun();
    mode = STATE.PLAY;
    showToast("New run - fight through!", 1400);
  }

  function beginSelected() {
    AudioFX.ensure();
    AudioFX.startBed();
    pendingAdvance = false;
    spawnRun();
  }

  /** Jump straight into a level (skips fleeting title select). force bypasses unlock (URL deep-links). */
  function startLevel(id, opts = {}) {
    if (opts.force) {
      levelId = id;
      loadBest();
      applyTheme();
      pendingAdvance = false;
      syncLevelSelectUI();
    } else if (!selectLevel(id)) {
      return false;
    }
    beginSelected();
    return true;
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${m}:${String(r).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  function near(ax, ay, bx, by, r) {
    return Math.hypot(ax - bx, ay - by) < r;
  }

  function aliveCount() {
    return enemies.filter((e) => e.alive).length;
  }

  function applyPickup(item, now) {
    item.taken = true;
    if (item.type === "sword") {
      inventory.sword = true;
      showToast("Energy blade online - harder hits!");
    } else if (item.type === "heart") {
      player.hp = Math.min(player.maxHp, player.hp + 1);
      showToast("Repair pack - +1 HP");
    } else if (item.type === "shield") {
      inventory.shield = (inventory.shield || 0) + 1;
      player.shieldCharges = (player.shieldCharges || 0) + 1;
      showToast("Hard-light shield charge!");
    } else if (item.type === "battery") {
      inventory.battery = true;
      player.batteryBoost = true;
      player.forceCD = Math.min(player.forceCD, now + 200);
      showToast("Overclock cell - force ready sooner!");
    } else if (item.type === "magnet") {
      inventory.magnetUntil = now + 12000;
      showToast("Scrap magnet - pull loot closer!");
    } else if (
      item.type === "gun-pistol" ||
      item.type === "gun-blaster" ||
      item.type === "gun-cannon"
    ) {
      inventory.gunType = item.type;
      inventory.gunFireUntil = now + CFG.GUN_FIRE_MS;
      inventory.gunNextShot = now;
      const label =
        item.type === "gun-pistol"
          ? "Neon pistol"
          : item.type === "gun-blaster"
            ? "Cyan blaster"
            : "Heavy cannon";
      showToast(`${label} - auto-fire 3s!`);
    } else if (item.type === "helper-droid") {
      inventory.collects = (inventory.collects || 0) + 1;
      inventory.helpers = (inventory.helpers || 0) + 1;
      spawnHelperDroid(now);
      showToast(`Helper droid online - shooting assist! x${inventory.helpers}`, 1200);
    } else if (
      item.type === "clue" ||
      item.type === "toffee" ||
      item.type === "toy" ||
      item.type === "moon-rock" ||
      item.type === "mars-rock" ||
      item.type === "starship-tile" ||
      item.type === "neuralink-device" ||
      item.type === "gear" ||
      item.type === "engineering"
    ) {
      inventory.collects = (inventory.collects || 0) + 1;
      const label =
        item.type === "clue"
          ? "Love note from Elove"
          : item.type === "toffee"
            ? "Toffee"
            : item.type === "toy"
              ? "Toy"
              : item.type === "moon-rock"
                ? "Moon rock"
                : item.type === "starship-tile"
                  ? "Starship tile"
                  : item.type === "neuralink-device"
                    ? "Neuralink device"
                    : item.type === "gear"
                      ? "Gear"
                      : item.type === "engineering"
                        ? "Engineering part"
                        : "Mars rock";
      showToast(`${label}! x${inventory.collects}`, 900);
    }
    AudioFX.pickup();
  }

  function spawnHelperDroid(now) {
    const idx = helpers.length;
    helpers.push({
      angle: idx * ((Math.PI * 2) / 3),
      radius: 20 + (idx % 3) * 5,
      nextShot: now + 280,
      x: player ? player.x : 0,
      y: player ? player.y - 10 : 0,
    });
  }

  function updateHelpers(now, dt) {
    if (!player || !player.alive || !helpers.length) return;
    for (let i = 0; i < helpers.length; i++) {
      const h = helpers[i];
      h.angle += dt * 0.0028;
      const a = h.angle + i * 2.1;
      h.x = player.x + Math.cos(a) * h.radius;
      h.y = player.y - 12 + Math.sin(a) * (h.radius * 0.55);
      if (now < h.nextShot) continue;
      let best = null;
      let bestD = CFG.HELPER_ACQUIRE_RANGE;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) {
        h.nextShot = now + 180;
        continue;
      }
      const dx = best.x - h.x;
      const dy = best.y - (h.y + 2);
      const len = Math.hypot(dx, dy) || 1;
      const speed = CFG.HELPER_BULLET_SPEED;
      bullets.push({
        x: h.x,
        y: h.y,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        alive: true,
        travel: 0,
        range: CFG.HELPER_BULLET_RANGE,
        hostile: false,
        color: CFG.COLORS.gold,
      });
      h.nextShot = now + CFG.HELPER_FIRE_INTERVAL;
      if (i === 0) AudioFX.shoot();
    }
  }

  function spawnBullet() {
    if (!player || !player.alive) return;
    bullets.push({
      x: player.x + player.facing * 14,
      y: player.y - 4,
      vx: player.facing * CFG.GUN_BULLET_SPEED,
      vy: 0,
      alive: true,
      travel: 0,
      range: CFG.GUN_BULLET_RANGE,
      hostile: false,
      color: CFG.COLORS.cyan,
    });
    AudioFX.shoot();
  }

  function spawnDroneBullet(shot) {
    if (!shot) return;
    bullets.push({
      x: shot.x,
      y: shot.y,
      vx: shot.vx,
      vy: shot.vy,
      alive: true,
      travel: 0,
      range: CFG.DRONE_BULLET_RANGE,
      hostile: true,
      color: CFG.COLORS.pinkSoft,
    });
    AudioFX.shoot();
  }

  function updateBullets(now, dt) {
    const sScale = frameScale(dt);
    for (const b of bullets) {
      if (!b.alive) continue;
      b.x += b.vx * sScale;
      b.y += b.vy * sScale;
      b.travel += Math.hypot(b.vx, b.vy) * sScale;
      const maxRange = b.range ?? CFG.GUN_BULLET_RANGE;
      if (b.travel > maxRange || b.x < -20 || b.x > World.pixelW() + 20) {
        b.alive = false;
        continue;
      }
      if (b.hostile) {
        if (player && player.alive && near(b.x, b.y, player.x, player.y - 6, 12)) {
          b.alive = false;
          player.hurt(now, 1);
          if (scene) scene.playHitSparks(player.x, player.y, CFG.COLORS.pink);
        }
        continue;
      }
      for (const e of enemies) {
        if (!e.alive) continue;
        if (
          near(
            b.x,
            b.y,
            e.x,
            e.y,
            e.kind === "drone" ? 7 : e.kind === "carbot" || e.kind === "rocket" ? 28 : 14
          )
        ) {
          b.alive = false;
          if (scene) {
            scene.playHitSparks(
              e.x,
              e.y,
              e.kind === "drone"
                ? CFG.COLORS.danger
                : e.kind === "carbot" || e.kind === "rocket"
                  ? CFG.COLORS.pink
                  : CFG.COLORS.gold
            );
          }
          e.takeHit(now, player.x);
          break;
        }
      }
    }
    bullets = bullets.filter((b) => b.alive);
  }

  function updateGunFire(now) {
    if (!player || !player.alive) return;
    if (now >= inventory.gunFireUntil) {
      inventory.gunType = null;
      return;
    }
    let shots = 0;
    while (
      inventory.gunNextShot <= now &&
      inventory.gunNextShot < inventory.gunFireUntil &&
      shots < 4
    ) {
      spawnBullet();
      inventory.gunNextShot += CFG.GUN_FIRE_INTERVAL;
      shots++;
    }
  }

  function interact(now) {
    if (!player || !player.alive || mode !== STATE.PLAY) return;
    for (const item of loot) {
      if (item.taken) continue;
      if (near(player.x, player.y, item.x, item.y, 21)) {
        applyPickup(item, now);
        return;
      }
    }
    showToast("Nothing to grab.");
  }

  function update(dt, now) {
    if (mode === STATE.TITLE) return;

    if (mode === STATE.WAKE) {
      if (now >= wakeUntil) {
        mode = STATE.PLAY;
        showToast("A/D move - W/Space jump - J slash - clear foes!", 3400);
      }
      return;
    }

    if (mode === STATE.PLAY) {
      runTime = now - runStart;
      player.update(dt, keys, now);
      for (const e of enemies) {
        e.update(dt, player, now);
        if (e.kind === "drone" && e.pendingBullet) spawnDroneBullet(e.pendingBullet);
        if (e.kind === "carbot" && e.pendingBullet) spawnDroneBullet(e.pendingBullet);
        if (e.kind === "rocket" && e.pendingBullet) spawnDroneBullet(e.pendingBullet);
      }
      updateGunFire(now);
      updateHelpers(now, dt);
      updateBullets(now, dt);

      for (const item of loot) {
        if (item.taken) continue;
        const reach = inventory.magnetUntil > now ? 28 : 12;
        if (near(player.x, player.y, item.x, item.y, reach)) {
          applyPickup(item, now);
        } else if (inventory.magnetUntil > now) {
          const dx = player.x - item.x;
          const dy = player.y - item.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 90) {
            const ms = frameScale(dt);
            item.x += (dx / d) * 0.9 * ms;
            item.y += (dy / d) * 0.55 * ms;
          }
        }
      }

      if (aliveCount() === 0 && !inventory.cleared) {
        inventory.cleared = true;
        AudioFX.unlock();
        showToast("Sector clear - race to the EXIT pad!");
      }

      const er = World.exitRect();
      if (
        inventory.cleared &&
        player.x > er.x &&
        player.x < er.x + er.w &&
        player.y > er.y - 20 &&
        player.y < er.y + er.h + 20
      ) {
        mode = STATE.WIN;
        player.state = "success";
        const record = saveBest(runTime);
        AudioFX.win();
        if (scene) scene.playWinFlourish(player);
        const prog = getProgression(levelId);
        if (prog && prog.unlock != null) {
          unlockLevel(prog.unlock);
          pendingAdvance = true;
          showToast(
            record
              ? `NEW BEST! ${prog.nextName} unlocked - Enter for ${prog.enterLabel}`
              : `${prog.nextName} unlocked - Enter for ${prog.enterLabel}`,
            5000
          );
          syncLevelSelectUI();
        } else if (levelId === 5) {
          pendingAdvance = false;
          winCinematic = {
            t0: performance.now(),
            until: performance.now() + eloveCineMs(),
          };
          if (scene?.startEloveCinematic) scene.startEloveCinematic(player, winCinematic.t0);
          showToast(
            record
              ? "NEW BEST! Hug - Mars movie - vacation - he saved you"
              : level().winToast,
            5000
          );
        } else {
          pendingAdvance = false;
          showToast(record ? "NEW BEST CLEAR!" : level().winToast, 4000);
        }
      }

      if (!player.alive) {
        mode = STATE.DEAD;
        if (scene) scene.playDeathFlourish(player);
        showToast("Systems down... press R to retry.", 5000);
      }
    }
  }

  function onSlash(now) {
    if (mode === STATE.TITLE) {
      beginSelected();
      return;
    }
    if (mode !== STATE.PLAY || !player.alive) return;
    if (!player.trySlash(now)) return;
    if (scene) scene.playSlashVfx(player);
    const hb = player.slashHitbox();
    const dmgBonus = inventory.sword;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (
        near(
          hb.x,
          hb.y,
          e.x,
          e.y,
          hb.r + (e.kind === "carbot" || e.kind === "rocket" ? 18 : 0) + (dmgBonus ? 10 : 4)
        )
      ) {
        if (scene) {
          scene.playHitSparks(
            e.x,
            e.y,
            e.kind === "drone"
              ? CFG.COLORS.danger
              : e.kind === "carbot" || e.kind === "rocket"
                ? CFG.COLORS.pink
                : CFG.COLORS.gold
          );
        }
        e.takeHit(now, player.x);
        if (dmgBonus && e.alive) e.takeHit(now, player.x);
      }
    }
  }

  function onForce(now) {
    if (mode !== STATE.PLAY || !player.alive) return;
    if (!player.tryForce(now)) {
      showToast("Force-warp recharging...");
      return;
    }
    let hit = 0;
    for (const e of enemies) {
      if (e.alive && e.applyForce(player.x, player.y, now)) hit++;
    }
    if (scene) scene.showForceRing(player, now);
    showToast(hit ? `Cute-energy toss! (${hit})` : "No targets in range.");
  }

  function tryAdvanceOrStart() {
    if (mode === STATE.WIN && pendingAdvance) {
      const prog = getProgression(levelId);
      if (prog?.unlock != null) {
        selectLevel(prog.unlock);
        beginSelected();
        return;
      }
    }
    if (mode === STATE.TITLE) {
      beginSelected();
    }
  }

  function keyDown(code) {
    const now = performance.now();
    if (code === "Digit1" || code === "Numpad1") {
      if (mode === STATE.TITLE) selectLevel(1);
      return false;
    }
    if (code === "Digit2" || code === "Numpad2") {
      if (mode === STATE.TITLE) selectLevel(2);
      return false;
    }
    if (code === "Digit3" || code === "Numpad3") {
      if (mode === STATE.TITLE) selectLevel(3);
      return false;
    }
    if (code === "Digit4" || code === "Numpad4") {
      if (mode === STATE.TITLE) selectLevel(4);
      return false;
    }
    if (code === "Digit5" || code === "Numpad5") {
      if (mode === STATE.TITLE) selectLevel(5);
      return false;
    }
    if (code === "Digit6" || code === "Numpad6") {
      if (mode === STATE.TITLE) selectLevel(2.5);
      return false;
    }
    if (code === "Digit7" || code === "Numpad7") {
      if (mode === STATE.TITLE) selectLevel(2.55);
      return false;
    }
    if (code === "Digit8" || code === "Numpad8") {
      if (mode === STATE.TITLE) selectLevel(4.5);
      return false;
    }
    if (code === "KeyJ") {
      onSlash(now);
      return false;
    }
    if (code === "Space" || code === "KeyW" || code === "ArrowUp") {
      if (mode === STATE.TITLE || (mode === STATE.WIN && pendingAdvance)) {
        tryAdvanceOrStart();
        return false;
      }
      if (player) player.bufferJump(now);
      keys.jump = true;
      return false;
    }
    if (code === "KeyE") interact(now);
    if (code === "KeyF") onForce(now);
    if (code === "KeyR") restart();
    if (code === "KeyM") {
      const m = AudioFX.toggleMute();
      showToast(m ? "Muted" : "SFX on");
    }
    if (code === "Enter") {
      if (mode === STATE.TITLE || (mode === STATE.WIN && pendingAdvance)) {
        tryAdvanceOrStart();
      }
    }
    return true;
  }

  function keyUp(code) {
    if (code === "Space" || code === "KeyW" || code === "ArrowUp") {
      keys.jump = false;
    }
  }

  function objectiveText() {
    const left = aliveCount();
    if (left > 0) return `Defeat hostiles - ${left} remaining`;
    if (levelId === 5) return "Meet Elove - reach the control system";
    return levelId === 4.5
      ? "Board the Starship - enter the door"
      : "Reach the green EXIT pad";
  }

  function cineActive(now) {
    if (!winCinematic) return false;
    if (now >= winCinematic.until) {
      winCinematic = null;
      return false;
    }
    return true;
  }

  function updateHUD(now) {
    if (!hud) return;

    const playing = mode !== STATE.TITLE;
    hud.titleScreen.classList.toggle("hidden", playing);
    hud.playHud.classList.toggle("hidden", !playing);
    if (hud.consoleOverlay) hud.consoleOverlay.classList.add("hidden");
    const hideEndForCine = mode === STATE.WIN && cineActive(now);
    hud.endOverlay.classList.toggle(
      "hidden",
      (mode !== STATE.WIN && mode !== STATE.DEAD) || hideEndForCine
    );

    if (!playing) {
      if (hud.bestTitle) {
        hud.bestTitle.textContent = bestMs != null ? `Best: ${formatTime(bestMs)}` : "";
      }
      if (hud.titleSub) {
        hud.titleSub.textContent =
          levelId === 5
            ? "Inside Starship - meet Elove - blast off"
            : levelId === 4.5
              ? "Moon Bouncing - low-g - Starship hug"
              : levelId === 4
                ? "SpaceX Ascent - closer to Elove"
                : levelId === 3
                  ? "Tesla Works - getting closer to finding Elove"
                  : levelId === 2.55
                    ? "Neuralink - OR link-up"
                    : levelId === 2.5
                      ? "Boring Company - tunnel dig"
                      : levelId === 2
                        ? "Cake Realm - frosting skies"
                        : "Side Scroller - Ultra Earth";
      }
      syncLevelSelectUI();
      if (hud.titleToast) {
        if (now < toastUntil && toast) {
          hud.titleToast.classList.remove("hidden");
          hud.titleToast.textContent = toast;
        } else {
          hud.titleToast.classList.add("hidden");
        }
      }
      return;
    }

    hud.time.textContent = `TIME ${formatTime(runTime)}`;
    hud.best.textContent = bestMs != null ? `BEST ${formatTime(bestMs)}` : "";

    let hearts = "";
    for (let i = 0; i < player.maxHp; i++) {
      hearts += `<span class="heart ${i < player.hp ? "on" : "off"}"></span>`;
    }
    hud.hp.innerHTML = hearts;

    const left = aliveCount();
    if (hud.invKey) {
      hud.invKey.textContent = `FOES:${left}`;
      hud.invKey.classList.toggle("lit", left === 0);
    }
    if (hud.invSword) {
      hud.invSword.textContent = inventory.sword ? "BLADE" : "BLADE:-";
      hud.invSword.classList.toggle("lit", inventory.sword);
    }
    if (hud.invPad) {
      hud.invPad.textContent =
        levelId === 5
          ? inventory.cleared
            ? "HELM:OPEN"
            : "HELM:LOCK"
          : levelId === 4.5
            ? inventory.cleared
              ? "SHIP:OPEN"
              : "SHIP:LOCK"
            : inventory.cleared
              ? "EXIT:OPEN"
              : "EXIT:LOCK";
      hud.invPad.classList.toggle("lit", inventory.cleared);
    }
    if (hud.invDoor) {
      hud.invDoor.textContent = "";
      hud.invDoor.classList.add("hidden");
    }
    if (hud.eyeTimer) hud.eyeTimer.classList.add("hidden");

    if (now < toastUntil && toast) {
      hud.toast.classList.remove("hidden");
      hud.toast.textContent = toast;
    } else {
      hud.toast.classList.add("hidden");
    }

    hud.objective.textContent = objectiveText();

    if (mode === STATE.PLAY && now < tutorialUntil && now >= wakeUntil) {
      hud.tutorial.classList.remove("hidden");
      hud.tutorial.textContent =
        levelId === 5
          ? "Inside Starship - clear the path - hug Elove at the HELM"
          : levelId === 4.5
            ? "Moon Bouncing - low gravity - higher jumps - board the STARSHIP"
            : levelId === 4
              ? "SpaceX Ascent - purple grip - cyan ice - gold bounce - ROCKET BOSS - EXIT"
              : levelId === 3
                ? "Tesla Works - purple grip - cyan ice - gold bounce - CARBOT BOSS - EXIT"
                : levelId === 2.55
                  ? "Neuralink - purple grip - cyan ice - gold bounce - EXIT"
                  : levelId === 2.5
                    ? "Boring Company - purple grip - cyan ice - gold bounce - EXIT"
                    : levelId === 2
                      ? "Cake Realm - purple grip - cyan ice - gold bounce - EXIT"
                      : "Purple grip - cyan ice slides - gold bounce - reach EXIT";
    } else {
      hud.tutorial.classList.add("hidden");
    }

    if ((mode === STATE.WIN || mode === STATE.DEAD) && !hideEndForCine) {
      const won = mode === STATE.WIN;
      hud.endTitle.textContent =
        won && levelId === 5 ? "SAVED!" : won ? "CLEARED!" : "DOWNED";
      hud.endTitle.classList.toggle("win", won);
      hud.endTitle.classList.toggle("lose", !won);
      const showClueNote =
        won &&
        (levelId === 1 ||
          levelId === 2 ||
          levelId === 2.5 ||
          levelId === 2.55 ||
          levelId === 3 ||
          levelId === 4 ||
          levelId === 4.5 ||
          levelId === 5);
      const showStarshipInterior = won && (levelId === 4.5 || levelId === 5);
      const showMarsSave = won && levelId === 5;
      hud.endSub.textContent = won
        ? levelId === 5
          ? `Time ${formatTime(runTime)} - hug - Moon - Mars movie`
          : `Time ${formatTime(runTime)} - ${level().name}`
        : "Try again, Elove is still waiting for you.";
      if (hud.endClueNote) {
        hud.endClueNote.classList.toggle("hidden", !showClueNote);
        const endCard = hud.endOverlay?.querySelector(".end-card");
        endCard?.classList.toggle("has-clue-note", showClueNote);
        endCard?.classList.toggle("has-starship-interior", showStarshipInterior);
        endCard?.classList.toggle("has-mars-save", showMarsSave);
      }
      if (hud.endClueText) {
        hud.endClueText.textContent =
          won && levelId === 1
            ? "I hope you collected the kisses I left for you, a secret between us two. The next place will have kisses even more sweet, and you will get closer to when we meet! Keep up with me, and we will both be complete! Let's go on a trip, to see the beauty of Mars, and remember, never quit!"
            : won && levelId === 2
              ? "You made it past the cake present my Love, but something seems to have happened to the robots, attacking from below and above! Be careful when you find me, I think I can deactivate them if you reach the exits, let me see if I can fix it! I had to evacuate to somewhere Boring, so keep exploring! -"
              : won && levelId === 2.5
                ? "I hope you were able to dodge Prufrock! Just like my love, it has you on lock! Be safe until I am able to link up with you, I will find out how to disable the robots, and make them brand new! I'm at the place where we connect our brains to theirs, so maybe I can make them more aware! Come to me soon, my love, just give the robots a powerful shove! -Your Dearest Elove"
                : won && levelId === 2.55
                  ? "I'm at Tesla, grabbing a robotaxi, because I need to grab some music and treats, that will be very fancy. I managed to turn off the robots for the last few places you were in, we just need to make sure we're able to save all the other places before we go for a spin! Work hard, my love, and I will be there with you soon, you just need to pass these tests and I will make you swoon!"
                  : won && levelId === 3
                    ? "I'm preparing a great starship, for our amazing love trip! -Love Elove <3"
                    : won && levelId === 4
                      ? "Get on our couple's RoboStarShip and pack - you'll meet me on the moon picking up Moon cheese and snacks! - I love you, Elove <3"
                      : won && levelId === 4.5
                        ? "I'm waiting for a hug from my favourite girl so we can be snug, and think about all the wonders in space, in each other's embrace. Love you <3 - From Elove"
                        : won && levelId === 5
                          ? "We're snug at the helm - blast off to Mars, and I'll always save you. Forever yours, Elove <3"
                          : "";
      }
      hud.endBest.textContent = won && bestMs != null ? `Best ${formatTime(bestMs)}` : "";
      if (hud.endHint) {
        const nextHint =
          levelId === 1
            ? "Cake Realm"
            : levelId === 2
              ? "Boring Company"
              : levelId === 2.5
                ? "Neuralink"
                : levelId === 2.55
                  ? "Tesla Works"
                  : levelId === 3
                    ? "SpaceX Ascent"
                    : levelId === 4
                      ? "Moon Bouncing"
                      : levelId === 4.5
                        ? "Inside Starship"
                        : null;
        hud.endHint.innerHTML =
          won && pendingAdvance && nextHint
            ? `Press <kbd>Enter</kbd> for ${nextHint} - <kbd>R</kbd> retry`
            : `Press <kbd>R</kbd> to run again`;
      }
    }
  }

  function render(now) {
    updateHUD(now);
    if (mode === STATE.TITLE) {
      if (scene) scene.setTitleCamera();
      return;
    }
    if (scene && player) {
      scene.syncFrame(player, enemies, loot, inventory, now, bullets, helpers);
    }
  }

  return {
    STATE,
    start,
    restart,
    update,
    render,
    keyDown,
    keyUp,
    clearKeys,
    syncMovementKeys,
    bind,
    selectLevel,
    startLevel,
    beginSelected,
    parseLevelId,
    getMode: () => mode,
    getLevelId: () => levelId,
    LEVELS,
  };
})();
