/* ELOVE GAME — 2D canvas entry */
import { AudioFX } from "./audio.js";
import { Game } from "./game.js";
import { Scene2D } from "./render2d.js";
import { preloadArt } from "./assets.js";

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
  endBest: document.getElementById("end-best"),
};

const scene = new Scene2D(wrap);
Game.bind(scene, hud);

const pressed = new Set();
let lastMs = performance.now();
let bootstrapped = false;

function pollKeys() {
  Game.syncMovementKeys({
    left: pressed.has("ArrowLeft") || pressed.has("KeyA"),
    right: pressed.has("ArrowRight") || pressed.has("KeyD"),
    jump: pressed.has("ArrowUp") || pressed.has("KeyW") || pressed.has("Space"),
    focused: document.hasFocus(),
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
  if (bootstrapped) {
    pollKeys();
    Game.update(dt, now);
    Game.render(now);
  }
  scene.render();
  requestAnimationFrame(frame);
}

async function boot() {
  try {
    await preloadArt();
  } catch (err) {
    console.warn("Art preload partial/failed — procedural fallback:", err);
  }
  scene.buildWorld();
  Game.start();
  bootstrapped = true;
  const strip = document.getElementById("asset-strip");
  if (strip) strip.classList.remove("hidden");
}

boot();
requestAnimationFrame(frame);
