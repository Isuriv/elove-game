/**
 * Capture HD + 360px sheet verification screenshots.
 *   node scripts/capture-hd-360.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots");
const URL = process.env.GAME_URL || "http://localhost:8081/?v=2026-07-16T18:12:56.210Z";

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__ELOVE_ART?.player, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(200);

  await page.screenshot({ path: path.join(OUT, "hd360-title.png") });

  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(80);
    await page.keyboard.up("KeyD");
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "hd360-gameplay.png") });

  const canvas = page.locator("canvas.pixel-canvas, #game-wrap canvas").first();
  if (await canvas.count()) {
    await canvas.screenshot({ path: path.join(OUT, "hd360-canvas.png") });
  }

  const metrics = await page.evaluate(() => {
    const c = document.querySelector("#game-wrap canvas") || document.querySelector("canvas");
    const wrap = document.querySelector("#game-wrap");
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      bufferW: c.width,
      bufferH: c.height,
      cssW: Math.round(rect.width),
      cssH: Math.round(rect.height),
      scaleX: rect.width / c.width,
      scaleY: rect.height / c.height,
      integerScale: Number.isInteger(rect.width / c.width) && Number.isInteger(rect.height / c.height),
      display: window.__ELOVE_DISPLAY || null,
      art: window.__ELOVE_ART || null,
      wrapW: wrap ? Math.round(wrap.getBoundingClientRect().width) : null,
    };
  });
  await fs.writeFile(path.join(OUT, "hd360-metrics.json"), JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
