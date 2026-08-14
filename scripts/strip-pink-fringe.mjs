/**
 * Drop tiny pink/magenta glow islands on sprite edges.
 * Keeps solid rocket magenta accents (larger connected regions).
 *
 *   node scripts/strip-pink-fringe.mjs player
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES = path.join(ROOT, "assets", "imagine", "frames", "video");
const SHEETS = path.join(ROOT, "assets", "imagine", "sheets");

const IDS = ["player-cat-rocket"];

async function stripFile(page, fp) {
  const buf = await fs.readFile(fp);
  const src = `data:image/png;base64,${buf.toString("base64")}`;
  const out = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((r, j) => {
      img.onload = r;
      img.onerror = j;
      img.src = src;
    });
    const w = img.width;
    const h = img.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const n = w * h;

    const isFg = (p) => {
      const i = p * 4;
      return d[i + 3] > 40 && Math.max(d[i], d[i + 1], d[i + 2]) > 30;
    };
    const isPinkish = (p) => {
      const i = p * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      return r > 140 && b > 80 && g < r * 0.75 && r - g > 35;
    };

    const label = new Int32Array(n).fill(-1);
    const sizes = [];
    const stack = new Int32Array(n);
    let lc = 0;
    for (let s = 0; s < n; s++) {
      if (!isFg(s) || !isPinkish(s) || label[s] >= 0) continue;
      let sp = 0;
      stack[sp++] = s;
      label[s] = lc;
      let sz = 0;
      while (sp) {
        const p = stack[--sp];
        sz++;
        const x = p % w;
        const y = (p / w) | 0;
        for (const q of [p - 1, p + 1, p - w, p + w]) {
          if (q < 0 || q >= n) continue;
          const qx = q % w;
          const qy = (q / w) | 0;
          if (Math.abs(qx - x) + Math.abs(qy - y) !== 1) continue;
          if (!isFg(q) || !isPinkish(q) || label[q] >= 0) continue;
          label[q] = lc;
          stack[sp++] = q;
        }
      }
      sizes.push(sz);
      lc++;
    }

    const minKeep = 28;
    for (let p = 0; p < n; p++) {
      const idl = label[p];
      if (idl >= 0 && sizes[idl] < minKeep) {
        d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = 0;
        d[p * 4 + 3] = 255;
      }
    }

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (!isFg(p)) continue;
        let bg = 0;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          if (!isFg((y + dy) * w + (x + dx))) bg++;
        }
        if (bg < 3) continue;
        const i = p * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat > 50 && Math.max(r, g, b) < 210) {
          let support = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const q = (y + dy) * w + (x + dx);
              if (!isFg(q)) continue;
              const qi = q * 4;
              if (
                Math.abs(d[qi] - r) +
                  Math.abs(d[qi + 1] - g) +
                  Math.abs(d[qi + 2] - b) <
                60
              ) {
                support++;
              }
            }
          }
          if (support <= 2) {
            d[i] = d[i + 1] = d[i + 2] = 0;
            d[i + 3] = 255;
          }
        }
      }
    }

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 12 || d[i] + d[i + 1] + d[i + 2] <= 30) {
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL("image/png").split(",")[1];
  }, src);
  await fs.writeFile(fp, Buffer.from(out, "base64"));
}

async function rebuildSheet(page, id) {
  const dir = path.join(FRAMES, id);
  const urls = [];
  for (let i = 0; i < 8; i++) {
    const fp = path.join(dir, `${id}-${String(i).padStart(2, "0")}.png`);
    urls.push(`data:image/png;base64,${(await fs.readFile(fp)).toString("base64")}`);
  }
  const cell = 128;
  const outB64 = await page.evaluate(
    async ({ urls, cell }) => {
      const imgs = [];
      for (const src of urls) {
        const img = new Image();
        await new Promise((r, j) => {
          img.onload = r;
          img.onerror = j;
          img.src = src;
        });
        imgs.push(img);
      }
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
        const ww = Math.max(1, Math.round(img.width * scale));
        const hh = Math.max(1, Math.round(img.height * scale));
        ctx.drawImage(img, i * cell + (((cell - ww) / 2) | 0), ((cell - hh) / 2) | 0, ww, hh);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { urls, cell }
  );
  const outPath = path.join(SHEETS, `${id}.png`);
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
  return outPath;
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((s) => s.toLowerCase());
  const queue = only.length ? IDS.filter((id) => only.some((o) => id.includes(o))) : IDS;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const id of queue) {
    const dir = path.join(FRAMES, id);
    const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".png"));
    console.log(`== ${id} ==`);
    for (const name of names) {
      await stripFile(page, path.join(dir, name));
      console.log(`  ${name}`);
    }
    const sheet = await rebuildSheet(page, id);
    console.log(`  sheet -> ${path.relative(ROOT, sheet)}`);
  }

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
