/* ELOVE GAME - 2D canvas entry */
import { AudioFX } from "./audio.js";
import { Game } from "./game.js?v=deploy-assets-20261111";
import { Scene2D } from "./render2d.js?v=deploy-assets-20261111";
import { preloadArt } from "./assets.js?v=deploy-assets-20261111";
import { isDebugMode, unlockAllLevels } from "./levels.js?v=deploy-assets-20261111";

const wrap = document.getElementById("game-wrap");

window.addEventListener("error", (e) => {
  console.error(e.error || e.message);
  window.__eloveErr = String(e.message || e.error || "error");
});
window.addEventListener("unhandledrejection", (e) => {
  console.error(e.reason);
  window.__eloveErr = String(e.reason);
});

const hud = {
  titleScreen: document.getElementById("title-screen"),
  playHud: document.getElementById("play-hud"),
  time: document.getElementById("hud-time"),
  best: document.getElementById("hud-best"),
  bestTitle: document.getElementById("title-best"),
  titleSub: document.getElementById("title-sub"),
  titleToast: document.getElementById("title-toast"),
  levelBtns: [...document.querySelectorAll(".level-btn")],
  hp: document.getElementById("hud-hp"),
  invKey: document.getElementById("inv-key"),
  invSword: document.getElementById("inv-sword"),
  invPad: document.getElementById("inv-pad"),
  invDoor: document.getElementById("inv-door"),
  eyeTimer: document.getElementById("eye-timer"),
  toast: document.getElementById("toast"),
  objective: document.getElementById("objective"),
  tutorial: document.getElementById("tutorial"),
  consoleOverlay: document.getElementById("console-overlay"),
  endOverlay: document.getElementById("end-overlay"),
  endTitle: document.getElementById("end-title"),
  endSub: document.getElementById("end-sub"),
  endClueNote: document.getElementById("end-clue-note"),
  endClueText: document.getElementById("end-clue-text"),
  endClueChannel: document.getElementById("end-clue-channel"),
  endBest: document.getElementById("end-best"),
  endHint: document.getElementById("end-hint"),
};

const scene = new Scene2D(wrap);
Game.bind(scene, hud);
// Editing / capture hooks (matches __ELOVE_ART / __ELOVE_DISPLAY)
window.__ELOVE = { Game, scene, booted: false };

for (const btn of hud.levelBtns) {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    Game.selectLevel(Game.parseLevelId(btn.dataset.level));
  });
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
}

const pressed = new Set();
let lastMs = performance.now();
let bootstrapped = false;

function pollKeys() {
  Game.syncMovementKeys({
    left: pressed.has("ArrowLeft") || pressed.has("KeyA"),
    right: pressed.has("ArrowRight") || pressed.has("KeyD"),
    jump: pressed.has("ArrowUp") || pressed.has("KeyW") || pressed.has("Space"),
  });
}

window.addEventListener("blur", () => {
  pressed.clear();
  Game.clearKeys();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pressed.clear();
    Game.clearKeys();
    AudioFX.setPaused?.(true);
  } else {
    AudioFX.setPaused?.(false);
  }
});

window.addEventListener("keydown", (e) => {
  pressed.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  if (bootstrapped) Game.keyDown(e.code);
});

window.addEventListener("keyup", (e) => {
  pressed.delete(e.code);
  if (bootstrapped) Game.keyUp(e.code);
});

window.addEventListener("pointerdown", () => AudioFX.ensure());

function frame(now) {
  const dt = Math.min(50, now - lastMs);
  lastMs = now;
  try {
    if (bootstrapped) {
      pollKeys();
      Game.update(dt, now);
      Game.render(now);
    }
    scene.render();
  } catch (err) {
    console.error(err);
    window.__eloveErr = String(err?.message || err);
  }
  requestAnimationFrame(frame);
}

async function boot() {
  try {
    await preloadArt();
  } catch (err) {
    console.warn("Art preload partial/failed - procedural fallback:", err);
  }
  let q = null;
  try {
    q = new URLSearchParams(location.search);
  } catch (_) {}

  const debug = isDebugMode(q);
  if (debug) {
    unlockAllLevels();
  }

  scene.buildWorld();

  // Robust level query: prefer ?level=N; also tolerate mis-encoded ?level%3DN
  // (browsers parse that as a bare key "level=N" with empty value).
  function debugLevelId() {
    const raw = q?.get("level");
    if (
      raw === "2.5.5" ||
      raw === "2_5_5" ||
      raw === "255" ||
      raw === "2.55" ||
      raw === "neuralink"
    )
      return 2.55;
    if (raw === "2.5" || raw === "2_5" || raw === "25") return 2.5;
    if (raw === "4.5" || raw === "4_5" || raw === "45" || raw === "moon") return 4.5;
    if (raw === "5" || raw === "starship" || raw === "ship") return 5;
    if (raw === "1" || raw === "2" || raw === "3" || raw === "4") return Number(raw);
    if (raw === "starship" || q?.get("starship") === "1") return 5;
    if (raw === "moon" || q?.get("moon") === "1") return 4.5;
    if (raw === "spacex" || q?.get("spacex") === "1") return 4;
    if (raw === "tesla" || q?.get("tesla") === "1") return 3;
    if (raw === "neuralink" || q?.get("neuralink") === "1") return 2.55;
    if (raw === "boring" || q?.get("boring") === "1") return 2.5;
    if (raw === "cake" || q?.get("cake") === "1") return 2;
    if (!q) return null;
    for (const key of q.keys()) {
      const m =
        /^level=(2\.5\.5|2_5_5|255|2\.55|2\.5|2_5|25|4\.5|4_5|45|[12345])$/i.exec(key);
      if (m) {
        const v = m[1];
        if (v === "2.5.5" || v === "2_5_5" || v === "255" || v === "2.55") return 2.55;
        if (v === "2.5" || v === "2_5" || v === "25") return 2.5;
        if (v === "4.5" || v === "4_5" || v === "45") return 4.5;
        return Number(v);
      }
    }
    return null;
  }

  const levelParam = debugLevelId();

  if (levelParam === 5) {
    Game.start({ levelId: 5 });
    Game.startLevel(5, { force: true });
  } else if (levelParam === 4.5) {
    Game.start({ levelId: 4.5 });
    Game.startLevel(4.5, { force: true });
  } else if (levelParam === 4) {
    Game.start({ levelId: 4 });
    Game.startLevel(4, { force: true });
  } else if (levelParam === 3) {
    Game.start({ levelId: 3 });
    Game.startLevel(3, { force: true });
  } else if (levelParam === 2.55) {
    Game.start({ levelId: 2.55 });
    Game.startLevel(2.55, { force: true });
  } else if (levelParam === 2.5) {
    Game.start({ levelId: 2.5 });
    Game.startLevel(2.5, { force: true });
  } else if (levelParam === 2) {
    Game.start({ levelId: 2 });
    Game.startLevel(2, { force: true });
  } else if (levelParam === 1) {
    Game.start({ levelId: 1 });
    Game.startLevel(1, { force: true });
  } else if (debug) {
    // Debug editing session -> Cake Realm (use ?level=1 ... ?level=5 for others)
    Game.start({ levelId: 2 });
  } else {
    Game.start({ levelId: 1 });
  }

  bootstrapped = true;
  window.__ELOVE.booted = true;
  const strip = document.getElementById("asset-strip");
  if (strip) strip.classList.add("hidden");
}

boot();
requestAnimationFrame(frame);
