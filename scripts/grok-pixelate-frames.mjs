/**
 * Grok Imagine: force hard chunky pixel art on named anim frames.
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-pixelate-frames.mjs
 *   node scripts/grok-pixelate-frames.mjs player
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FRAMES = path.join(ROOT, "assets", "imagine", "frames", "video");
const IMAGE_EDIT_API = "https://api.x.ai/v1/images/edits";
const IMAGE_MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PROMPT = [
  "Convert this exact game sprite into HARD CHUNKY PIXEL ART.",
  "Every visible pixel must be a solid opaque color block - NO anti-aliasing, NO soft glow, NO fringe haze, NO blur.",
  "REMOVE any neon, magenta, pink, or cyan glow outline / rim light around the silhouette.",
  "Keep the same subject, pose, and colors. Clean simple hard pixels only - no outline halo.",
  "Solid pure black #000000 background. Side-view 2D game sprite, no text, no HUD.",
].join(" ");

const ASSETS = [
  {
    id: "player-cat-rocket",
    named: ["idle-00", "idle-01", "fly-00", "fly-01", "fly-02", "fly-03", "slash-00", "slash-01", "hurt-00"],
  },
  {
    id: "enemy-drone",
    named: ["fly-00", "fly-01", "fly-02", "fly-03", "fly-04", "fly-05", "hurt-00", "hurt-01", "hurt-02"],
  },
  {
    id: "enemy-cyborg",
    named: ["idle-00", "idle-01", "walk-00", "walk-01", "walk-02", "walk-03", "walk-04", "walk-05", "attack-00", "attack-01", "attack-02", "attack-03", "hurt-00"],
  },
];

async function fileToDataUrl(fp) {
  return `data:image/png;base64,${(await fs.readFile(fp)).toString("base64")}`;
}

async function editImage(apiKey, fp) {
  const res = await fetch(IMAGE_EDIT_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: PROMPT,
      image: { url: await fileToDataUrl(fp), type: "image_url" },
      response_format: "b64_json",
      aspect_ratio: "1:1",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  const buf = b64
    ? Buffer.from(b64, "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  await fs.writeFile(fp, buf);
}

async function localPixelate(page, fp) {
  const src = await fileToDataUrl(fp);
  const out = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((r, j) => {
      img.onload = r;
      img.onerror = j;
      img.src = src;
    });
    const w = img.width;
    const h = img.height;
    // Downsample -> nearest up = chunky pixels
    const block = Math.max(2, Math.round(Math.min(w, h) / 64));
    const sw = Math.max(8, Math.floor(w / block));
    const sh = Math.max(8, Math.floor(h / block));
    const small = document.createElement("canvas");
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(img, 0, 0, sw, sh);

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(small, 0, 0, w, h);

    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    const n = w * h;
    const alpha = new Uint8Array(n);
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      alpha[p] = d[i + 3] >= 100 && mx > 28 ? 1 : 0;
    }
    // Only strip chromatic fringe on the outer silhouette edge - keep rocket cyan/magenta body.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (!alpha[p]) continue;
        let bgN = 0;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          if (!alpha[(y + dy) * w + (x + dx)]) bgN++;
        }
        if (bgN < 2) continue;
        const i = p * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const whiteish = r > 200 && g > 190 && b > 190;
        // Thin neon glow rim: high sat + mostly empty neighbors, not solid rocket paint
        if (!whiteish && sat > 70 && bgN >= 3 && Math.max(r, g, b) < 230) {
          d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
          alpha[p] = 0;
        }
      }
    }
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]);
      if (d[i + 3] < 100 || mx <= 28) {
        d[i] = d[i + 1] = d[i + 2] = 0;
        d[i + 3] = 255;
      } else {
        d[i] = ((d[i] / 8) | 0) * 8;
        d[i + 1] = ((d[i + 1] / 8) | 0) * 8;
        d[i + 2] = ((d[i + 2] / 8) | 0) * 8;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL("image/png").split(",")[1];
  }, src);
  await fs.writeFile(fp, Buffer.from(out, "base64"));
}

async function main() {
  const args = process.argv.slice(2);
  const localOnly = args.includes("--local-only");
  const apiKey = process.env.XAI_API_KEY;
  if (!localOnly && !apiKey) {
    console.error("Missing XAI_API_KEY (or pass --local-only)");
    process.exit(1);
  }
  const only = args.filter((a) => !a.startsWith("--")).map((s) => s.toLowerCase());
  const queue = only.length ? ASSETS.filter((a) => only.some((o) => a.id.includes(o))) : ASSETS;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const asset of queue) {
    console.log(`\n== ${asset.id} ==`);
    for (const name of asset.named) {
      const fp = path.join(FRAMES, asset.id, `${name}.png`);
      try {
        await fs.access(fp);
      } catch {
        console.log(`  skip ${name}`);
        continue;
      }
      process.stdout.write(`  pixelate ${name}${localOnly ? " (local)" : ""}... `);
      try {
        if (!localOnly) await editImage(apiKey, fp);
        await localPixelate(page, fp);
        console.log("ok");
      } catch (e) {
        console.log("FAIL", e.message || e);
      }
    }
  }
  await browser.close();
  console.log("\nDone. Hard-refresh the game.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
