/**
 * Per-animation Grok Imagine videos -> clean (non-pixelated) player sprite sheets.
 *
 * Generates a distinct video for idle / fly / slash / hurt, extracts frames,
 * trims + punches black BG, stitches per-anim sheets + a combined sheet.
 * Does NOT run pixelate / harden / 90-grid rebuild.
 *
 * Usage (PowerShell):
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-player-per-anim.mjs
 *   node scripts/grok-player-per-anim.mjs --only idle,fly
 *   node scripts/grok-player-per-anim.mjs --reuse-video
 *   node scripts/grok-player-per-anim.mjs --no-edit
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IM = path.join(ROOT, "assets", "imagine");
const VIDEO_DIR = path.join(IM, "video", "player-anims");
const FRAMES_DIR = path.join(IM, "frames", "video", "player-cat-rocket");
const SHEETS_DIR = path.join(IM, "sheets");
const STILL = path.join(IM, "player-cat-rocket.png");
const STILL_FALLBACK = path.join(SHEETS_DIR, "player-cat-rocket.png");

const VIDEO_API = "https://api.x.ai/v1/videos/generations";
const VIDEO_EDIT_API = "https://api.x.ai/v1/videos/edits";
const VIDEO_MODEL = process.env.GROK_VIDEO_MODEL || "grok-imagine-video";

const CHAR_LOOK = [
  "Exact same side-view chibi WHITE cat riding a small cyan-and-magenta rocket with pink hearts, facing right.",
  "Big round head, tiny body, soft white/cream fur, pink inner ears nose cheeks, shiny black eyes.",
  "Clean 2D game character art (NOT pixel art, NOT chunky pixels, NOT low-res), smooth readable silhouette,",
  "solid pure black background #000000, static camera, locked framing, character SAME size every frame,",
  "NO neon glow outline, NO magenta rim light, NO text, NO HUD, NO ground, NO camera zoom or pan.",
].join(" ");

const ANIMS = [
  {
    name: "idle",
    duration: 3,
    frames: 4,
    holdMs: 480,
    motion: [
      CHAR_LOOK,
      "IDLE loop: gentle hover bob up and down, soft thruster pulse, ears and whiskers barely move.",
      "Loopable idle - start and end pose nearly identical. Cute, calm, centered.",
    ].join(" "),
    videoEdit: [
      "Keep the white chibi cat-on-rocket identical. Replace background with solid pure black #000000.",
      "Clean smooth 2D game sprite look (not pixel art). Remove neon glow outlines. No text.",
    ].join(" "),
  },
  {
    name: "fly",
    duration: 3,
    frames: 6,
    holdMs: 160,
    motion: [
      CHAR_LOOK,
      "FLY / BOOST loop: cat leans slightly forward on the rocket, stronger cyan thruster flame flicker,",
      "confident flight bob, scarf/fur flutter tiny bit. Loopable flight cycle, locked scale.",
    ].join(" "),
    videoEdit: [
      "Keep the white chibi cat-on-rocket identical. Solid pure black #000000 background.",
      "Clean smooth 2D flight sprite (not pixel art). Remove neon glow outlines. No text.",
    ].join(" "),
  },
  {
    name: "slash",
    duration: 2,
    frames: 4,
    holdMs: [180, 120, 90, 160],
    motion: [
      CHAR_LOOK,
      "SLASH / ATTACK: short cute attack - wind-up lean back, then swing forward with a neon energy blade",
      "or claw swipe to the right, impact pose, then recover. Clear attack poses, locked character size.",
      "Solid black background. Not a loop - a short attack beat.",
    ].join(" "),
    videoEdit: [
      "Keep the white chibi cat-on-rocket identical. Solid pure black #000000 background.",
      "Clean smooth 2D attack sprite (not pixel art). Remove neon glow outlines. No text.",
    ].join(" "),
  },
  {
    name: "hurt",
    duration: 2,
    frames: 3,
    holdMs: 140,
    motion: [
      CHAR_LOOK,
      "HURT / RECOIL: cat flinches, eyes squeezed, rocket tilts back slightly, brief stun wobble.",
      "Short damage reaction, locked framing and scale. Solid black background.",
    ].join(" "),
    videoEdit: [
      "Keep the white chibi cat-on-rocket identical. Solid pure black #000000 background.",
      "Clean smooth 2D hurt sprite (not pixel art). Remove neon glow outlines. No text.",
    ].join(" "),
  },
];

const CELL = Number(process.env.PLAYER_SHEET_CELL || 256);
const ASPECT = "1:1";
const RESOLUTION = process.env.GROK_VIDEO_RES || "480p";

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  let only = null;
  const oi = argv.indexOf("--only");
  if (oi >= 0 && argv[oi + 1]) {
    only = argv[oi + 1].split(",").map((s) => s.trim().toLowerCase());
  }
  for (const a of argv) {
    if (a.startsWith("--only=")) {
      only = a.split("=")[1].split(",").map((s) => s.trim().toLowerCase());
    }
  }
  return {
    only,
    edit: !flags.has("--no-edit"),
    reuseVideo: flags.has("--reuse-video"),
  };
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
      // Clean extract - keep smooth video pixels (no nearest-neighbor crush)
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
        // Edge flood punch near-black so dark rocket parts stay
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
      // Transparent sheet - game punches/loads per cell
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

async function resolveStill() {
  if (await exists(STILL)) return STILL;
  if (await exists(STILL_FALLBACK)) return STILL_FALLBACK;
  return null;
}

async function clearOldAnimFrames(keepPrefixes) {
  await fs.mkdir(FRAMES_DIR, { recursive: true });
  const existing = await fs.readdir(FRAMES_DIR);
  for (const name of existing) {
    const drop =
      /^(idle|fly|slash|hurt)-/.test(name) ||
      /^player-cat-rocket-\d/.test(name);
    if (!drop) continue;
    // If regenerating subset, only clear those prefixes
    if (keepPrefixes) {
      const pref = name.split("-")[0];
      if (!keepPrefixes.has(pref) && !name.startsWith("player-cat-rocket")) continue;
      if (name.startsWith("player-cat-rocket") && keepPrefixes) {
        // Combined numbered frames cleared only on full run
        if (keepPrefixes.size < ANIMS.length) continue;
      }
    }
    await fs.unlink(path.join(FRAMES_DIR, name)).catch(() => {});
  }
}

async function processAnim(apiKey, anim, opts, stillPath) {
  console.log(`\n== player ${anim.name} ==`);
  let videoPath = path.join(VIDEO_DIR, `${anim.name}-edited.mp4`);
  if (!(await exists(videoPath))) {
    videoPath = path.join(VIDEO_DIR, `${anim.name}.mp4`);
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
    const gen = await pollVideo(apiKey, genId, `${anim.name}-gen`);
    videoPath = path.join(VIDEO_DIR, `${anim.name}.mp4`);
    await download(gen.url, videoPath);
    console.log(`  saved ${path.relative(ROOT, videoPath)}`);

    let videoUrl = gen.url;
    if (opts.edit && anim.videoEdit) {
      process.stdout.write("  video edit (black BG)... ");
      try {
        const editId = await startVideoEdit(apiKey, videoUrl, anim.videoEdit);
        console.log(`request ${editId}`);
        const edited = await pollVideo(apiKey, editId, `${anim.name}-edit`);
        videoPath = path.join(VIDEO_DIR, `${anim.name}-edited.mp4`);
        await download(edited.url, videoPath);
        console.log(`  saved ${path.relative(ROOT, videoPath)}`);
      } catch (err) {
        console.log("\n  video edit skipped:", err.message || err);
      }
    }
  }

  console.log(`  extracting ${anim.frames} frames (clean)...`);
  const framePaths = await extractFrames(videoPath, anim.frames, FRAMES_DIR, anim.name);
  console.log(`  frames -> ${path.relative(ROOT, FRAMES_DIR)}/${anim.name}-*.png`);

  const sheetPath = path.join(SHEETS_DIR, `player-cat-rocket-${anim.name}.png`);
  await stitchSheet(framePaths, sheetPath, CELL);
  console.log(`  sheet -> ${path.relative(ROOT, sheetPath)}`);

  return { anim, framePaths, videoPath, sheetPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = process.env.XAI_API_KEY;
  if (!opts.reuseVideo && !apiKey) {
    console.error("Missing XAI_API_KEY.");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  node scripts/grok-player-per-anim.mjs");
    process.exit(1);
  }

  const still = await resolveStill();
  if (!still) {
    console.error("Missing still: assets/imagine/player-cat-rocket.png");
    process.exit(1);
  }
  console.log(`Still: ${path.relative(ROOT, still)}`);
  console.log(`Model: ${VIDEO_MODEL}`);
  console.log(`Cell: ${CELL} (clean, no pixelate)`);

  const queue = opts.only
    ? ANIMS.filter((a) => opts.only.includes(a.name))
    : ANIMS;
  if (!queue.length) {
    console.error("No anims matched --only");
    process.exit(1);
  }

  await fs.mkdir(VIDEO_DIR, { recursive: true });
  await clearOldAnimFrames(new Set(queue.map((a) => a.name)));

  const results = [];
  for (const anim of queue) {
    try {
      results.push(await processAnim(apiKey, anim, opts, still));
    } catch (err) {
      console.error(`\n  FAIL ${anim.name}:`, err.message || err);
    }
  }

  if (!results.length) {
    console.error("No anims succeeded.");
    process.exit(1);
  }

  // Combined sheet in idle->fly->slash->hurt order for legacy loader
  const order = ["idle", "fly", "slash", "hurt"];
  const byName = Object.fromEntries(results.map((r) => [r.anim.name, r]));
  const combinedFrames = [];
  const animIndex = {};
  let idx = 0;
  for (const name of order) {
    const r = byName[name];
    if (!r) continue;
    animIndex[name] = [];
    for (const fp of r.framePaths) {
      animIndex[name].push(idx++);
      combinedFrames.push(fp);
    }
  }

  const combinedSheet = path.join(SHEETS_DIR, "player-cat-rocket.png");
  if (combinedFrames.length) {
    await stitchSheet(combinedFrames, combinedSheet, CELL);
    console.log(`\nCombined sheet -> ${path.relative(ROOT, combinedSheet)}`);
  }

  // Merge manifest - keep enemy sheets
  const manifestPath = path.join(SHEETS_DIR, "manifest.json");
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (_) {}

  const holdMs = {};
  for (const a of ANIMS) holdMs[a.name] = a.holdMs;

  const sheets = { ...(existing.sheets || {}) };
  sheets["player-cat-rocket"] = {
    file: "player-cat-rocket.png",
    cols: combinedFrames.length || CELL,
    rows: 1,
    cell: CELL,
    anims: animIndex,
    holdMs,
    source: "grok-video-per-anim-clean",
    pixelate: false,
    framesDir: "assets/imagine/frames/video/player-cat-rocket",
    perAnimSheets: Object.fromEntries(
      results.map((r) => [
        r.anim.name,
        {
          file: `player-cat-rocket-${r.anim.name}.png`,
          cols: r.framePaths.length,
          rows: 1,
          cell: CELL,
          video: path.relative(ROOT, r.videoPath).replace(/\\/g, "/"),
        },
      ])
    ),
    videos: Object.fromEntries(
      results.map((r) => [r.anim.name, path.relative(ROOT, r.videoPath).replace(/\\/g, "/")])
    ),
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "grok-video-per-anim-clean",
    playerPipeline: {
      mode: "per-anim-clean",
      pixelate: false,
      cell: CELL,
      sizeNote: "Pack player into same world box as drone (DRONE_TARGET).",
    },
    sheets,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${path.relative(ROOT, manifestPath)}`);
  console.log("Hard-refresh the game - player uses clean per-anim sheets/frames.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
