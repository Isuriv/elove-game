/* Side-scroller combat run — clear drones & cyborgs, reach exit */
import { CFG } from "./config.js";
import { World } from "./world.js";
import { Player, Cyborg, Drone } from "./entities.js";
import { AudioFX } from "./audio.js";

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

  function clearKeys() {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  }

  function syncMovementKeys(state) {
    if (!state || !state.focused) {
      clearKeys();
      return;
    }
    keys.left = !!state.left;
    keys.right = !!state.right;
    keys.jump = !!state.jump;
  }

  function loadBest() {
    try {
      const v = localStorage.getItem(CFG.STORAGE_KEY);
      bestMs = v ? Number(v) : null;
    } catch (_) {
      bestMs = null;
    }
  }

  function saveBest(ms) {
    if (bestMs == null || ms < bestMs) {
      bestMs = ms;
      try {
        localStorage.setItem(CFG.STORAGE_KEY, String(ms));
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

  function spawnRun() {
    World.reset();
    if (scene) {
      scene.rebuildLab();
      scene.clearEntities();
    }

    const spawn = World.spawnPoint();
    player = new Player(spawn.x, spawn.y);
    enemies = [
      new Cyborg(18 * CFG.TILE, (World.H - 4) * CFG.TILE),
      new Cyborg(36 * CFG.TILE, (World.H - 4) * CFG.TILE),
      new Cyborg(55 * CFG.TILE, (World.H - 4) * CFG.TILE),
      new Cyborg(78 * CFG.TILE, (World.H - 4) * CFG.TILE),
      new Drone(20 * CFG.TILE, 5 * CFG.TILE),
      new Drone(40 * CFG.TILE, 4 * CFG.TILE),
      new Drone(60 * CFG.TILE, 5 * CFG.TILE),
      new Drone(74 * CFG.TILE, 4.5 * CFG.TILE),
    ];
    loot = [{ type: "sword", x: 8 * CFG.TILE, y: 10 * CFG.TILE - 6, taken: false }];
    inventory = { sword: false, cleared: false };
    clearKeys();
    runStart = performance.now();
    runTime = 0;
    mode = STATE.WAKE;
    wakeUntil = performance.now() + 1200;
    tutorialUntil = wakeUntil + 3500;
    showToast("Nars canyon run — clear the hostiles!", 1600);

    if (scene) {
      scene.spawnPlayer(player);
      scene.spawnEnemies(enemies);
    }
  }

  function start() {
    loadBest();
    mode = STATE.TITLE;
    if (scene) scene.setTitleCamera();
  }

  function restart() {
    AudioFX.ensure();
    AudioFX.startBed();
    spawnRun();
    mode = STATE.PLAY;
    showToast("New run — fight through!", 1400);
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

  function interact(now) {
    if (!player || !player.alive || mode !== STATE.PLAY) return;
    for (const item of loot) {
      if (item.taken) continue;
      if (near(player.x, player.y, item.x, item.y, 16)) {
        item.taken = true;
        if (item.type === "sword") {
          inventory.sword = true;
          showToast("Energy blade online — harder hits!");
        }
        AudioFX.pickup();
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
        showToast("←→ move · Space jump · Click/Z slash", 3400);
      }
      return;
    }

    if (mode === STATE.PLAY) {
      runTime = now - runStart;
      player.update(dt, keys, now);
      for (const e of enemies) e.update(dt, player, now);

      // Auto-pickup sword
      for (const item of loot) {
        if (!item.taken && item.type === "sword" && near(player.x, player.y, item.x, item.y, 12)) {
          item.taken = true;
          inventory.sword = true;
          AudioFX.pickup();
          showToast("Energy blade online!");
        }
      }

      if (aliveCount() === 0 && !inventory.cleared) {
        inventory.cleared = true;
        AudioFX.unlock();
        showToast("Sector clear — race to the EXIT pad!");
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
        showToast(record ? "NEW BEST CLEAR!" : "Canyon cleared!", 4000);
      }

      if (!player.alive) {
        mode = STATE.DEAD;
        if (scene) scene.playDeathFlourish(player);
        showToast("Systems down… click or R to retry.", 5000);
      }
    }
  }

  function onSlash(now) {
    if (mode === STATE.TITLE) {
      AudioFX.ensure();
      AudioFX.startBed();
      spawnRun();
      return;
    }
    if (mode !== STATE.PLAY || !player.alive) return;
    if (!player.trySlash(now)) return;
    if (scene) scene.playSlashVfx(player);
    const hb = player.slashHitbox();
    const dmgBonus = inventory.sword;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (near(hb.x, hb.y, e.x, e.y, hb.r + (dmgBonus ? 5 : 0))) {
        if (scene) {
          scene.playHitSparks(
            e.x,
            e.y,
            e.kind === "drone" ? CFG.COLORS.danger : CFG.COLORS.gold
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
      showToast("Force-warp recharging…");
      return;
    }
    let hit = 0;
    for (const e of enemies) {
      if (e.alive && e.applyForce(player.x, player.y)) hit++;
    }
    if (scene) scene.showForceRing(player, now);
    showToast(hit ? `Cute-energy toss! (${hit})` : "No targets in range.");
  }

  function isSlashKey(code) {
    return (
      code === "KeyZ" ||
      code === "KeyX" ||
      code === "KeyK" ||
      code === "KeyJ" ||
      code === "ControlLeft" ||
      code === "ControlRight"
    );
  }

  function isJumpKey(code) {
    return code === "Space" || code === "KeyW" || code === "ArrowUp";
  }

  function isForceKey(code) {
    return code === "KeyF" || code === "ShiftLeft" || code === "ShiftRight";
  }

  function tryStart() {
    if (mode !== STATE.TITLE) return false;
    AudioFX.ensure();
    AudioFX.startBed();
    spawnRun();
    return true;
  }

  function keyDown(code) {
    const now = performance.now();
    if (isSlashKey(code)) {
      if (tryStart()) return false;
      onSlash(now);
      return false;
    }
    if (isJumpKey(code)) {
      if (tryStart()) return false;
      if (player) player.bufferJump(now);
      keys.jump = true;
      return false;
    }
    if (isForceKey(code)) onForce(now);
    if (code === "KeyE") interact(now);
    if (code === "KeyR") restart();
    if (code === "KeyM") {
      const m = AudioFX.toggleMute();
      showToast(m ? "Muted" : "SFX on");
    }
    if (code === "Enter") tryStart();
    return true;
  }

  function keyUp(code) {
    if (isJumpKey(code)) {
      keys.jump = false;
      if (player) player.releaseJump();
    }
  }

  function pointerAction(now = performance.now()) {
    if (tryStart()) return;
    if (mode === STATE.PLAY) onSlash(now);
    else if (mode === STATE.DEAD || mode === STATE.WIN) restart();
  }

  function objectiveText() {
    const left = aliveCount();
    if (left > 0) return `Defeat hostiles — ${left} remaining`;
    return "Reach the green EXIT pad";
  }

  function updateHUD(now) {
    if (!hud) return;

    const playing = mode !== STATE.TITLE;
    hud.titleScreen.classList.toggle("hidden", playing);
    hud.playHud.classList.toggle("hidden", !playing);
    if (hud.consoleOverlay) hud.consoleOverlay.classList.add("hidden");
    hud.endOverlay.classList.toggle("hidden", mode !== STATE.WIN && mode !== STATE.DEAD);

    if (!playing) {
      if (hud.bestTitle) {
        hud.bestTitle.textContent = bestMs != null ? `Best: ${formatTime(bestMs)}` : "";
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
      hud.invSword.textContent = inventory.sword ? "BLADE" : "BLADE:—";
      hud.invSword.classList.toggle("lit", inventory.sword);
    }
    if (hud.invPad) {
      hud.invPad.textContent = inventory.cleared ? "EXIT:OPEN" : "EXIT:LOCK";
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
      hud.tutorial.textContent = "←→ / A D move · Space jump · Click or Z slash";
    } else {
      hud.tutorial.classList.add("hidden");
    }

    if (mode === STATE.WIN || mode === STATE.DEAD) {
      const won = mode === STATE.WIN;
      hud.endTitle.textContent = won ? "CLEARED!" : "DOWNED";
      hud.endTitle.classList.toggle("win", won);
      hud.endTitle.classList.toggle("lose", !won);
      hud.endSub.textContent = won ? `Time ${formatTime(runTime)}` : "The canyon claims another hybrid.";
      hud.endBest.textContent = won && bestMs != null ? `Best ${formatTime(bestMs)}` : "";
    }
  }

  function render(now) {
    updateHUD(now);
    if (mode === STATE.TITLE) {
      if (scene) scene.setTitleCamera();
      return;
    }
    if (scene && player) {
      scene.syncFrame(player, enemies, loot, inventory, now);
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
    pointerAction,
    clearKeys,
    syncMovementKeys,
    bind,
    getMode: () => mode,
  };
})();
