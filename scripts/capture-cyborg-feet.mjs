/**
 * Capture cyborg feet screenshots after spawn settle.
 *   node scripts/capture-cyborg-feet.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots");
const URL = process.env.GAME_URL || "http://localhost:8081/?v=2026-07-18T23:20:00.000Z";
const FULL_NAME = process.env.SHOT_FULL || "cyborg-feet-after.png";
const CANVAS_NAME = process.env.SHOT_CANVAS || "cyborg-feet-after-canvas.png";

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);

  // Start game
  await page.keyboard.press("Enter");
  // Wait for cyborgs to settle on ground
  await page.waitForTimeout(1500);

  // Nudge camera/player right so a cyborg is mid-screen
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(450);
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(200);

  const beforePath = path.join(OUT, FULL_NAME);
  const canvasPath = path.join(OUT, CANVAS_NAME);

  // Full viewport / game area
  const wrap = page.locator("#game-wrap");
  if (await wrap.count()) {
    await wrap.screenshot({ path: beforePath });
  } else {
    await page.screenshot({ path: beforePath, fullPage: false });
  }

  // Canvas crop
  const canvas = page.locator("#game-wrap canvas, canvas.pixel-canvas, canvas").first();
  if (await canvas.count()) {
    await canvas.screenshot({ path: canvasPath });
  } else {
    await page.screenshot({ path: canvasPath, fullPage: false });
  }

  // Probe for exposed cyborg/enemy positions
  const info = await page.evaluate(() => {
    const g = globalThis;
    const candidates = [
      g.enemies,
      g.cyborgs,
      g.game?.enemies,
      g.game?.world?.enemies,
      g.state?.enemies,
      g.__DEBUG__?.enemies,
      g.ELove?.enemies,
    ];
    for (const list of candidates) {
      if (Array.isArray(list) && list.length) {
        return list.slice(0, 12).map((e, i) => ({
          i,
          type: e?.type ?? e?.kind ?? e?.name ?? null,
          x: e?.x ?? e?.pos?.x ?? e?.position?.x ?? null,
          y: e?.y ?? e?.pos?.y ?? e?.position?.y ?? null,
          vx: e?.vx ?? null,
          vy: e?.vy ?? null,
          onGround: e?.onGround ?? e?.grounded ?? null,
        }));
      }
    }
    const keys = Object.keys(g).filter((k) => /enemy|cyborg|game|debug/i.test(k)).slice(0, 40);
    return { exposed: false, globalKeysHint: keys };
  });
  console.log("cyborg/enemy probe:", JSON.stringify(info, null, 2));
  console.log("saved", beforePath);
  console.log("saved", canvasPath);
  console.log("url", URL);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
