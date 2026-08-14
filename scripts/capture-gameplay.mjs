/**
 * Capture gameplay screenshots for pixel-crawl diagnosis.
 *   node scripts/capture-gameplay.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots");
const URL = process.env.GAME_URL || "http://localhost:8080/";

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  // Force integer display scale via game resize if present
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(200);

  // Dismiss title / start if needed
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "pixel-diag-title-or-spawn.png"), fullPage: false });

  // Move right while capturing frames
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(120);
    await page.keyboard.up("KeyD");
    await page.waitForTimeout(40);
    await page.screenshot({ path: path.join(OUT, `pixel-diag-move-${i}.png`) });
  }

  // Crop canvas only if present
  const canvas = page.locator("canvas.pixel-canvas, #game-wrap canvas").first();
  if (await canvas.count()) {
    await canvas.screenshot({ path: path.join(OUT, "pixel-diag-canvas.png") });
  }

  // Measure display scale
  const metrics = await page.evaluate(() => {
    const c = document.querySelector("#game-wrap canvas") || document.querySelector("canvas");
    const wrap = document.querySelector("#game-wrap");
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      bufferW: c.width,
      bufferH: c.height,
      cssW: rect.width,
      cssH: rect.height,
      scaleX: rect.width / c.width,
      scaleY: rect.height / c.height,
      wrapW: wrap?.getBoundingClientRect().width,
      integerScale: Number.isInteger(rect.width / c.width) && Number.isInteger(rect.height / c.height),
    };
  });
  await fs.writeFile(path.join(OUT, "pixel-diag-metrics.json"), JSON.stringify(metrics, null, 2));
  console.log("metrics", metrics);
  console.log("screenshots ->", OUT);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
