/* Core game state — lab escape vertical slice (2D canvas) */
import { CFG, TILE } from "./config.js";
import { World } from "./world.js";
import { Player, Cyborg } from "./entities.js";
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
  let inventory = { key: false, sword: false, consoleRead: false, buttonPressed: false, doorUnlocked: false };
  let runStart = 0;
  let runTime = 0;
  let keyDeadline = null;
  let bestMs = null;
  let toast = "";
  let toastUntil = 0;
  let wakeUntil = 0;
  let consoleOpen = false;
  let keys = { left: false, right: false, up: false, down: false };
  let exitNagUntil = 0;
  let tutorialUntil = 0;
  let scene = null;
  let hud = null;
  let forceFlashUntil = 0;

  function clearKeys() {
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
  }

  function syncMovementKeys(state) {
    if (!state || !state.focused) {
      clearKeys();
      return;
    }
    keys.left = !!state.left;
    keys.right = !!state.right;
    keys.up = !!state.up;
    keys.down = !!state.down;
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

    player = new Player(6 * CFG.TILE + 8, 7 * CFG.TILE + 8);
    enemies = [
      new Cyborg(18 * CFG.TILE, 11 * CFG.TILE, true),
      new Cyborg(22 * CFG.TILE, 16 * CFG.TILE, false),
      new Cyborg(15 * CFG.TILE, 18 * CFG.TILE, false),
    ];
    loot = [{ type: "sword", x: 15 * CFG.TILE + 8, y: 12 * CFG.TILE + 4, taken: false }];
    inventory = { key: false, sword: false, consoleRead: false, buttonPressed: false, doorUnlocked: false };
    keyDeadline = null;
    consoleOpen = false;
    clearKeys();
    runStart = performance.now();
    runTime = 0;
    mode = STATE.WAKE;
    wakeUntil = performance.now() + 1800;
    tutorialUntil = wakeUntil + 3200;
    showToast("Systems online… wake up, Meow Hybrid.", 1800);

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
    showToast("New run — escape the lab!", 1600);
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

  function interact(now) {
    if (!player || !player.alive || mode !== STATE.PLAY) return;
    const { tx, ty } = World.worldToTile(player.x, player.y);
    player.state = "grab";

    for (const item of loot) {
      if (item.taken) continue;
      if (near(player.x, player.y, item.x, item.y, 14)) {
        item.taken = true;
        if (item.type === "sword") {
          inventory.sword = true;
          showToast("Giant sword acquired! Slash hits harder.");
        } else if (item.type === "eye") {
          inventory.key = true;
          keyDeadline = now + CFG.KEY_TIMER_MS;
          showToast("Cyborg eye-key! Door timer started!");
        }
        AudioFX.pickup();
        return;
      }
    }

    if (World.get(tx, ty) === TILE.CLOSET || World.get(tx + 1, ty) === TILE.CLOSET || World.get(tx, ty - 1) === TILE.CLOSET) {
      if (!inventory.sword) {
        const sword = loot.find((l) => l.type === "sword");
        if (sword && !sword.taken) {
          sword.taken = true;
          inventory.sword = true;
          AudioFX.pickup();
          showToast("Sword yanked from the closet!");
          return;
        }
      }
      showToast("Closet: empty lab coats & glitter.");
      return;
    }

    if (
      World.get(tx, ty) === TILE.CONSOLE ||
      World.get(tx, ty - 1) === TILE.CONSOLE ||
      World.get(tx + 1, ty) === TILE.CONSOLE ||
      near(player.x, player.y, 19 * CFG.TILE + 8, 4 * CFG.TILE + 8, 20)
    ) {
      inventory.consoleRead = true;
      consoleOpen = !consoleOpen;
      AudioFX.pickup();
      if (consoleOpen) showToast("Console: cryptic uplink online.", 2500);
      return;
    }

    if (near(player.x, player.y, 21 * CFG.TILE + 2, 5 * CFG.TILE + 10, 12) || World.get(tx, ty) === TILE.HIDDEN_BTN) {
      if (!inventory.buttonPressed) {
        inventory.buttonPressed = true;
        AudioFX.unlock();
        showToast("Hidden button clicked! Exit pad armed.");
      } else {
        showToast("Button already pressed.");
      }
      return;
    }

    if (
      near(player.x, player.y, 33 * CFG.TILE, 18.5 * CFG.TILE, 22) ||
      World.get(tx, ty) === TILE.DOOR_LOCKED ||
      World.get(tx, ty) === TILE.DOOR_OPEN
    ) {
      if (inventory.doorUnlocked) {
        showToast("Door is open — reach the green pad!");
        return;
      }
      if (!inventory.key) {
        showToast("Locked. Needs a cyborg eye-key.");
        return;
      }
      if (keyDeadline && now > keyDeadline) {
        showToast("Timer expired! Eye-key fried. Defeat another? (restart)");
        inventory.key = false;
        keyDeadline = null;
        const hasKeyEnemy = enemies.some((e) => e.dropsKey && e.alive);
        if (!hasKeyEnemy) {
          enemies.push(new Cyborg(20 * CFG.TILE, 12 * CFG.TILE, true));
          showToast("A spare cyborg stomps in with a fresh eye…");
        }
        return;
      }
      inventory.doorUnlocked = true;
      World.unlockDoor();
      keyDeadline = null;
      AudioFX.unlock();
      showToast("Door unlocked!");
      return;
    }

    showToast("Nothing to use here.");
  }

  function update(dt, now) {
    if (mode === STATE.TITLE) return;

    if (mode === STATE.WAKE) {
      if (now >= wakeUntil) {
        mode = STATE.PLAY;
        showToast("WASD move · E interact · J slash — grab the sword!", 3200);
      }
      return;
    }

    if (mode === STATE.PLAY) {
      runTime = now - runStart;
      player.update(dt, keys, now);
      for (const e of enemies) e.update(dt, player, now);

      for (const item of loot) {
        if (!item.taken && near(player.x, player.y, item.x, item.y, 10)) {
          if (item.type === "eye") {
            item.taken = true;
            inventory.key = true;
            keyDeadline = now + CFG.KEY_TIMER_MS;
            AudioFX.pickup();
            showToast("Eye-key grabbed! Race the door!");
          }
        }
      }

      if (keyDeadline) {
        const left = keyDeadline - now;
        if (left > 0 && left < 5000 && Math.floor(left / 500) !== Math.floor((left + dt) / 500)) {
          AudioFX.tick();
        }
        if (left <= 0) {
          keyDeadline = null;
          inventory.key = false;
          showToast("Lockdown! Eye-key burned out.");
          enemies.push(new Cyborg(17 * CFG.TILE, 10 * CFG.TILE, true));
        }
      }

      const { tx, ty } = World.worldToTile(player.x, player.y);
      if (World.get(tx, ty) === TILE.EXIT) {
        if (inventory.doorUnlocked && !inventory.buttonPressed) {
          if (now > exitNagUntil) {
            showToast("Pad inert — find the hidden console button!");
            exitNagUntil = now + 2000;
          }
        } else if (inventory.doorUnlocked && inventory.buttonPressed) {
          mode = STATE.WIN;
          player.state = "success";
          const record = saveBest(runTime);
          AudioFX.win();
          if (scene) scene.playWinFlourish(player);
          showToast(record ? "NEW BEST ESCAPE!" : "Escaped to the rocket bay!", 4000);
        }
      }

      if (!player.alive) {
        mode = STATE.DEAD;
        if (scene) scene.playDeathFlourish(player);
        showToast("Systems down… press R to retry.", 5000);
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
      if (near(hb.x, hb.y, e.x, e.y, hb.r + (dmgBonus ? 4 : 0))) {
        if (scene) scene.playHitSparks(e.x, e.y, e.dropsKey ? CFG.COLORS.cyan : CFG.COLORS.gold);
        const drop = e.takeHit(now, player.x);
        if (dmgBonus && e.alive) e.takeHit(now, player.x);
        if (drop && drop.type === "eye") {
          loot.push({ type: "eye", x: drop.x, y: drop.y - 4, taken: false });
          showToast("Eye-key dropped! Press E near it.");
        }
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
    forceFlashUntil = now + 200;
    if (scene) scene.showForceRing(player, now);
    showToast(hit ? `Cute-energy toss! (${hit})` : "No targets in range.");
  }

  function keyDown(code) {
    const now = performance.now();
    if (code === "KeyJ" || code === "Space") {
      onSlash(now);
      return false;
    }
    if (code === "KeyE") interact(now);
    if (code === "KeyF") onForce(now);
    if (code === "KeyR") restart();
    if (code === "KeyM") {
      const m = AudioFX.toggleMute();
      showToast(m ? "Muted" : "SFX on");
    }
    if (code === "Enter" && mode === STATE.TITLE) {
      AudioFX.ensure();
      AudioFX.startBed();
      spawnRun();
    }
    return true;
  }

  function keyUp(_code) {}

  function objectiveText() {
    if (!inventory.sword) return "Grab the sword from the closet";
    const keyEnemyAlive = enemies.some((e) => e.dropsKey && e.alive);
    const eyeLoot = loot.some((l) => l.type === "eye" && !l.taken);
    if (!inventory.key) {
      if (eyeLoot) return "Pick up the eye-key (E)";
      if (keyEnemyAlive) return "Defeat the marked cyborg";
      return "Defeat the marked cyborg";
    }
    if (!inventory.doorUnlocked) return "Use the eye-key on the door — hurry!";
    if (!inventory.buttonPressed) {
      if (!inventory.consoleRead) return "Read the console (north) for a clue";
      return "Find the hidden button near the console";
    }
    return "Reach the green EXIT pad";
  }

  function updateHUD(now) {
    if (!hud) return;

    const playing = mode !== STATE.TITLE;

    hud.titleScreen.classList.toggle("hidden", playing);
    hud.playHud.classList.toggle("hidden", !playing);
    hud.consoleOverlay.classList.toggle("hidden", !consoleOpen || !playing);
    hud.endOverlay.classList.toggle("hidden", mode !== STATE.WIN && mode !== STATE.DEAD);

    if (!playing) {
      if (hud.bestTitle) {
        hud.bestTitle.textContent = bestMs != null ? `Best: ${formatTime(bestMs)}` : "";
      }
      return;
    }

    hud.time.textContent = `TIME ${formatTime(runTime)}`;
    hud.best.textContent = bestMs != null ? `BEST ${formatTime(bestMs)}` : "";

    // HP
    let hearts = "";
    for (let i = 0; i < player.maxHp; i++) {
      hearts += `<span class="heart ${i < player.hp ? "on" : "off"}"></span>`;
    }
    hud.hp.innerHTML = hearts;

    hud.invKey.textContent = inventory.key ? "KEY:EYE" : "KEY:—";
    hud.invKey.classList.toggle("lit", inventory.key);
    hud.invSword.textContent = inventory.sword ? "SWORD" : "SWORD:—";
    hud.invSword.classList.toggle("lit", inventory.sword);
    hud.invPad.textContent = inventory.buttonPressed ? "PAD:ARMED" : "PAD:OFF";
    hud.invPad.classList.toggle("lit", inventory.buttonPressed);
    hud.invDoor.textContent = inventory.doorUnlocked ? "DOOR:OPEN" : "DOOR:LOCK";
    hud.invDoor.classList.toggle("lit", inventory.doorUnlocked);
    hud.invDoor.classList.toggle("danger", !inventory.doorUnlocked);

    if (keyDeadline && mode === STATE.PLAY) {
      const left = Math.max(0, keyDeadline - now);
      hud.eyeTimer.classList.remove("hidden");
      hud.eyeTimer.textContent = `EYE TIMER ${formatTime(left)}`;
      hud.eyeTimer.classList.toggle("urgent", left < 8000);
    } else {
      hud.eyeTimer.classList.add("hidden");
    }

    if (now < toastUntil && toast) {
      hud.toast.classList.remove("hidden");
      hud.toast.textContent = toast;
    } else {
      hud.toast.classList.add("hidden");
    }

    hud.objective.textContent = objectiveText();

    if (mode === STATE.PLAY && now < tutorialUntil && now >= wakeUntil) {
      hud.tutorial.classList.remove("hidden");
    } else {
      hud.tutorial.classList.add("hidden");
    }

    if (mode === STATE.WIN || mode === STATE.DEAD) {
      const won = mode === STATE.WIN;
      hud.endTitle.textContent = won ? "ESCAPED!" : "DOWNED";
      hud.endTitle.classList.toggle("win", won);
      hud.endTitle.classList.toggle("lose", !won);
      hud.endSub.textContent = won ? `Time ${formatTime(runTime)}` : "The lab claims another hybrid.";
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
    clearKeys,
    syncMovementKeys,
    bind,
    getMode: () => mode,
  };
})();
