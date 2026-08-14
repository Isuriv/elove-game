/**
 * Generate animation frames via Grok Imagine, then stitch into horizontal sprite sheets.
 *
 * Usage (PowerShell):
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-sheets.mjs
 *
 * Optional args: player drone cyborg blade
 *
 * Writes:
 *   assets/imagine/frames/<id>-<n>.png
 *   assets/imagine/sheets/<id>.png
 *   assets/imagine/sheets/manifest.json
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES_DIR = path.join(ROOT, "assets", "imagine", "frames");
const SHEETS_DIR = path.join(ROOT, "assets", "imagine", "sheets");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const STYLE = [
  "side-view 2D pixel art game sprite,",
  "solid pure black background #000000,",
  "cyberpunk synthwave palette neon magenta cyan purple,",
  "chunky readable pixels, clean silhouette, no HUD, no text, no ground, no panel borders,",
].join(" ");

/** @type {{ id: string, cols: number, anims: Record<string, number[]>, frames: { file: string, prompt: string }[] }[]} */
const SHEETS = [
  {
    id: "player-cat-rocket",
    cols: 4,
    anims: { idle: [0, 1], fly: [1, 2], slash: [3], hurt: [0] },
    frames: [
      {
        file: "player-0-idle.png",
        prompt: `${STYLE} black cat riding small heart-marked rocket facing right, idle hover pose, soft thruster glow`,
      },
      {
        file: "player-1-thrust.png",
        prompt: `${STYLE} SAME black cat on heart-marked rocket facing right, thrusters firing brighter cyan-magenta flame, slight forward lean`,
      },
      {
        file: "player-2-boost.png",
        prompt: `${STYLE} SAME black cat on heart-marked rocket facing right, full boost, long flame trail, rocket tilted slightly up`,
      },
      {
        file: "player-3-slash.png",
        prompt: `${STYLE} SAME black cat on heart-marked rocket facing right, swinging a neon magenta energy blade slash arc`,
      },
    ],
  },
  {
    id: "enemy-drone",
    cols: 3,
    anims: { fly: [0, 1, 2], hurt: [1] },
    frames: [
      {
        file: "drone-0-hover-a.png",
        prompt: `${STYLE} hostile flying combat drone facing left, dark metal, red eyes, small thruster flame frame A`,
      },
      {
        file: "drone-1-hover-b.png",
        prompt: `${STYLE} SAME hostile flying combat drone facing left, thruster flame frame B alternate flicker`,
      },
      {
        file: "drone-2-hover-c.png",
        prompt: `${STYLE} SAME hostile flying combat drone facing left, thruster flame frame C, slight bob`,
      },
    ],
  },
  {
    id: "enemy-cyborg",
    cols: 4,
    anims: { idle: [0], walk: [1, 2], attack: [3], hurt: [0] },
    frames: [
      {
        file: "cyborg-0-idle.png",
        prompt: `${STYLE} futuristic soldier cyborg standing facing right, white-grey armor, bright red visor, idle`,
      },
      {
        file: "cyborg-1-walk-a.png",
        prompt: `${STYLE} SAME soldier cyborg facing right, mid-walk pose frame A, white-grey armor, red visor`,
      },
      {
        file: "cyborg-2-walk-b.png",
        prompt: `${STYLE} SAME soldier cyborg facing right, mid-walk pose frame B alternate step, white-grey armor, red visor`,
      },
      {
        file: "cyborg-3-attack.png",
        prompt: `${STYLE} SAME soldier cyborg facing right, shooting neon cyan blaster with small muzzle flash`,
      },
    ],
  },
  {
    id: "pickup-blade",
    cols: 4,
    anims: { spin: [0, 1, 2, 3] },
    frames: [
      {
        file: "blade-0.png",
        prompt: `${STYLE} neon energy sword pickup floating upright, magenta and cyan glow, angle 0 degrees`,
      },
      {
        file: "blade-1.png",
        prompt: `${STYLE} SAME neon energy sword pickup floating, rotated about 90 degrees, magenta cyan glow`,
      },
      {
        file: "blade-2.png",
        prompt: `${STYLE} SAME neon energy sword pickup floating, rotated about 180 degrees, magenta cyan glow`,
      },
      {
        file: "blade-3.png",
        prompt: `${STYLE} SAME neon energy sword pickup floating, rotated about 270 degrees, magenta cyan glow`,
      },
    ],
  },
];

async function generateOne(apiKey, prompt, outPath) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      aspect_ratio: "1:1",
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path.basename(outPath)}: ${res.status} ${text.slice(0, 400)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  let buf;
  if (b64) buf = Buffer.from(b64, "base64");
  else if (url) buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  else throw new Error(`${path.basename(outPath)}: no image data`);
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function stitchSheet(framePaths, outPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const payloads = [];
  for (const fp of framePaths) {
    const buf = await fs.readFile(fp);
    payloads.push(`data:image/png;base64,${buf.toString("base64")}`);
  }
  const outB64 = await page.evaluate(async (urls) => {
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
    const cell = 128;
    const c = document.createElement("canvas");
    c.width = cell * imgs.length;
    c.height = cell;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const scale = Math.min(cell / img.width, cell / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const ox = i * cell + ((cell - w) / 2) | 0;
      const oy = ((cell - h) / 2) | 0;
      ctx.drawImage(img, ox, oy, w, h);
    }
    return c.toDataURL("image/png").split(",")[1];
  }, payloads);
  await browser.close();
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error("Missing XAI_API_KEY. Set it then re-run:");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  node scripts/grok-imagine-sheets.mjs");
    process.exit(1);
  }

  await fs.mkdir(FRAMES_DIR, { recursive: true });
  await fs.mkdir(SHEETS_DIR, { recursive: true });

  const only = process.argv.slice(2).map((s) => s.toLowerCase());
  const queue = only.length
    ? SHEETS.filter((s) => only.some((o) => s.id.includes(o)))
    : SHEETS;

  console.log(`Using model ${MODEL}`);
  const manifest = { generatedAt: new Date().toISOString(), sheets: {} };

  for (const sheet of queue) {
    console.log(`\n== ${sheet.id} ==`);
    const framePaths = [];
    for (const fr of sheet.frames) {
      const out = path.join(FRAMES_DIR, fr.file);
      process.stdout.write(`  ${fr.file}... `);
      try {
        await generateOne(apiKey, fr.prompt, out);
        console.log("ok");
      } catch (err) {
        console.log("FAIL");
        console.error(" ", err.message || err);
        continue;
      }
      framePaths.push(out);
    }
    if (framePaths.length !== sheet.frames.length) {
      console.error(`  skip sheet (got ${framePaths.length}/${sheet.frames.length} frames)`);
      continue;
    }
    const sheetFile = `${sheet.id}.png`;
    const sheetPath = path.join(SHEETS_DIR, sheetFile);
    await stitchSheet(framePaths, sheetPath);
    console.log(`  sheet -> assets/imagine/sheets/${sheetFile}`);
    manifest.sheets[sheet.id] = {
      file: sheetFile,
      cols: sheet.cols,
      rows: 1,
      cell: 128,
      anims: sheet.anims,
    };
  }

  // Merge with any existing manifest entries
  const manifestPath = path.join(SHEETS_DIR, "manifest.json");
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (_) {}
  const merged = {
    generatedAt: manifest.generatedAt,
    sheets: { ...(existing.sheets || {}), ...manifest.sheets },
  };
  await fs.writeFile(manifestPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${path.relative(ROOT, manifestPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
