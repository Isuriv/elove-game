/**
 * Remove floating stray pixels from Grok video sprite frames.
 * Keeps the main silhouette + nearby FX (thruster sparks, muzzle flash).
 *
 * Usage:
 *   node scripts/clean-sprite-frames.mjs
 *   node scripts/clean-sprite-frames.mjs player
 *   node scripts/clean-sprite-frames.mjs --rebuild-sheets
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES = path.join(ROOT, "assets", "imagine", "frames", "video");
const SHEETS = path.join(ROOT, "assets", "imagine", "sheets");

const IDS = ["player-cat-rocket", "enemy-drone", "enemy-cyborg", "pickup-blade"];
const NAMED = /^(idle|fly|slash|hurt|walk|attack|spin)-\d+\.png$/i;

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const only = argv.filter((a) => !a.startsWith("--")).map((s) => s.toLowerCase());
  return { only, rebuildSheets: flags.has("--rebuild-sheets") };
}

async function listFrames(id) {
  const dir = path.join(FRAMES, id);
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => NAMED.test(n) || new RegExp(`^${id}-\\d+\\.png$`, "i").test(n))
    .map((n) => path.join(dir, n));
}

async function cleanFrame(page, filePath) {
  const buf = await fs.readFile(filePath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  const result = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = src;
    });
    const w = img.width;
    const h = img.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    const n = w * h;
    const beforeOpaque = (() => {
      let c = 0;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] + d[i + 1] + d[i + 2];
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        if (d[i + 3] > 24 && mx > 28 && lum > 40) c++;
      }
      return c;
    })();

    // Punch near-black / dim dust to empty (do NOT kill cyan/magenta rocket body colors)
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      const lum = r + g + b;
      const mx = Math.max(r, g, b);
      if (a < 18 || mx <= 28 || lum <= 42) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
      }
    }

    const fg = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (d[p * 4 + 3] > 24) fg[p] = 1;
    }

    // Connected components (4-connected)
    const label = new Int32Array(n);
    label.fill(-1);
    const sizes = [];
    const stack = new Int32Array(n);
    let labelCount = 0;

    for (let start = 0; start < n; start++) {
      if (!fg[start] || label[start] >= 0) continue;
      let sp = 0;
      stack[sp++] = start;
      label[start] = labelCount;
      let size = 0;
      while (sp) {
        const p = stack[--sp];
        size++;
        const x = p % w;
        const y = (p / w) | 0;
        const neighbors = [p - 1, p + 1, p - w, p + w];
        for (const q of neighbors) {
          if (q < 0 || q >= n) continue;
          const qx = q % w;
          const qy = (q / w) | 0;
          if (Math.abs(qx - x) + Math.abs(qy - y) !== 1) continue;
          if (!fg[q] || label[q] >= 0) continue;
          label[q] = labelCount;
          stack[sp++] = q;
        }
      }
      sizes.push(size);
      labelCount++;
    }

    if (!labelCount) {
      return { b64: c.toDataURL("image/png").split(",")[1], removed: 0, kept: 0 };
    }

    let main = 0;
    for (let i = 1; i < sizes.length; i++) {
      if (sizes[i] > sizes[main]) main = i;
    }
    const mainSize = sizes[main];

    // Dilate main mask a bit so nearby thruster / muzzle bits stay
    const nearMain = new Uint8Array(n);
    const dilate = 6;
    for (let p = 0; p < n; p++) {
      if (label[p] !== main) continue;
      const x = p % w;
      const y = (p / w) | 0;
      for (let dy = -dilate; dy <= dilate; dy++) {
        for (let dx = -dilate; dx <= dilate; dx++) {
          if (dx * dx + dy * dy > dilate * dilate) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          nearMain[ny * w + nx] = 1;
        }
      }
    }

    const keep = new Uint8Array(labelCount);
    keep[main] = 1;
    // Drop tiny islands; keep larger nearby FX (muzzle / thruster)
    const minKeep = Math.max(12, Math.floor(mainSize * 0.006));
    for (let id = 0; id < labelCount; id++) {
      if (id === main) continue;
      if (sizes[id] < minKeep) continue;
      let touches = false;
      for (let p = 0; p < n; p++) {
        if (label[p] === id && nearMain[p]) {
          touches = true;
          break;
        }
      }
      if (touches) keep[id] = 1;
    }

    let removed = 0;
    let kept = 0;
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (d[i + 3] === 0) continue;
      const id = label[p];
      if (id < 0 || !keep[id]) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
        removed++;
      } else {
        kept++;
      }
    }

    // Density prune: kill sparse spray / chromatic fringe while keeping solid body
    const dens = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      if (d[p * 4 + 3] <= 24) continue;
      const x = p % w;
      const y = (p / w) | 0;
      let count = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (d[(ny * w + nx) * 4 + 3] > 24) count++;
        }
      }
      dens[p] = count;
    }
    // Morphological core: erode sparse edges, dilate back slightly
    let mask = new Uint8Array(n);
    for (let p = 0; p < n; p++) mask[p] = dens[p] >= 10 ? 1 : 0;
    for (let pass = 0; pass < 2; pass++) {
      const next = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        if (!mask[p]) continue;
        const x = p % w;
        const y = (p / w) | 0;
        let ok = true;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !mask[ny * w + nx]) {
            ok = false;
            break;
          }
        }
        if (ok) next[p] = 1;
      }
      mask = next;
    }
    // Dilate core outward to restore outline thickness (~3px)
    let keepMask = mask;
    for (let pass = 0; pass < 3; pass++) {
      const next = new Uint8Array(n);
      for (let p = 0; p < n; p++) {
        if (keepMask[p]) {
          next[p] = 1;
          continue;
        }
        const x = p % w;
        const y = (p / w) | 0;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (keepMask[ny * w + nx]) {
            next[p] = 1;
            break;
          }
        }
      }
      keepMask = next;
    }
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (d[i + 3] > 24 && !keepMask[p]) {
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
        removed++;
        kept = Math.max(0, kept - 1);
      }
    }

    // Restore opaque black background for game pipeline consistency
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 12) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
    return {
      b64: c.toDataURL("image/png").split(",")[1],
      removed,
      kept,
      components: labelCount,
      keptComponents: Array.from(keep).reduce((a, b) => a + b, 0),
    };
  }, dataUrl);

  await fs.writeFile(filePath, Buffer.from(result.b64, "base64"));
  return result;
}

async function rebuildSheet(page, id) {
  const dir = path.join(FRAMES, id);
  const names = (await fs.readdir(dir))
    .filter((n) => new RegExp(`^${id}-\\d+\\.png$`, "i").test(n))
    .sort();
  if (!names.length) return null;

  const urls = [];
  for (const n of names) {
    const buf = await fs.readFile(path.join(dir, n));
    urls.push(`data:image/png;base64,${buf.toString("base64")}`);
  }

  const cell = 128;
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
        ctx.drawImage(img, i * cell + ((cell - w) / 2) | 0, ((cell - h) / 2) | 0, w, h);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { urls, cell }
  );

  const outPath = path.join(SHEETS, `${id}.png`);
  await fs.mkdir(SHEETS, { recursive: true });
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
  return outPath;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const queue = opts.only.length
    ? IDS.filter((id) => opts.only.some((o) => id.includes(o)))
    : IDS;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let totalRemoved = 0;
  let totalFiles = 0;

  for (const id of queue) {
    const files = await listFrames(id);
    console.log(`\n== ${id} (${files.length} frames) ==`);
    for (const fp of files) {
      const r = await cleanFrame(page, fp);
      totalRemoved += r.removed;
      totalFiles++;
      const name = path.basename(fp);
      console.log(
        `  ${name}: removed ${r.removed} px (kept ${r.keptComponents}/${r.components} blobs)`
      );
    }
    if (opts.rebuildSheets || true) {
      const sheet = await rebuildSheet(page, id);
      if (sheet) console.log(`  sheet -> ${path.relative(ROOT, sheet)}`);
    }
  }

  await browser.close();
  console.log(`\nDone. Cleaned ${totalFiles} frames, removed ${totalRemoved} stray pixels.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
