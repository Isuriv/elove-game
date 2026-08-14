/**
 * Grok Imagine image-edit pass: remove floating stray pixels around sprites.
 * Edits named anim frames the game loads, then rebuilds sheets.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-clean-frames.mjs
 *   node scripts/grok-clean-frames.mjs player
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES = path.join(ROOT, "assets", "imagine", "frames", "video");
const SHEETS = path.join(ROOT, "assets", "imagine", "sheets");
const IMAGE_EDIT_API = "https://api.x.ai/v1/images/edits";
const IMAGE_MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const CLEAN_PROMPT = [
  "Clean this exact 2D game sprite frame.",
  "Remove ALL floating stray pixels, dust, speckles, fringe haze, and disconnected bits around the subject.",
  "Keep the subject itself identical - same pose, colors, proportions.",
  "REMOVE any neon, magenta, pink, or cyan glow outline / rim around the silhouette.",
  "Solid pure black #000000 background only.",
  "Hard clean silhouette edges, no soft glow bleed into the background, no text, no HUD.",
].join(" ");

const ASSETS = [
  {
    id: "player-cat-rocket",
    named: ["idle-00", "idle-01", "fly-00", "fly-01", "fly-02", "fly-03", "slash-00", "slash-01", "hurt-00"],
    sheetOrder: [
      "idle-00",
      "idle-01",
      "fly-00",
      "fly-01",
      "fly-02",
      "fly-03",
      "slash-00",
      "slash-01",
    ],
  },
  {
    id: "enemy-drone",
    named: [
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
    sheetOrder: ["fly-00", "fly-01", "fly-02", "fly-03", "fly-04", "fly-05", "hurt-00", "hurt-01", "hurt-02"],
  },
  {
    id: "enemy-cyborg",
    named: [
      "idle-00",
      "idle-01",
      "walk-00",
      "walk-01",
      "walk-02",
      "walk-03",
      "walk-04",
      "walk-05",
      "attack-00",
      "attack-01",
      "attack-02",
      "attack-03",
      "hurt-00",
    ],
    sheetOrder: ["idle-00", "walk-00", "walk-01", "attack-00"],
  },
  {
    id: "pickup-blade",
    named: [
      "spin-00",
      "spin-01",
      "spin-02",
      "spin-03",
      "spin-04",
      "spin-05",
      "spin-06",
      "spin-07",
    ],
    sheetOrder: ["spin-00", "spin-01", "spin-02", "spin-03"],
  },
];

function parseArgs(argv) {
  const only = argv.filter((a) => !a.startsWith("--")).map((s) => s.toLowerCase());
  return { only };
}

async function fileToDataUrl(filePath) {
  const buf = await fs.readFile(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function editImage(apiKey, framePath) {
  const dataUrl = await fileToDataUrl(framePath);
  const res = await fetch(IMAGE_EDIT_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: CLEAN_PROMPT,
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
  else throw new Error("no image data");
  await fs.writeFile(framePath, buf);
}

async function localPolish(page, framePath) {
  const dataUrl = await fileToDataUrl(framePath);
  const outB64 = await page.evaluate(async (src) => {
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

    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      const lum = d[i] + d[i + 1] + d[i + 2];
      if (d[i + 3] < 18 || mx <= 30 || lum <= 45) {
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      }
    }

    const fg = new Uint8Array(n);
    for (let p = 0; p < n; p++) if (d[p * 4 + 3] > 24) fg[p] = 1;

    const label = new Int32Array(n).fill(-1);
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
        for (const q of [p - 1, p + 1, p - w, p + w]) {
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
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 12) {
          d[i] = d[i + 1] = d[i + 2] = 0;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    }

    let main = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[main]) main = i;
    const dilate = 5;
    const near = new Uint8Array(n);
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
          near[ny * w + nx] = 1;
        }
      }
    }
    const keep = new Uint8Array(labelCount);
    keep[main] = 1;
    const minKeep = Math.max(10, (sizes[main] * 0.005) | 0);
    for (let id = 0; id < labelCount; id++) {
      if (id === main || sizes[id] < minKeep) continue;
      for (let p = 0; p < n; p++) {
        if (label[p] === id && near[p]) {
          keep[id] = 1;
          break;
        }
      }
    }
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (d[i + 3] === 0) continue;
      const id = label[p];
      if (id < 0 || !keep[id]) d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
    }
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 12) {
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return c.toDataURL("image/png").split(",")[1];
  }, dataUrl);
  await fs.writeFile(framePath, Buffer.from(outB64, "base64"));
}

async function rebuildSheet(page, id, order) {
  const dir = path.join(FRAMES, id);
  const urls = [];
  for (const name of order) {
    const fp = path.join(dir, `${name}.png`);
    try {
      urls.push(await fileToDataUrl(fp));
    } catch {
      /* skip missing */
    }
  }
  if (!urls.length) return null;
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
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
  return outPath;
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error("Missing XAI_API_KEY");
    process.exit(1);
  }
  const opts = parseArgs(process.argv.slice(2));
  const queue = opts.only.length
    ? ASSETS.filter((a) => opts.only.some((o) => a.id.includes(o)))
    : ASSETS;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const asset of queue) {
    console.log(`\n== ${asset.id} ==`);
    const dir = path.join(FRAMES, asset.id);
    for (const name of asset.named) {
      const fp = path.join(dir, `${name}.png`);
      try {
        await fs.access(fp);
      } catch {
        console.log(`  skip missing ${name}.png`);
        continue;
      }
      process.stdout.write(`  grok-clean ${name}... `);
      try {
        await editImage(apiKey, fp);
        await localPolish(page, fp);
        console.log("ok");
      } catch (err) {
        console.log("FAIL", err.message || err);
      }
    }
    const sheet = await rebuildSheet(page, asset.id, asset.sheetOrder);
    if (sheet) console.log(`  sheet -> ${path.relative(ROOT, sheet)}`);
  }

  await browser.close();
  console.log("\nDone. Hard-refresh the game.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
