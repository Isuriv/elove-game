/**
 * Probe integer pixel-grid scales for Imagine sprites (visual comparison strip).
 *   node scripts/respass-scale-probe.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");

async function fileToDataUrl(fp) {
  return `data:image/png;base64,${(await fs.readFile(fp)).toString("base64")}`;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const frameUrl = await fileToDataUrl(
    path.join(ROOT, "assets/imagine/frames/video/player-cat-rocket/idle-00.png")
  );
  const sheetUrl = await fileToDataUrl(
    path.join(ROOT, "assets/imagine/sheets/player-cat-rocket.png")
  );

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 400 } });

  const out = await page.evaluate(async ({ frameUrl, sheetUrl }) => {
    async function load(src) {
      const img = new Image();
      await new Promise((r, j) => {
        img.onload = r;
        img.onerror = j;
        img.src = src;
      });
      return img;
    }
    function toCanvas(img) {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      return c;
    }
    function punchBlackEdges(img, threshold = 22) {
      const c = toCanvas(img);
      const ctx = c.getContext("2d");
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
      const w = src.width;
      const h = src.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 8) {
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
      const o = out.getContext("2d");
      o.imageSmoothingEnabled = false;
      o.drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
      return out;
    }
    function detectBlock(src) {
      const ctx = src.getContext("2d");
      const w = src.width;
      const h = src.height;
      const { data } = ctx.getImageData(0, 0, w, h);
      const freq = new Map();
      for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y += Math.max(1, (h / 16) | 0)) {
        let run = 1;
        for (let x = 1; x < w; x++) {
          const i = (y * w + x) * 4;
          const p = (y * w + x - 1) * 4;
          const same =
            data[i] === data[p] &&
            data[i + 1] === data[p + 1] &&
            data[i + 2] === data[p + 2] &&
            data[i + 3] === data[p + 3];
          if (same) run++;
          else {
            if (run >= 2 && run <= 24 && data[p + 3] > 200) freq.set(run, (freq.get(run) || 0) + 1);
            run = 1;
          }
        }
      }
      let best = 1;
      let bestN = 0;
      for (const [k, v] of freq) if (v > bestN) {
        best = k;
        bestN = v;
      }
      return best;
    }
    function down(src, block) {
      const w = Math.max(1, Math.floor(src.width / block));
      const h = Math.max(1, Math.floor(src.height / block));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, w, h);
      return c;
    }
    function up(src, factor) {
      const c = document.createElement("canvas");
      c.width = src.width * factor;
      c.height = src.height * factor;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, c.width, c.height);
      return c;
    }
    function pack(src, boxW, boxH) {
      const scale = Math.min(boxW / src.width, boxH / src.height);
      const w = Math.max(1, Math.round(src.width * scale));
      const h = Math.max(1, Math.round(src.height * scale));
      const c = document.createElement("canvas");
      c.width = boxW;
      c.height = boxH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, ((boxW - w) / 2) | 0, boxH - h, w, h);
      return c;
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
        const a = d[i + 3];
        if (a < 96) {
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
    function bakeOutline(src, color = "#1a0a2e") {
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
      sctx.drawImage(src, 0, 0);
      sctx.globalCompositeOperation = "source-in";
      sctx.fillStyle = color;
      sctx.fillRect(0, 0, w, h);
      for (const [dx, dy] of [
        [0, 0],
        [0, 2],
        [2, 0],
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

    const frame = await load(frameUrl);
    const sheet = await load(sheetUrl);
    const trimmed = trimAlpha(punchBlackEdges(frame));
    const block = detectBlock(trimmed);
    const logical = down(trimmed, block);

    const cell = document.createElement("canvas");
    cell.width = 128;
    cell.height = 128;
    const cctx = cell.getContext("2d");
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(sheet, 0, 0, 128, 128, 0, 0, 128, 128);
    const sheetTrim = trimAlpha(punchBlackEdges(cell));
    const sheetBlock = detectBlock(sheetTrim);
    const sheetLogical = down(sheetTrim, sheetBlock);

    const variants = [];
    variants.push({ name: "current-52x39", img: harden(pack(trimmed, 52, 39)) });
    for (const f of [2, 3, 4]) {
      const u = up(logical, f);
      variants.push({ name: `vid-${f}x`, img: harden(u) });
      variants.push({ name: `vid-${f}x+ol`, img: harden(bakeOutline(u)) });
    }
    for (const f of [2, 3, 4]) {
      const u = up(sheetLogical, f);
      variants.push({ name: `sheet-${f}x`, img: harden(u) });
      variants.push({ name: `sheet-${f}x+ol`, img: harden(bakeOutline(u)) });
    }

    const pad = 10;
    let tw = pad;
    let th = 0;
    for (const v of variants) {
      tw += v.img.width + pad;
      th = Math.max(th, v.img.height + 24);
    }
    const strip = document.createElement("canvas");
    strip.width = tw;
    strip.height = th + pad;
    const ctx = strip.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#12081f";
    ctx.fillRect(0, 0, strip.width, strip.height);
    ctx.fillStyle = "#ffe6ff";
    ctx.font = "11px monospace";
    let x = pad;
    for (const v of variants) {
      ctx.fillText(v.name, x, 14);
      ctx.drawImage(v.img, x, 20);
      x += v.img.width + pad;
    }

    return {
      block,
      logical: `${logical.width}x${logical.height}`,
      sheetBlock,
      sheetLogical: `${sheetLogical.width}x${sheetLogical.height}`,
      variants: variants.map((v) => ({ name: v.name, w: v.img.width, h: v.img.height })),
      strip: strip.toDataURL("image/png"),
    };
  }, { frameUrl, sheetUrl });

  await fs.writeFile(
    path.join(OUT, "respass-scale-variants.png"),
    Buffer.from(out.strip.split(",")[1], "base64")
  );
  await fs.writeFile(path.join(OUT, "respass-scale-variants.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    block: out.block,
    logical: out.logical,
    sheetBlock: out.sheetBlock,
    sheetLogical: out.sheetLogical,
    variants: out.variants,
  }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
