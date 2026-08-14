/**
 * Grok Imagine Video -> animated sprite sheets
 *
 * Pipeline (yes, this is supported by the xAI API):
 *   1. Image-to-video: animate an existing still with grok-imagine-video
 *   2. Optional video edit: force solid black BG / sprite look
 *   3. Extract N frames from the MP4 (Playwright canvas seek)
 *   4. Optional per-frame image edit: punch to game-sprite style
 *   5. Stitch frames into assets/imagine/sheets/<id>.png + update manifest
 *
 * Usage (PowerShell):
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-video-sprites.mjs
 *   node scripts/grok-video-sprites.mjs player          # one asset
 *   node scripts/grok-video-sprites.mjs --no-edit       # skip Imagine edits
 *   node scripts/grok-video-sprites.mjs player --reuse-video  # frames/sheet from existing mp4
 *   node scripts/grok-video-sprites.mjs --frames 6
 *
 * Then hard-refresh the game - sheets loader already animates these.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IM = path.join(ROOT, "assets", "imagine");
const VIDEO_DIR = path.join(IM, "video");
const FRAMES_DIR = path.join(IM, "frames", "video");
const SHEETS_DIR = path.join(IM, "sheets");

const VIDEO_API = "https://api.x.ai/v1/videos/generations";
const VIDEO_EDIT_API = "https://api.x.ai/v1/videos/edits";
const IMAGE_EDIT_API = "https://api.x.ai/v1/images/edits";
const VIDEO_MODEL = process.env.GROK_VIDEO_MODEL || "grok-imagine-video";
const IMAGE_MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const ASSETS = [
  {
    id: "player-cat-rocket",
    still: path.join(IM, "player-cat-rocket.png"),
    stillFallback: path.join(IM, "sheets", "player-cat-rocket.png"),
    duration: 3,
    aspect_ratio: "1:1",
    resolution: "480p",
    frames: 8,
    anims: { idle: [0, 1], fly: [2, 3, 4, 5], slash: [6, 7], hurt: [0] },
    /** Named frame folders used by the game loader */
    frameFolders: {
      idle: [0, 1],
      fly: [2, 3, 4, 5],
      slash: [6, 7],
      hurt: [0],
    },
    skipFrameEdit: true,
    holdMs: {
      idle: 480,
      fly: 180,
      slash: [180, 140],
      hurt: 140,
    },
    stillPrompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D chibi pixel art super-deformed WHITE cat riding a small heart-marked rocket facing right,",
      "pure white and cream fur, soft pink inner ears nose and cheeks, big shiny black eyes,",
      "big head tiny body chibi proportions, oversized round head, stubby limbs,",
      "cyan and magenta rocket with pink hearts, cyberpunk synthwave accent colors only on the rocket,",
      "NO neon outline, NO glow rim, NO magenta silhouette outline, clean hard-edge pixels,",
      "chunky readable pixels, clean silhouette, no HUD, no text, no ground, player character for a side-scroller",
    ].join(" "),
    motion: [
      "Animate this exact side-view CHIBI WHITE cat (big head, tiny body, white cream fur) riding a heart-marked rocket.",
      "Keep chibi proportions and white fur identical in every frame - same size, locked scale, no zoom.",
      "Static camera, locked framing, character centered and SAME size the entire time.",
      "Loopable soft hover bob, thruster pulse, then a cute boost lean.",
      "Solid pure black background #000000 the entire time.",
      "NO neon outline, NO glow rim. No camera pan, no zoom, no text, no HUD, no ground.",
    ].join(" "),
    videoEdit: [
      "Keep the white chibi cat-on-rocket identical with big-head proportions and same scale every frame.",
      "Replace any background with solid pure black #000000.",
      "Remove any neon glow outline if present - clean hard pixel edges only.",
      "Clean 2D game sprite animation, chunky pixels, no text, no HUD, static framing, locked character size.",
    ].join(" "),
    frameEdit: [
      "Convert to a single game sprite frame on solid pure black #000000 background.",
      "Preserve the WHITE CHIBI cat on rocket exactly - big head tiny body, side view, chunky pixel art,",
      "no neon outline glow, clean silhouette, no text no HUD.",
    ].join(" "),
    // User wants clean game pixels - do NOT bake pink/cyan neon rims.
    bakeNeonOutline: false,
  },
  {
    id: "enemy-drone",
    still: path.join(IM, "enemy-drone.png"),
    duration: 2,
    aspect_ratio: "1:1",
    resolution: "480p",
    frames: 4,
    anims: { fly: [0, 1, 2], hurt: [1] },
    motion: [
      "Animate this exact side-view hostile combat drone facing left.",
      "Static camera, thruster flicker and slight hover bob only - no attack flash, no muzzle, no sparks.",
      "Solid pure black background #000000, no camera move, no text.",
    ].join(" "),
    videoEdit:
      "Solid pure black background, clean 2D pixel game enemy drone sprite, keep subject, no text.",
    frameEdit:
      "Game sprite frame, solid black #000000 background, same dark combat drone side view, pixel art, no text.",
  },
  {
    id: "enemy-cyborg",
    still: path.join(IM, "enemy-cyborg-idle.png"),
    duration: 2,
    aspect_ratio: "1:1",
    resolution: "480p",
    frames: 4,
    anims: { idle: [0], walk: [1, 2], attack: [3], hurt: [0] },
    motion: [
      "Animate this exact side-view white-armored cyborg soldier facing right.",
      "Static camera, locked framing, character SAME size in every frame - no zoom.",
      "Idle, then walk-in-place two steps, then raise blaster and fire once.",
      "Keep the full body large and readable during the blast pose - do not shrink for the attack.",
      "Solid pure black background #000000, no camera move, no text.",
    ].join(" "),
    videoEdit:
      "Solid pure black background, clean 2D pixel game soldier sprite cycle, keep armor and red visor, no text.",
    frameEdit:
      "Game sprite frame, solid black #000000 background, same cyborg soldier side view, pixel art, no text.",
  },
  {
    id: "pickup-blade",
    still: path.join(IM, "pickup-blade.png"),
    duration: 2,
    aspect_ratio: "1:1",
    resolution: "480p",
    frames: 4,
    anims: { spin: [0, 1, 2, 3] },
    motion: [
      "Animate this neon energy sword pickup floating and slowly rotating in place.",
      "Static camera, solid pure black background #000000, looping spin, no text.",
    ].join(" "),
    videoEdit:
      "Solid pure black background, clean neon blade pickup sprite spinning, no text.",
    frameEdit:
      "Game sprite frame, solid black #000000 background, neon energy sword pickup, pixel art, no text.",
  },
];

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const only = argv.filter((a) => !a.startsWith("--")).map((s) => s.toLowerCase());
  let frames = null;
  for (const a of argv) {
    if (a.startsWith("--frames=")) frames = Number(a.split("=")[1]);
  }
  const fi = argv.indexOf("--frames");
  if (fi >= 0 && argv[fi + 1]) frames = Number(argv[fi + 1]);
  return {
    only,
    edit: !flags.has("--no-edit"),
    reuseVideo: flags.has("--reuse-video"),
    frames,
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

async function resolveStill(asset) {
  if (await exists(asset.still)) return asset.still;
  if (asset.stillFallback && (await exists(asset.stillFallback))) return asset.stillFallback;
  return null;
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
  while (Date.now() - started < 10 * 60 * 1000) {
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
      ctx.imageSmoothingEnabled = false;
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

async function editImageFrame(apiKey, framePath, prompt) {
  const dataUrl = await fileToDataUrl(framePath, "image/png");
  const res = await fetch(IMAGE_EDIT_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      image: { url: dataUrl, type: "image_url" },
      response_format: "b64_json",
      aspect_ratio: "1:1",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`image edit ${res.status}: ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  let buf;
  if (b64) buf = Buffer.from(b64, "base64");
  else if (url) buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  else throw new Error("image edit: no image data");
  await fs.writeFile(framePath, buf);
}

async function stitchSheet(framePaths, outPath, cell = 128) {
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

      // Uniform scale from max content so sheet cells match game packing
      function punchTrim(img) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] <= 22 && d[i + 1] <= 22 && d[i + 2] <= 22) d[i + 3] = 0;
        }
        ctx.putImageData(data, 0, 0);
        let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            if (d[(y * c.width + x) * 4 + 3] > 8) {
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
        out.getContext("2d").drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        return out;
      }

      const trimmed = imgs.map(punchTrim);
      let maxW = 1, maxH = 1;
      const heights = trimmed.map((t) => t.height);
      for (const t of trimmed) {
        maxW = Math.max(maxW, t.width);
        maxH = Math.max(maxH, t.height);
      }
      heights.sort((a, b) => a - b);
      const medianH = heights[(heights.length / 2) | 0] || maxH;
      const baseScale = Math.min(cell / maxW, cell / maxH);

      const c = document.createElement("canvas");
      c.width = cell * trimmed.length;
      c.height = cell;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < trimmed.length; i++) {
        const t = trimmed[i];
        let scale = baseScale;
        if (t.height < medianH * 0.92) {
          scale = Math.min(baseScale * (medianH / Math.max(1, t.height)), cell / t.width, cell / t.height);
        }
        const w = Math.max(1, Math.round(t.width * scale));
        const h = Math.max(1, Math.round(t.height * scale));
        const ox = i * cell + ((cell - w) / 2) | 0;
        const oy = ((cell - h) / 2) | 0;
        ctx.drawImage(t, ox, oy, w, h);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { urls, cell }
  );
  await browser.close();
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
}

/** Bake magenta/cyan neon outline onto sprite frames (after generation). */
async function bakeNeonOutlineOnFrames(framePaths) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const fp of framePaths) {
    const dataUrl = await fileToDataUrl(fp, "image/png");
    const outB64 = await page.evaluate(async (src) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = src;
      });
      const w = img.width;
      const h = img.height;
      const srcC = document.createElement("canvas");
      srcC.width = w;
      srcC.height = h;
      const sctx = srcC.getContext("2d");
      sctx.drawImage(img, 0, 0);
      const srcData = sctx.getImageData(0, 0, w, h);
      const d = srcData.data;

      // Punch near-black to alpha
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] <= 22 && d[i + 1] <= 22 && d[i + 2] <= 22) d[i + 3] = 0;
      }
      sctx.putImageData(srcData, 0, 0);

      function silhouette(color) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(srcC, 0, 0);
        const id = ctx.getImageData(0, 0, w, h);
        const p = id.data;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        for (let i = 0; i < p.length; i += 4) {
          if (p[i + 3] > 20) {
            p[i] = r;
            p[i + 1] = g;
            p[i + 2] = b;
            p[i + 3] = 255;
          }
        }
        ctx.putImageData(id, 0, 0);
        return c;
      }

      const pink = silhouette("#ff2ea6");
      const cyan = silhouette("#00e8ff");
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const ctx = out.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(pink, -2, 0);
      ctx.drawImage(pink, 2, 0);
      ctx.drawImage(cyan, 0, -2);
      ctx.drawImage(cyan, 0, 2);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(pink, -1, -1);
      ctx.drawImage(cyan, 1, 1);
      ctx.globalAlpha = 1;
      ctx.drawImage(srcC, 0, 0);
      return out.toDataURL("image/png").split(",")[1];
    }, dataUrl);
    await fs.writeFile(fp, Buffer.from(outB64, "base64"));
  }
  await browser.close();
}

async function generateStill(apiKey, prompt, outPath) {
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      aspect_ratio: "1:1",
      response_format: "b64_json",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`still gen ${res.status}: ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  let buf;
  if (b64) buf = Buffer.from(b64, "base64");
  else if (url) buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  else throw new Error("still gen: no image");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function writeNamedAnimFrames(framePaths, asset) {
  if (!asset.frameFolders) return;
  const frameDir = path.join(FRAMES_DIR, asset.id);
  for (const [anim, idxs] of Object.entries(asset.frameFolders)) {
    let n = 0;
    for (const idx of idxs) {
      const src = framePaths[idx];
      if (!src) continue;
      const dest = path.join(frameDir, `${anim}-${String(n).padStart(2, "0")}.png`);
      await fs.copyFile(src, dest);
      n++;
    }
  }
}

async function processAsset(apiKey, asset, opts) {
  console.log(`\n== ${asset.id} ==`);

  const frameCount = opts.frames || asset.frames;
  let videoPath = path.join(VIDEO_DIR, `${asset.id}-edited.mp4`);
  if (!(await exists(videoPath))) {
    videoPath = path.join(VIDEO_DIR, `${asset.id}.mp4`);
  }

  if (opts.reuseVideo) {
    if (!(await exists(videoPath))) {
      console.error(`  skip ${asset.id}: no video at ${path.relative(ROOT, videoPath)}`);
      return null;
    }
    console.log(`  reuse video: ${path.relative(ROOT, videoPath)}`);
  } else {
    if (asset.stillPrompt) {
      process.stdout.write("  generating chibi/still reference... ");
      await generateStill(apiKey, asset.stillPrompt, asset.still);
      console.log(`ok -> ${path.relative(ROOT, asset.still)}`);
    }

    const still = await resolveStill(asset);
    if (!still) {
      console.error(`  skip ${asset.id}: no still image`);
      return null;
    }

    console.log(`  still: ${path.relative(ROOT, still)}`);

    const imageDataUrl = await fileToDataUrl(still, "image/png");
    process.stdout.write("  starting image->video... ");
    const genId = await startVideo(apiKey, {
      model: VIDEO_MODEL,
      prompt: asset.motion,
      duration: asset.duration,
      aspect_ratio: asset.aspect_ratio,
      resolution: asset.resolution,
      image: { url: imageDataUrl },
    });
    console.log(`request ${genId}`);
    const gen = await pollVideo(apiKey, genId, "generate");

    await fs.mkdir(VIDEO_DIR, { recursive: true });
    videoPath = path.join(VIDEO_DIR, `${asset.id}.mp4`);
    await download(gen.url, videoPath);
    console.log(`  saved ${path.relative(ROOT, videoPath)}`);

    let videoUrl = gen.url;
    if (opts.edit && asset.videoEdit) {
      process.stdout.write("  starting video edit (black BG / sprite)... ");
      try {
        const editId = await startVideoEdit(apiKey, videoUrl, asset.videoEdit);
        console.log(`request ${editId}`);
        const edited = await pollVideo(apiKey, editId, "edit");
        videoPath = path.join(VIDEO_DIR, `${asset.id}-edited.mp4`);
        await download(edited.url, videoPath);
        videoUrl = edited.url;
        console.log(`  saved ${path.relative(ROOT, videoPath)}`);
      } catch (err) {
        console.log("\n  video edit skipped:", err.message || err);
      }
    }
  }

  const frameDir = path.join(FRAMES_DIR, asset.id);
  // Clear old named anim frames so stale non-chibi frames aren't loaded
  try {
    const existing = await fs.readdir(frameDir);
    for (const name of existing) {
      if (/^(idle|fly|slash|hurt|walk|attack|spin)-/.test(name)) {
        await fs.unlink(path.join(frameDir, name));
      }
    }
  } catch (_) {}

  console.log(`  extracting ${frameCount} frames...`);
  let framePaths = await extractFrames(videoPath, frameCount, frameDir, asset.id);
  console.log(`  frames -> ${path.relative(ROOT, frameDir)}`);

  if (opts.edit && asset.frameEdit && !asset.skipFrameEdit) {
    for (let i = 0; i < framePaths.length; i++) {
      process.stdout.write(`  image-edit frame ${i + 1}/${framePaths.length}... `);
      try {
        await editImageFrame(apiKey, framePaths[i], asset.frameEdit);
        console.log("ok");
      } catch (err) {
        console.log("FAIL", err.message || err);
      }
    }
  }

  if (asset.bakeNeonOutline) {
    process.stdout.write("  baking neon outline onto frames... ");
    await bakeNeonOutlineOnFrames(framePaths);
    console.log("ok");
  }

  await writeNamedAnimFrames(framePaths, asset);

  await fs.mkdir(SHEETS_DIR, { recursive: true });
  const sheetPath = path.join(SHEETS_DIR, `${asset.id}.png`);
  await stitchSheet(framePaths, sheetPath, 128);
  console.log(`  sheet -> ${path.relative(ROOT, sheetPath)}`);

  return {
    file: `${asset.id}.png`,
    cols: frameCount,
    rows: 1,
    cell: 128,
    anims: asset.anims,
    holdMs: asset.holdMs || {
      idle: 480,
      fly: 180,
      slash: [180, 120, 80, 160],
      hurt: 140,
    },
    source: "grok-video-chibi",
    video: path.relative(ROOT, videoPath).replace(/\\/g, "/"),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = process.env.XAI_API_KEY;
  if (!opts.reuseVideo && !apiKey) {
    console.error("Missing XAI_API_KEY.");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  node scripts/grok-video-sprites.mjs");
    console.error("\nThis is possible: image->video -> (video edit) -> extract frames -> (image edit) -> sheet.");
    process.exit(1);
  }

  const queue = opts.only.length
    ? ASSETS.filter((a) => opts.only.some((o) => a.id.includes(o)))
    : ASSETS;

  console.log(`Model: ${VIDEO_MODEL}`);
  console.log(`Edit passes: ${opts.edit ? "on" : "off"}`);
  console.log(`Reuse video: ${opts.reuseVideo ? "on" : "off"}`);
  console.log(`Assets: ${queue.map((a) => a.id).join(", ")}`);

  let existing = {};
  const manifestPath = path.join(SHEETS_DIR, "manifest.json");
  try {
    existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (_) {}

  const sheets = { ...(existing.sheets || {}) };
  for (const asset of queue) {
    try {
      const meta = await processAsset(apiKey, asset, opts);
      if (meta) sheets[asset.id] = meta;
    } catch (err) {
      console.error(`\n  FAIL ${asset.id}:`, err.message || err);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "grok-video",
    sheets,
  };
  await fs.mkdir(SHEETS_DIR, { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${path.relative(ROOT, manifestPath)}`);
  console.log("Hard-refresh the game to load animated video-derived sheets.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
