/**
 * Per-animation Grok Imagine videos -> clean (non-pixelated) enemy sprite sheets.
 *
 * Mirrors scripts/grok-player-per-anim.mjs for enemy-drone + enemy-cyborg.
 * Does NOT run pixelate / harden / 90-grid rebuild.
 *
 * Usage (PowerShell):
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-enemies-per-anim.mjs
 *   node scripts/grok-enemies-per-anim.mjs --only drone
 *   node scripts/grok-enemies-per-anim.mjs --only cyborg:idle,walk
 *   node scripts/grok-enemies-per-anim.mjs --reuse-video
 *   node scripts/grok-enemies-per-anim.mjs --no-edit
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IM = path.join(ROOT, "assets", "imagine");
const SHEETS_DIR = path.join(IM, "sheets");

const VIDEO_API = "https://api.x.ai/v1/videos/generations";
const VIDEO_EDIT_API = "https://api.x.ai/v1/videos/edits";
const VIDEO_MODEL = process.env.GROK_VIDEO_MODEL || "grok-imagine-video";

const CELL = Number(process.env.ENEMY_SHEET_CELL || 256);
const ASPECT = "1:1";
const RESOLUTION = process.env.GROK_VIDEO_RES || "480p";

const DRONE_LOOK = [
  "Exact same side-view hostile combat drone facing left,",
  "dark charcoal metallic body, twin glowing red eyes, magenta and cyan neon trim,",
  "small thruster glow at the rear, compact insectoid hover silhouette.",
  "Clean 2D game character art (NOT pixel art, NOT chunky pixels, NOT low-res), smooth readable silhouette,",
  "stylized chibi-adjacent synthwave look matching the cat-on-rocket game aesthetic,",
  "solid pure black background #000000, static camera, locked framing, subject SAME size every frame,",
  "NO neon glow outline, NO magenta rim light, NO text, NO HUD, NO ground, NO camera zoom or pan.",
].join(" ");

const CYBORG_LOOK = [
  "Exact same side-view white-armored cyborg soldier facing right,",
  "light gray / off-white segmented power armor, glowing red horizontal visor,",
  "magenta and cyan neon armor accents, humanoid full-body readable silhouette.",
  "Clean 2D game character art (NOT pixel art, NOT chunky pixels, NOT low-res), smooth readable silhouette,",
  "stylized synthwave look matching the cat-on-rocket game aesthetic,",
  "solid pure black background #000000, static camera, locked framing, character SAME size every frame,",
  "NO neon glow outline, NO magenta rim light, NO text, NO HUD, NO ground, NO camera zoom or pan.",
].join(" ");

const ENEMIES = [
  {
    id: "enemy-drone",
    short: "drone",
    still: path.join(IM, "enemy-drone.png"),
    stillFallback: path.join(
      ROOT,
      "archive",
      "animated-assets",
      "imagine",
      "enemy-drone.png"
    ),
    videoDir: path.join(IM, "video", "drone-anims"),
    framesDir: path.join(IM, "frames", "video", "enemy-drone"),
    sheetPrefix: "enemy-drone",
    order: ["fly", "hurt"],
    anims: [
      {
        name: "fly",
        duration: 3,
        frames: 6,
        holdMs: 180,
        motion: [
          DRONE_LOOK,
          "FLY / HOVER loop: thruster flicker, slight hover bob up and down, rotors/fins tiny vibration.",
          "Loopable flight cycle - start and end pose nearly identical. Locked scale.",
        ].join(" "),
        videoEdit: [
          "Keep the dark combat drone identical. Replace background with solid pure black #000000.",
          "Clean smooth 2D game sprite look (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "hurt",
        duration: 2,
        frames: 3,
        holdMs: 120,
        motion: [
          DRONE_LOOK,
          "HURT / RECOIL: drone flinches, tilts back, sparks or brief stun wobble, thruster sputter.",
          "Short damage reaction, locked framing and scale. Solid black background.",
        ].join(" "),
        videoEdit: [
          "Keep the dark combat drone identical. Solid pure black #000000 background.",
          "Clean smooth 2D hurt sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
    ],
  },
  {
    id: "enemy-cyborg",
    short: "cyborg",
    still: path.join(IM, "enemy-cyborg-idle.png"),
    stillFallback: path.join(
      ROOT,
      "archive",
      "animated-assets",
      "imagine",
      "enemy-cyborg-idle.png"
    ),
    stillFallback2: path.join(IM, "enemy-cyborg.png"),
    videoDir: path.join(IM, "video", "cyborg-anims"),
    framesDir: path.join(IM, "frames", "video", "enemy-cyborg"),
    sheetPrefix: "enemy-cyborg",
    order: ["idle", "walk", "attack", "hurt"],
    anims: [
      {
        name: "idle",
        duration: 3,
        frames: 4,
        holdMs: 450,
        motion: [
          CYBORG_LOOK,
          "IDLE loop: subtle breathing sway, visor pulse, weight shift on feet.",
          "Loopable idle - start and end pose nearly identical. Calm, centered, full body visible.",
        ].join(" "),
        videoEdit: [
          "Keep the white-armored cyborg identical. Replace background with solid pure black #000000.",
          "Clean smooth 2D game sprite look (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "walk",
        duration: 3,
        frames: 6,
        holdMs: 140,
        motion: [
          CYBORG_LOOK,
          "WALK cycle in place: clear left-right step cycle, arms swing slightly, armor plates articulate.",
          "Loopable walk - start and end pose nearly identical. Full body large and readable. Locked scale.",
        ].join(" "),
        videoEdit: [
          "Keep the white-armored cyborg identical. Solid pure black #000000 background.",
          "Clean smooth 2D walk sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "attack",
        duration: 2,
        frames: 4,
        holdMs: [160, 100, 55, 150],
        motion: [
          CYBORG_LOOK,
          "ATTACK: wind-up, raise arm blaster or punch forward to the right, muzzle flash / energy blast,",
          "impact pose, recover. Keep full body large - do not shrink for the attack. Not a loop.",
        ].join(" "),
        videoEdit: [
          "Keep the white-armored cyborg identical. Solid pure black #000000 background.",
          "Clean smooth 2D attack sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "hurt",
        duration: 2,
        frames: 3,
        holdMs: 120,
        motion: [
          CYBORG_LOOK,
          "HURT / RECOIL: cyborg flinches, visor flickers, staggers back slightly, brief stun wobble.",
          "Short damage reaction, locked framing and scale. Solid black background.",
        ].join(" "),
        videoEdit: [
          "Keep the white-armored cyborg identical. Solid pure black #000000 background.",
          "Clean smooth 2D hurt sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
    ],
  },
  {
    id: "enemy-optimus",
    short: "optimus",
    still: path.join(IM, "enemy-optimus.png"),
    stillFallback: path.join(IM, "_raw", "optimus", "optimus-idle-00.png"),
    videoDir: path.join(IM, "video", "optimus-anims"),
    framesDir: path.join(IM, "frames", "video", "enemy-optimus"),
    sheetPrefix: "enemy-optimus",
    order: ["idle", "walk", "attack", "hurt"],
    anims: [
      {
        name: "idle",
        duration: 3,
        frames: 4,
        holdMs: 450,
        motion: [
          "Exact same side-view Tesla Optimus humanoid robot facing right,",
          "white and light-gray articulated body panels, black joint seals,",
          "rectangular head with dark visor strip glowing soft cyan, red chest accent,",
          "Clean 2D game character art (NOT pixel art), solid pure black #000000 background,",
          "static camera, locked framing, SAME size every frame, NO neon glow outline, NO text.",
          "IDLE loop: subtle breathing sway, visor pulse, weight shift. Loopable.",
        ].join(" "),
        videoEdit: [
          "Keep the Optimus robot identical. Solid pure black #000000 background.",
          "Clean smooth 2D game sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "walk",
        duration: 3,
        frames: 6,
        holdMs: 140,
        motion: [
          "Exact same side-view Tesla Optimus humanoid robot facing right,",
          "white and light-gray panels, cyan visor, red chest accent,",
          "Clean 2D game art, solid black #000000, locked scale.",
          "WALK cycle in place: clear left-right steps, arms swing. Loopable. Full body readable.",
        ].join(" "),
        videoEdit: [
          "Keep Optimus identical. Solid pure black #000000 background.",
          "Clean smooth 2D walk sprite. No neon outlines. No text.",
        ].join(" "),
      },
      {
        name: "attack",
        duration: 2,
        frames: 4,
        holdMs: [160, 100, 55, 150],
        motion: [
          "Exact same side-view Tesla Optimus robot facing right,",
          "ATTACK: wind-up, punch forward to the right, impact, recover. Full body large. Not a loop.",
          "Solid black #000000, locked framing.",
        ].join(" "),
        videoEdit: [
          "Keep Optimus identical. Solid pure black #000000 background.",
          "Clean smooth 2D attack sprite. No neon outlines. No text.",
        ].join(" "),
      },
      {
        name: "hurt",
        duration: 2,
        frames: 3,
        holdMs: 120,
        motion: [
          "Exact same side-view Tesla Optimus robot facing right,",
          "HURT / RECOIL: flinch, stagger back, visor flicker. Short damage reaction. Locked scale.",
          "Solid black #000000.",
        ].join(" "),
        videoEdit: [
          "Keep Optimus identical. Solid pure black #000000 background.",
          "Clean smooth 2D hurt sprite. No neon outlines. No text.",
        ].join(" "),
      },
    ],
  },
  {
    id: "enemy-carbot",
    short: "carbot",
    still: path.join(IM, "enemy-carbot.png"),
    stillFallback: path.join(IM, "_raw", "carbot", "carbot-idle-00.png"),
    videoDir: path.join(IM, "video", "carbot-anims"),
    framesDir: path.join(IM, "frames", "video", "enemy-carbot"),
    sheetPrefix: "enemy-carbot",
    order: ["idle", "walk", "attack", "hurt"],
    anims: [
      {
        name: "idle",
        duration: 3,
        frames: 4,
        holdMs: 420,
        motion: [
          "Exact same side-view Tesla car-droid boss facing right,",
          "white sedan chassis hybrid with Optimus robotic legs, cyan visor head, red T logo,",
          "Clean 2D game character art (NOT pixel art), solid pure black #000000 background,",
          "static camera, locked framing, SAME size every frame, NO neon glow outline, NO text.",
          "IDLE loop: subtle chassis bob, visor pulse, weight shift. Loopable.",
        ].join(" "),
        videoEdit: [
          "Keep the Tesla car-droid identical. Solid pure black #000000 background.",
          "Clean smooth 2D game sprite (not pixel art). Remove neon glow outlines. No text.",
        ].join(" "),
      },
      {
        name: "walk",
        duration: 3,
        frames: 6,
        holdMs: 120,
        motion: [
          "Exact same side-view Tesla car-droid boss facing right,",
          "WALK/drive cycle in place: robotic legs stride, chassis bob. Loopable. Full body readable.",
          "Solid black #000000, locked scale.",
        ].join(" "),
        videoEdit: [
          "Keep car-droid identical. Solid pure black #000000 background.",
          "Clean smooth 2D walk sprite. No neon outlines. No text.",
        ].join(" "),
      },
      {
        name: "attack",
        duration: 2,
        frames: 4,
        holdMs: [180, 90, 70, 160],
        motion: [
          "Exact same side-view Tesla car-droid boss facing right,",
          "ATTACK: wind-up ram charge, lunge forward to the right, impact, recover. Full body large. Not a loop.",
          "Solid black #000000, locked framing.",
        ].join(" "),
        videoEdit: [
          "Keep car-droid identical. Solid pure black #000000 background.",
          "Clean smooth 2D attack sprite. No neon outlines. No text.",
        ].join(" "),
      },
      {
        name: "hurt",
        duration: 2,
        frames: 3,
        holdMs: 110,
        motion: [
          "Exact same side-view Tesla car-droid boss facing right,",
          "HURT / RECOIL: flinch, stagger back, visor flicker. Short damage reaction. Locked scale.",
          "Solid black #000000.",
        ].join(" "),
        videoEdit: [
          "Keep car-droid identical. Solid pure black #000000 background.",
          "Clean smooth 2D hurt sprite. No neon outlines. No text.",
        ].join(" "),
      },
    ],
  },
];

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  let only = null;
  const oi = argv.indexOf("--only");
  if (oi >= 0 && argv[oi + 1]) only = argv[oi + 1];
  for (const a of argv) {
    if (a.startsWith("--only=")) only = a.split("=")[1];
  }
  return {
    only,
    edit: !flags.has("--no-edit"),
    reuseVideo: flags.has("--reuse-video"),
  };
}

/** Parse --only drone | cyborg | drone:fly,attack | fly,attack (both) */
function selectQueue(only) {
  if (!only) {
    return ENEMIES.map((e) => ({ enemy: e, anims: e.anims }));
  }
  const parts = only.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const byEnemy = new Map();
  let bareAnims = [];

  for (const p of parts) {
    if (p.includes(":")) {
      const [who, anims] = p.split(":");
      const enemy = ENEMIES.find((e) => e.short === who || e.id === who);
      if (!enemy) continue;
      const names = anims.split("+").map((s) => s.trim()).filter(Boolean);
      byEnemy.set(enemy.id, names.length ? names : enemy.anims.map((a) => a.name));
    } else if (p === "drone" || p === "enemy-drone") {
      byEnemy.set("enemy-drone", ENEMIES[0].anims.map((a) => a.name));
    } else if (p === "cyborg" || p === "enemy-cyborg") {
      byEnemy.set("enemy-cyborg", ENEMIES[1].anims.map((a) => a.name));
    } else if (p === "optimus" || p === "enemy-optimus") {
      const o = ENEMIES.find((e) => e.short === "optimus");
      if (o) byEnemy.set("enemy-optimus", o.anims.map((a) => a.name));
    } else if (p === "carbot" || p === "enemy-carbot") {
      const c = ENEMIES.find((e) => e.short === "carbot");
      if (c) byEnemy.set("enemy-carbot", c.anims.map((a) => a.name));
    } else {
      bareAnims.push(p);
    }
  }

  if (!byEnemy.size && bareAnims.length) {
    return ENEMIES.map((e) => ({
      enemy: e,
      anims: e.anims.filter((a) => bareAnims.includes(a.name)),
    })).filter((q) => q.anims.length);
  }

  if (!byEnemy.size) {
    return ENEMIES.map((e) => ({ enemy: e, anims: e.anims }));
  }

  return ENEMIES.filter((e) => byEnemy.has(e.id))
    .map((e) => ({
      enemy: e,
      anims: e.anims.filter((a) => byEnemy.get(e.id).includes(a.name)),
    }))
    .filter((q) => q.anims.length);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function fileToDataUrl(filePath, mime) {
  const buf = await fs.readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function startVideo(apiKey, body) {
  const res = await fetch(VIDEO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`video gen ${res.status}: ${text.slice(0, 500)}`);
  const json = JSON.parse(text);
  if (!json.request_id) throw new Error(`no request_id: ${text.slice(0, 300)}`);
  return json.request_id;
}

async function startVideoEdit(apiKey, videoUrl, prompt) {
  const res = await fetch(VIDEO_EDIT_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      video: { url: videoUrl },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`video edit ${res.status}: ${text.slice(0, 500)}`);
  const json = JSON.parse(text);
  if (!json.request_id) throw new Error(`no request_id: ${text.slice(0, 300)}`);
  return json.request_id;
}

async function pollVideo(apiKey, requestId, label) {
  const url = `https://api.x.ai/v1/videos/${requestId}`;
  const started = Date.now();
  while (Date.now() - started < 12 * 60 * 1000) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json();
    const status = json.status;
    const progress = json.progress ?? "?";
    process.stdout.write(`\r  [${label}] ${status} ${progress}%   `);
    if (status === "done") {
      process.stdout.write("\n");
      const videoUrl = json.video?.url;
      if (!videoUrl) throw new Error(`done but no url: ${JSON.stringify(json).slice(0, 400)}`);
      return { url: videoUrl, duration: json.video?.duration, raw: json };
    }
    if (status === "failed" || status === "expired") {
      process.stdout.write("\n");
      throw new Error(`${label} ${status}: ${JSON.stringify(json.error || json).slice(0, 400)}`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`${label} timed out`);
}

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

async function extractFrames(videoPath, count, outDir, prefix) {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dataUrl = await fileToDataUrl(videoPath, "video/mp4");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">
    <video id="v" muted playsinline preload="auto" src="${dataUrl}"></video>
    <canvas id="c"></canvas>
  </body></html>`);
  await page.waitForFunction(() => {
    const v = document.getElementById("v");
    return v && v.readyState >= 2 && Number.isFinite(v.duration) && v.duration > 0;
  }, null, { timeout: 60000 });

  const duration = await page.evaluate(() => document.getElementById("v").duration);
  const paths = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * Math.max(0, duration - 0.05);
    const b64 = await page.evaluate(async (seekTo) => {
      const v = document.getElementById("v");
      const c = document.getElementById("c");
      await new Promise((resolve, reject) => {
        const onSeek = () => {
          v.removeEventListener("seeked", onSeek);
          resolve();
        };
        v.addEventListener("seeked", onSeek);
        v.onerror = reject;
        v.currentTime = seekTo;
      });
      c.width = v.videoWidth || 512;
      c.height = v.videoHeight || 512;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/png").split(",")[1];
    }, t);
    const out = path.join(outDir, `${prefix}-${String(i).padStart(2, "0")}.png`);
    await fs.writeFile(out, Buffer.from(b64, "base64"));
    paths.push(out);
  }
  await browser.close();
  return paths;
}

/** Trim + punch black -> pack into sheet cells with smooth scaling (no pixel harden). */
async function stitchSheet(framePaths, outPath, cell = CELL) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const urls = [];
  for (const fp of framePaths) {
    urls.push(await fileToDataUrl(fp, "image/png"));
  }
  const outB64 = await page.evaluate(
    async ({ urls, cell }) => {
      const imgs = [];
      for (const src of urls) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });
        imgs.push(img);
      }

      function punchTrim(img) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        const w = c.width;
        const h = c.height;
        const seen = new Uint8Array(w * h);
        const stack = [];
        const isBg = (i) =>
          d[i] <= 18 && d[i + 1] <= 18 && d[i + 2] <= 18 && d[i + 3] > 0;
        const push = (x, y) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const p = y * w + x;
          if (seen[p] || !isBg(p * 4)) return;
          seen[p] = 1;
          stack.push(p);
        };
        for (let x = 0; x < w; x++) {
          push(x, 0);
          push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          push(0, y);
          push(w - 1, y);
        }
        while (stack.length) {
          const p = stack.pop();
          d[p * 4 + 3] = 0;
          const x = p % w;
          const y = (p / w) | 0;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }
        ctx.putImageData(data, 0, 0);

        let minX = w,
          minY = h,
          maxX = -1,
          maxY = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 8) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) return c;
        const out = document.createElement("canvas");
        out.width = maxX - minX + 1;
        out.height = maxY - minY + 1;
        const octx = out.getContext("2d");
        octx.imageSmoothingEnabled = true;
        octx.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        return out;
      }

      const trimmed = imgs.map(punchTrim);
      let maxW = 1,
        maxH = 1;
      for (const t of trimmed) {
        maxW = Math.max(maxW, t.width);
        maxH = Math.max(maxH, t.height);
      }
      const baseScale = Math.min(cell / maxW, cell / maxH) * 0.92;

      const c = document.createElement("canvas");
      c.width = cell * trimmed.length;
      c.height = cell;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < trimmed.length; i++) {
        const t = trimmed[i];
        const w = Math.max(1, Math.round(t.width * baseScale));
        const h = Math.max(1, Math.round(t.height * baseScale));
        const ox = i * cell + ((cell - w) / 2) | 0;
        const oy = ((cell - h) / 2) | 0;
        ctx.drawImage(t, ox, oy, w, h);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { urls, cell }
  );
  await browser.close();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
}

async function resolveStill(enemy) {
  if (await exists(enemy.still)) return enemy.still;
  if (enemy.stillFallback2 && (await exists(enemy.stillFallback2))) return enemy.stillFallback2;
  if (await exists(enemy.stillFallback)) return enemy.stillFallback;
  return null;
}

async function clearOldAnimFrames(framesDir, prefixes, fullClear) {
  await fs.mkdir(framesDir, { recursive: true });
  const existing = await fs.readdir(framesDir);
  for (const name of existing) {
    const pref = name.split("-")[0];
    const isNamed = prefixes.has(pref);
    const isLegacy = /^enemy-(drone|cyborg)-\d/.test(name);
    if (!isNamed && !isLegacy) continue;
    if (!fullClear) {
      if (isLegacy) continue;
      if (!prefixes.has(pref)) continue;
    }
    await fs.unlink(path.join(framesDir, name)).catch(() => {});
  }
}

async function processAnim(apiKey, enemy, anim, opts, stillPath) {
  console.log(`\n== ${enemy.short} ${anim.name} ==`);
  let videoPath = path.join(enemy.videoDir, `${anim.name}-edited.mp4`);
  if (!(await exists(videoPath))) {
    videoPath = path.join(enemy.videoDir, `${anim.name}.mp4`);
  }

  if (opts.reuseVideo) {
    if (!(await exists(videoPath))) {
      throw new Error(`no video at ${path.relative(ROOT, videoPath)}`);
    }
    console.log(`  reuse: ${path.relative(ROOT, videoPath)}`);
  } else {
    const imageDataUrl = await fileToDataUrl(stillPath, "image/png");
    process.stdout.write("  image->video... ");
    const genId = await startVideo(apiKey, {
      model: VIDEO_MODEL,
      prompt: anim.motion,
      duration: anim.duration,
      aspect_ratio: ASPECT,
      resolution: RESOLUTION,
      image: { url: imageDataUrl },
    });
    console.log(`request ${genId}`);
    const gen = await pollVideo(apiKey, genId, `${enemy.short}-${anim.name}-gen`);
    videoPath = path.join(enemy.videoDir, `${anim.name}.mp4`);
    await download(gen.url, videoPath);
    console.log(`  saved ${path.relative(ROOT, videoPath)}`);

    let videoUrl = gen.url;
    if (opts.edit && anim.videoEdit) {
      process.stdout.write("  video edit (black BG)... ");
      try {
        const editId = await startVideoEdit(apiKey, videoUrl, anim.videoEdit);
        console.log(`request ${editId}`);
        const edited = await pollVideo(apiKey, editId, `${enemy.short}-${anim.name}-edit`);
        videoPath = path.join(enemy.videoDir, `${anim.name}-edited.mp4`);
        await download(edited.url, videoPath);
        console.log(`  saved ${path.relative(ROOT, videoPath)}`);
      } catch (err) {
        console.log("\n  video edit skipped:", err.message || err);
      }
    }
  }

  console.log(`  extracting ${anim.frames} frames (clean)...`);
  const framePaths = await extractFrames(
    videoPath,
    anim.frames,
    enemy.framesDir,
    anim.name
  );
  console.log(`  frames -> ${path.relative(ROOT, enemy.framesDir)}/${anim.name}-*.png`);

  const sheetPath = path.join(SHEETS_DIR, `${enemy.sheetPrefix}-${anim.name}.png`);
  await stitchSheet(framePaths, sheetPath, CELL);
  console.log(`  sheet -> ${path.relative(ROOT, sheetPath)}`);

  return { anim, framePaths, videoPath, sheetPath };
}

async function mergeEnemyManifest(enemy, results, allAnims) {
  const manifestPath = path.join(SHEETS_DIR, "manifest.json");
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (_) {}

  const byName = Object.fromEntries(results.map((r) => [r.anim.name, r]));
  const combinedFrames = [];
  const animIndex = {};
  let idx = 0;
  for (const name of enemy.order) {
    const r = byName[name];
    if (!r) continue;
    animIndex[name] = [];
    for (const fp of r.framePaths) {
      animIndex[name].push(idx++);
      combinedFrames.push(fp);
    }
  }

  // If partial run, preserve prior anim index from existing manifest where possible
  const prior = existing.sheets?.[enemy.id];
  if (prior?.anims && Object.keys(animIndex).length < enemy.order.length) {
    // Rebuild combined from all available per-anim frame files on disk
    const rebuiltFrames = [];
    const rebuiltIndex = {};
    let ri = 0;
    for (const name of enemy.order) {
      const r = byName[name];
      if (r) {
        rebuiltIndex[name] = [];
        for (const fp of r.framePaths) {
          rebuiltIndex[name].push(ri++);
          rebuiltFrames.push(fp);
        }
        continue;
      }
      const disk = [];
      for (let i = 0; i < 32; i++) {
        const fp = path.join(enemy.framesDir, `${name}-${String(i).padStart(2, "0")}.png`);
        if (!(await exists(fp))) break;
        disk.push(fp);
      }
      if (!disk.length) continue;
      rebuiltIndex[name] = [];
      for (const fp of disk) {
        rebuiltIndex[name].push(ri++);
        rebuiltFrames.push(fp);
      }
    }
    if (rebuiltFrames.length) {
      Object.assign(animIndex, rebuiltIndex);
      combinedFrames.length = 0;
      combinedFrames.push(...rebuiltFrames);
    }
  }

  const combinedSheet = path.join(SHEETS_DIR, `${enemy.sheetPrefix}.png`);
  if (combinedFrames.length) {
    await stitchSheet(combinedFrames, combinedSheet, CELL);
    console.log(`\nCombined ${enemy.short} sheet -> ${path.relative(ROOT, combinedSheet)}`);
  }

  const holdMs = {};
  for (const a of allAnims) holdMs[a.name] = a.holdMs;

  const sheets = { ...(existing.sheets || {}) };
  const perAnimFromResults = Object.fromEntries(
    results.map((r) => [
      r.anim.name,
      {
        file: `${enemy.sheetPrefix}-${r.anim.name}.png`,
        cols: r.framePaths.length,
        rows: 1,
        cell: CELL,
        video: path.relative(ROOT, r.videoPath).replace(/\\/g, "/"),
      },
    ])
  );
  const priorPer = prior?.perAnimSheets || {};
  const videosFromResults = Object.fromEntries(
    results.map((r) => [r.anim.name, path.relative(ROOT, r.videoPath).replace(/\\/g, "/")])
  );

  sheets[enemy.id] = {
    file: `${enemy.sheetPrefix}.png`,
    cols: combinedFrames.length || CELL,
    rows: 1,
    cell: CELL,
    anims: Object.keys(animIndex).length ? animIndex : prior?.anims || {},
    holdMs: { ...(prior?.holdMs || {}), ...holdMs },
    source: "grok-video-per-anim-clean",
    pixelate: false,
    framesDir: path.relative(ROOT, enemy.framesDir).replace(/\\/g, "/"),
    perAnimSheets: { ...priorPer, ...perAnimFromResults },
    videos: { ...(prior?.videos || {}), ...videosFromResults },
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: existing.source === "grok-video-per-anim-clean" || sheets["player-cat-rocket"]?.pixelate === false
      ? "grok-video-per-anim-clean"
      : "grok-video-per-anim-clean",
    playerPipeline: existing.playerPipeline || undefined,
    enemyPipeline: {
      mode: "per-anim-clean",
      pixelate: false,
      cell: CELL,
      sizeNote: "Keep DRONE_TARGET / SOLDIER_TARGET footprints in assets.js.",
    },
    sheets,
  };
  // Preserve pickup-blade and any other sheets already present
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${path.relative(ROOT, manifestPath)}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = process.env.XAI_API_KEY;
  if (!opts.reuseVideo && !apiKey) {
    console.error("Missing XAI_API_KEY.");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  node scripts/grok-enemies-per-anim.mjs");
    process.exit(1);
  }

  console.log(`Model: ${VIDEO_MODEL}`);
  console.log(`Cell: ${CELL} (clean, no pixelate)`);

  const queue = selectQueue(opts.only);
  if (!queue.length) {
    console.error("No anims matched --only");
    process.exit(1);
  }

  let anyOk = false;
  for (const { enemy, anims } of queue) {
    const still = await resolveStill(enemy);
    if (!still) {
      console.error(`Missing still for ${enemy.id}`);
      continue;
    }
    console.log(`\n######## ${enemy.id} ########`);
    console.log(`Still: ${path.relative(ROOT, still)}`);

    await fs.mkdir(enemy.videoDir, { recursive: true });
    const prefixes = new Set(anims.map((a) => a.name));
    await clearOldAnimFrames(enemy.framesDir, prefixes, prefixes.size >= enemy.anims.length);

    const results = [];
    for (const anim of anims) {
      try {
        results.push(await processAnim(apiKey, enemy, anim, opts, still));
      } catch (err) {
        console.error(`\n  FAIL ${enemy.short} ${anim.name}:`, err.message || err);
      }
    }

    if (!results.length) {
      console.error(`No anims succeeded for ${enemy.id}`);
      continue;
    }
    anyOk = true;
    await mergeEnemyManifest(enemy, results, enemy.anims);
  }

  if (!anyOk) {
    console.error("No enemy anims succeeded.");
    process.exit(1);
  }
  console.log("\nHard-refresh the game - enemies use clean per-anim sheets/frames.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
