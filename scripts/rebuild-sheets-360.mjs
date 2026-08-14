/**
 * Rebuild character sprite sheets at 360x360 cells from original Grok video frames.
 *
 * Standard chosen:
 *   - Cell = 360x360 (square character canvas at "360px" authoring resolution)
 *   - Logical pixel grid = 90x90 (360/4) so world pack at /4 and HD display x4
 *     map 1:1: 360 sheet -> 90 world -> 360 CSS px at 4x integer scale
 *   - Internal game FB stays 480x270 (x4 -> 1920x1080)
 *
 * Usage:
 *   node scripts/rebuild-sheets-360.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES = path.join(ROOT, "assets", "imagine", "frames", "video");
const SHEETS = path.join(ROOT, "assets", "imagine", "sheets");
const CELL = 360;
/** Chunky logical pixels inside each 360 cell (integer 4x upscale). */
const LOGIC = 90;

const ASSETS = [
  {
    id: "player-cat-rocket",
    order: [
      "idle-00",
      "idle-01",
      "fly-00",
      "fly-01",
      "fly-02",
      "fly-03",
      "slash-00",
      "slash-01",
    ],
    anims: { idle: [0, 1], fly: [2, 3, 4, 5], slash: [6, 7], hurt: [0] },
    holdMs: { idle: 480, fly: 180, slash: [180, 140], hurt: 140 },
  },
  {
    id: "enemy-drone",
    order: [
      "fly-00",
      "fly-01",
      "fly-02",
      "fly-03",
      "fly-04",
      "fly-05",
      "hurt-00",
      "hurt-01",
      "hurt-02",
    ],
    anims: { fly: [0, 1, 2, 3, 4, 5], hurt: [6, 7, 8] },
    holdMs: { fly: 180, hurt: 120 },
  },
  {
    id: "enemy-cyborg",
    order: [
      "idle-00",
      "idle-01",
      "walk-00",
      "walk-01",
      "walk-02",
      "walk-03",
      "attack-00",
      "attack-01",
      "hurt-00",
      "hurt-00",
    ],
    anims: { idle: [0, 1], walk: [2, 3, 4, 5], attack: [6, 7], hurt: [8, 9] },
    holdMs: { idle: 450, walk: 140, attack: [160, 100, 55, 150], hurt: 120 },
  },
  {
    id: "pickup-blade",
    order: [
      "spin-00",
      "spin-01",
      "spin-02",
      "spin-03",
      "spin-04",
      "spin-05",
      "spin-06",
      "spin-07",
      "spin-00",
      "spin-04",
    ],
    anims: { spin: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    holdMs: { spin: 130 },
  },
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveFrame(dir, name) {
  const primary = path.join(dir, `${name}.png`);
  if (await exists(primary)) return primary;
  return null;
}

async function main() {
  await fs.mkdir(SHEETS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "grok-video-frames-360",
    outline: { baked: true, color: "#000000", logicalPx: 1 },
    cellStandard: {
      cell: CELL,
      logical: LOGIC,
      note:
        "360x360 sheet cells; chunky logical grid 90x90 (x4). Solid black 1-logical-px outline baked into every cell. Pack into 480x270 world at /4 for 1:1 pixel mapping; HD display x4 -> ~360 CSS px character height.",
    },
    sheets: {},
  };

  for (const asset of ASSETS) {
    const dir = path.join(FRAMES, asset.id);
    const paths = [];
    for (const name of asset.order) {
      const fp = await resolveFrame(dir, name);
      if (!fp) {
        console.warn(`  missing ${asset.id}/${name}.png`);
        continue;
      }
      paths.push(fp);
    }
    if (!paths.length) {
      console.error(`skip ${asset.id}: no frames`);
      continue;
    }

    const urls = [];
    for (const fp of paths) {
      const buf = await fs.readFile(fp);
      urls.push(`data:image/png;base64,${buf.toString("base64")}`);
    }

    const outB64 = await page.evaluate(
      async ({ urls, cell, logic }) => {
        function punchBlackEdges(img, threshold = 12) {
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height);
          const d = data.data;
          const w = c.width;
          const h = c.height;
          const seen = new Uint8Array(w * h);
          const stack = [];
          const isBg = (i) =>
            d[i] <= threshold && d[i + 1] <= threshold && d[i + 2] <= threshold && d[i + 3] > 0;
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
          return c;
        }

        function trimAlpha(src) {
          const ctx = src.getContext("2d");
          const { width: w, height: h } = src;
          const data = ctx.getImageData(0, 0, w, h).data;
          let minX = w,
            minY = h,
            maxX = -1,
            maxY = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (data[(y * w + x) * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX < 0) return src;
          const tw = maxX - minX + 1;
          const th = maxY - minY + 1;
          const out = document.createElement("canvas");
          out.width = tw;
          out.height = th;
          const octx = out.getContext("2d");
          octx.imageSmoothingEnabled = false;
          octx.drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
          return out;
        }

        function harden(src) {
          const c = document.createElement("canvas");
          c.width = src.width;
          c.height = src.height;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(src, 0, 0);
          const image = ctx.getImageData(0, 0, c.width, c.height);
          const d = image.data;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 72) {
              d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
            } else {
              d[i] = ((d[i] / 8) | 0) * 8;
              d[i + 1] = ((d[i + 1] / 8) | 0) * 8;
              d[i + 2] = ((d[i + 2] / 8) | 0) * 8;
              d[i + 3] = 255;
            }
          }
          ctx.putImageData(image, 0, 0);
          return c;
        }

        /** Drop inconsistent AI dark-ink edge pixels before baking a uniform rim. */
        function stripDarkOuterRim(src, maxLum = 52) {
          const w = src.width;
          const h = src.height;
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(src, 0, 0);
          const image = ctx.getImageData(0, 0, w, h);
          const d = image.data;
          const kill = new Uint8Array(w * h);
          const alphaAt = (x, y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return 0;
            return d[(y * w + x) * 4 + 3];
          };
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              if (d[i + 3] < 72) continue;
              const open =
                alphaAt(x - 1, y) < 72 ||
                alphaAt(x + 1, y) < 72 ||
                alphaAt(x, y - 1) < 72 ||
                alphaAt(x, y + 1) < 72;
              if (!open) continue;
              const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              if (lum <= maxLum) kill[y * w + x] = 1;
            }
          }
          for (let p = 0; p < kill.length; p++) {
            if (!kill[p]) continue;
            const i = p * 4;
            d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
          }
          ctx.putImageData(image, 0, 0);
          return c;
        }

        /** 1 logical-px solid black silhouette outline (x4 -> 4px in the 360 cell). */
        function bakeHardOutline(src, color = "#000000") {
          const w = src.width;
          const h = src.height;
          const c = document.createElement("canvas");
          c.width = w + 2;
          c.height = h + 2;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          const sil = document.createElement("canvas");
          sil.width = w;
          sil.height = h;
          const sctx = sil.getContext("2d");
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(src, 0, 0);
          sctx.globalCompositeOperation = "source-in";
          sctx.fillStyle = color;
          sctx.fillRect(0, 0, w, h);
          for (const [dx, dy] of [
            [0, 0],
            [2, 0],
            [0, 2],
            [2, 2],
            [1, 0],
            [1, 2],
            [0, 1],
            [2, 1],
          ]) {
            ctx.drawImage(sil, dx, dy);
          }
          ctx.drawImage(src, 1, 1);
          return c;
        }

        /**
         * Fit trimmed art into logicxlogic via integer factors, bake a solid black
         * outline at logical res, then x(cell/logic) nearest into the 360 cell.
         */
        function toCell(trimmed) {
          // Reserve 2 logical px so the baked outline fits inside the 90 grid
          const fit = logic - 2;
          let n = 1;
          while (
            n < 64 &&
            (Math.floor(trimmed.width / n) > fit || Math.floor(trimmed.height / n) > fit)
          ) {
            n++;
          }
          let lw = Math.max(1, Math.floor(trimmed.width / n));
          let lh = Math.max(1, Math.floor(trimmed.height / n));
          if (lw > fit || lh > fit) {
            const s = Math.min(fit / lw, fit / lh);
            lw = Math.max(1, Math.round(lw * s));
            lh = Math.max(1, Math.round(lh * s));
          }
          const logical = document.createElement("canvas");
          logical.width = lw;
          logical.height = lh;
          const lctx = logical.getContext("2d");
          lctx.imageSmoothingEnabled = false;
          lctx.drawImage(trimmed, 0, 0, lw, lh);
          let spr = harden(logical);
          spr = stripDarkOuterRim(spr);
          spr = bakeHardOutline(spr, "#000000");

          const scale = cell / logic; // 4
          const sw = spr.width * scale;
          const sh = spr.height * scale;
          const cellC = document.createElement("canvas");
          cellC.width = cell;
          cellC.height = cell;
          const ctx = cellC.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, cell, cell);
          const ox = ((cell - sw) / 2) | 0;
          const oy = cell - sh; // bottom-align feet
          ctx.drawImage(spr, 0, 0, spr.width, spr.height, ox, oy, sw, sh);
          return cellC;
        }

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

        const sheet = document.createElement("canvas");
        sheet.width = cell * imgs.length;
        sheet.height = cell;
        const sctx = sheet.getContext("2d");
        sctx.imageSmoothingEnabled = false;
        sctx.clearRect(0, 0, sheet.width, sheet.height);

        for (let i = 0; i < imgs.length; i++) {
          const punched = punchBlackEdges(imgs[i]);
          const trimmed = trimAlpha(punched);
          const cellC = toCell(trimmed);
          sctx.drawImage(cellC, i * cell, 0);
        }
        return sheet.toDataURL("image/png").split(",")[1];
      },
      { urls, cell: CELL, logic: LOGIC }
    );

    const outPath = path.join(SHEETS, `${asset.id}.png`);
    await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
    console.log(
      `ok ${asset.id}: ${paths.length} frames -> ${CELL}x${CELL} cells (${CELL * paths.length}x${CELL})`
    );

    manifest.sheets[asset.id] = {
      file: `${asset.id}.png`,
      cols: paths.length,
      rows: 1,
      cell: CELL,
      anims: asset.anims,
      holdMs: asset.holdMs,
      source: "grok-video-frames-360",
      framesDir: `assets/imagine/frames/video/${asset.id}`,
    };
  }

  await fs.writeFile(path.join(SHEETS, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log("wrote assets/imagine/sheets/manifest.json");
  console.log(`cell=${CELL} logical=${LOGIC} (x${CELL / LOGIC})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
