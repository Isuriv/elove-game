/**
 * Pack SpaceX rocket boss frames -> per-anim + combined sheets (Optimus pipeline).
 *
 * Input: raw keyframes under assets/imagine/_raw/rocket/ OR --src <dir>
 * Output:
 *   assets/imagine/frames/video/enemy-rocket/{idle,walk,attack,hurt}-NN.png
 *   assets/imagine/sheets/enemy-rocket(-idle|-walk|-attack|-hurt).png
 *   updates assets/imagine/sheets/manifest.json
 *
 * Usage:
 *   node scripts/pack-rocket-frames.mjs
 *   node scripts/pack-rocket-frames.mjs --src path/to/raw
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IM = path.join(ROOT, "assets", "imagine");
const FRAMES_DIR = path.join(IM, "frames", "video", "enemy-rocket");
const SHEETS_DIR = path.join(IM, "sheets");
const CELL = Number(process.env.ENEMY_SHEET_CELL || 256);
const CACHE = "rocket-boss-20260724";

const DEFAULT_SRC_CANDIDATES = [
  path.join(IM, "_raw", "rocket"),
  path.join(
    process.env.USERPROFILE || "",
    ".cursor",
    "projects",
    "c-Users-ethra-Documents-Elove-Mars-Love-Blastar",
    "assets"
  ),
];

const BUCKETS = {
  idle: [/rocket-idle/i, /idle-/i],
  walk: [/rocket-walk/i, /walk-/i],
  attack: [/rocket-attack/i, /attack-/i],
  hurt: [/rocket-hurt/i, /hurt-/i],
};

const HOLD = {
  idle: 420,
  walk: 120,
  attack: [180, 90, 70, 160],
  hurt: 110,
};

function parseArgs(argv) {
  let src = null;
  const si = argv.indexOf("--src");
  if (si >= 0 && argv[si + 1]) src = path.resolve(argv[si + 1]);
  return { src };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function fileToDataUrl(filePath, mime = "image/png") {
  const buf = await fs.readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function resolveSrcDir(explicit) {
  if (explicit && (await exists(explicit))) return explicit;
  for (const c of DEFAULT_SRC_CANDIDATES) {
    if (c && (await exists(c))) {
      const names = await fs.readdir(c);
      if (names.some((n) => /rocket/i.test(n) && n.endsWith(".png"))) return c;
    }
  }
  throw new Error(
    "No rocket source frames found. Place PNGs in assets/imagine/_raw/rocket/ or pass --src"
  );
}

async function collectBuckets(srcDir) {
  const names = (await fs.readdir(srcDir))
    .filter((n) => n.toLowerCase().endsWith(".png") && /rocket/i.test(n))
    .sort();
  const out = { idle: [], walk: [], attack: [], hurt: [] };
  for (const n of names) {
    for (const [anim, pats] of Object.entries(BUCKETS)) {
      if (pats.some((re) => re.test(n))) {
        out[anim].push(path.join(srcDir, n));
        break;
      }
    }
  }
  const mins = { idle: 4, walk: 6, attack: 4, hurt: 3 };
  for (const [anim, min] of Object.entries(mins)) {
    if (!out[anim].length) {
      throw new Error(`Missing ${anim} frames in ${srcDir}`);
    }
    while (out[anim].length < min) {
      out[anim].push(out[anim][out[anim].length % Math.max(1, out[anim].length)]);
    }
  }
  return out;
}

/** Punch near-black -> transparent, trim, pack into sheet cells. */
async function stitchSheet(framePaths, outPath, cell = CELL) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const urls = [];
  for (const fp of framePaths) {
    urls.push(await fileToDataUrl(fp));
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
          d[i] <= 22 && d[i + 1] <= 22 && d[i + 2] <= 22 && d[i + 3] > 0;
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
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] <= 14 && d[i + 1] <= 14 && d[i + 2] <= 14) d[i + 3] = 0;
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
        octx.drawImage(
          c,
          minX,
          minY,
          out.width,
          out.height,
          0,
          0,
          out.width,
          out.height
        );
        return out;
      }

      const trimmed = imgs.map(punchTrim);
      let maxW = 1,
        maxH = 1;
      for (const t of trimmed) {
        maxW = Math.max(maxW, t.width);
        maxH = Math.max(maxH, t.height);
      }
      // Rockets are tall - fill cell height a bit more than humanoids
      const baseScale = Math.min(cell / maxW, cell / maxH) * 0.96;

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
        const oy = (cell - h) | 0;
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

