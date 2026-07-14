/**
 * Resize sprite PNGs to a shared 128×128 resolution (nearest-neighbor fit + pad).
 *
 * Usage:
 *   node scripts/resize-assets-128.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SIZE = 128;

const DIRS = [
  path.join(ROOT, "assets", "imagine"),
  path.join(ROOT, "assets", "game"),
  path.join(ROOT, "assets", "pixelwhale", "ready"),
];

async function listPngs(dir) {
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((n) => n.toLowerCase().endsWith(".png"))
      .map((n) => path.join(dir, n));
  } catch {
    return [];
  }
}

async function main() {
  const files = (await Promise.all(DIRS.map(listPngs))).flat();
  if (!files.length) {
    console.error("No PNGs found.");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const file of files) {
    const buf = await fs.readFile(file);
    const b64 = buf.toString("base64");
    const dataUrl = `data:image/png;base64,${b64}`;
    const outB64 = await page.evaluate(
      async ({ dataUrl, size }) => {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = dataUrl;
        });
        const scale = Math.min(size / img.width, size / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const ox = ((size - w) / 2) | 0;
        const oy = ((size - h) / 2) | 0;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, ox, oy, w, h);
        return c.toDataURL("image/png").split(",")[1];
      },
      { dataUrl, size: SIZE }
    );
    await fs.writeFile(file, Buffer.from(outB64, "base64"));
    console.log(`ok ${path.relative(ROOT, file)}`);
  }

  await browser.close();
  console.log(`Resized ${files.length} PNGs → ${SIZE}×${SIZE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
