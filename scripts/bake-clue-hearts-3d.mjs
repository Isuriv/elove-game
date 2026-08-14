/**
 * Bake Elove-note pickups as smooth (non-pixel) pink hearts with a 3D Y-spin.
 * Canvas2D antialiased heart + foreshorten scaleX = cos(yaw).
 *
 *   node scripts/bake-clue-hearts-3d.mjs
 *
 * Writes:
 *   assets/imagine/powerups/clue-heart/00.png ... 15.png
 *   assets/imagine/powerups/clue.png  (frame 0 alias)
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "imagine", "powerups", "clue-heart");
const OUT_ALIAS = path.join(ROOT, "assets", "imagine", "powerups", "clue.png");

const SIZE = 128;
const FRAMES = 16;

const PAGE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head><body>
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script>
const SIZE = ${SIZE};
const FRAMES = ${FRAMES};
const PINK = "#ff2ea6";
const PINK_HI = "#ff6ec7";

function drawSmoothHeart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.72);
  ctx.bezierCurveTo(cx - s * 0.08, cy + s * 0.28, cx - s * 0.95, cy + s * 0.12, cx - s * 0.95, cy - s * 0.28);
  ctx.bezierCurveTo(cx - s * 0.95, cy - s * 0.72, cx - s * 0.42, cy - s * 0.95, cx, cy - s * 0.42);
  ctx.bezierCurveTo(cx + s * 0.42, cy - s * 0.95, cx + s * 0.95, cy - s * 0.72, cx + s * 0.95, cy - s * 0.28);
  ctx.bezierCurveTo(cx + s * 0.95, cy + s * 0.12, cx + s * 0.08, cy + s * 0.28, cx, cy + s * 0.72);
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - s * 0.25, cy - s * 0.2, s * 0.05, cx, cy, s * 1.1);
  g.addColorStop(0, PINK_HI);
  g.addColorStop(0.55, PINK);
  g.addColorStop(1, "#d4147a");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.32, cy - s * 0.35, s * 0.14, s * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,240,248,0.9)";
  ctx.fill();
}

window.__bakeAll = async function () {
  const master = document.createElement("canvas");
  master.width = SIZE;
  master.height = SIZE;
  const mctx = master.getContext("2d");
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = "high";
  drawSmoothHeart(mctx, SIZE / 2, SIZE / 2 + 4, SIZE * 0.38);

  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    const yaw = (i / FRAMES) * Math.PI * 2;
    const sx = Math.cos(yaw);
    const absSx = Math.max(0.06, Math.abs(sx));
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.scale(sx >= 0 ? absSx : -absSx, 1);
    ctx.drawImage(master, -SIZE / 2, -SIZE / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (absSx < 0.2) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = PINK;
      ctx.fillRect(SIZE / 2 - 2, SIZE * 0.22, 4, SIZE * 0.56);
      ctx.globalAlpha = 1;
    }
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    frames.push(Array.from(new Uint8Array(await blob.arrayBuffer())));
  }
  return frames;
};
window.__ready = true;
</script>
</body></html>`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.setContent(PAGE_HTML, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const frames = await page.evaluate(async () => window.__bakeAll());
  for (let i = 0; i < frames.length; i++) {
    const buf = Buffer.from(frames[i]);
    const name = `${String(i).padStart(2, "0")}.png`;
    await fs.writeFile(path.join(OUT_DIR, name), buf);
    console.log("clue-heart", name, buf.length);
    if (i === 0) {
      await fs.writeFile(OUT_ALIAS, buf);
      console.log("  -> clue.png alias");
    }
  }
  await browser.close();
  console.log("Done ->", path.relative(ROOT, OUT_DIR));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