async function exportCleanFrames(srcPaths, outDir, prefix) {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const written = [];
  for (let i = 0; i < srcPaths.length; i++) {
    const url = await fileToDataUrl(srcPaths[i]);
    const b64 = await page.evaluate(async (src) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = src;
      });
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
      const isBg = (idx) =>
        d[idx] <= 22 && d[idx + 1] <= 22 && d[idx + 2] <= 22 && d[idx + 3] > 0;
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
      for (let j = 0; j < d.length; j += 4) {
        if (d[j] <= 14 && d[j + 1] <= 14 && d[j + 2] <= 14) d[j + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    }, url);
    const out = path.join(outDir, `${prefix}-${String(i).padStart(2, "0")}.png`);
    await fs.writeFile(out, Buffer.from(b64, "base64"));
    written.push(out);
  }
  await browser.close();
  return written;
}

async function main() {
  const { src } = parseArgs(process.argv.slice(2));
  const srcDir = await resolveSrcDir(src);
  console.log("rocket source:", srcDir);
  const buckets = await collectBuckets(srcDir);

  await fs.mkdir(FRAMES_DIR, { recursive: true });
  await fs.mkdir(SHEETS_DIR, { recursive: true });

  try {
    for (const n of await fs.readdir(FRAMES_DIR)) {
      if (/\.png$/i.test(n)) await fs.unlink(path.join(FRAMES_DIR, n));
    }
  } catch (_) {}

  const order = ["idle", "walk", "attack", "hurt"];
  const animIndices = {};
  let col = 0;
  const combinedPaths = [];

  for (const anim of order) {
    const cleaned = await exportCleanFrames(buckets[anim], FRAMES_DIR, anim);
    console.log(`  ${anim}: ${cleaned.length} frames`);
    animIndices[anim] = cleaned.map((_, i) => col + i);
    col += cleaned.length;
    combinedPaths.push(...cleaned);

    const perSheet = path.join(SHEETS_DIR, `enemy-rocket-${anim}.png`);
    await stitchSheet(cleaned, perSheet, CELL);
    console.log("  wrote", path.relative(ROOT, perSheet));
  }

  const combined = path.join(SHEETS_DIR, "enemy-rocket.png");
  await stitchSheet(combinedPaths, combined, CELL);
  console.log("  wrote", path.relative(ROOT, combined));

  const stillSrc = buckets.idle[0];
  await fs.copyFile(stillSrc, path.join(IM, "enemy-rocket.png"));

  const manPath = path.join(SHEETS_DIR, "manifest.json");
  let man = {};
  try {
    man = JSON.parse(await fs.readFile(manPath, "utf8"));
  } catch (_) {
    man = { sheets: {} };
  }
  man.generatedAt = CACHE;
  man.sheets = man.sheets || {};
  man.sheets["enemy-rocket"] = {
    file: "enemy-rocket.png",
    cols: combinedPaths.length,
    rows: 1,
    cell: CELL,
    anims: animIndices,
    holdMs: HOLD,
    source: "imagine-keyframes-pack-clean",
    pixelate: false,
    framesDir: "assets/imagine/frames/video/enemy-rocket",
    perAnimSheets: Object.fromEntries(
      order.map((anim) => [
        anim,
        {
          file: `enemy-rocket-${anim}.png`,
          cols: buckets[anim].length,
          rows: 1,
          cell: CELL,
        },
      ])
    ),
  };
  await fs.writeFile(manPath, JSON.stringify(man, null, 2) + "\n");
  console.log("Updated manifest generatedAt=", CACHE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
