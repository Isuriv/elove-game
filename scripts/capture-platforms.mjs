/**
 * Capture platform art screenshots (slip / bounce).
 *   node scripts/capture-platforms.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots");
const BASE = process.env.GAME_URL || "http://localhost:8081/";
const URL = `${BASE.replace(/\/?$/, "/")}?v=plat-types-20260719b`;

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const platformHits = {};
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/assets/imagine/platforms/")) {
      const name = u.split("/").pop().split("?")[0];
      platformHits[name] = res.status();
    }
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Start game
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);

  const canvas = page.locator("canvas.pixel-canvas, #game-wrap canvas, canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 15000 });

  await page.screenshot({ path: path.join(OUT, "platforms-spawn.png"), fullPage: false });

  // Move right + occasional jumps toward cyan slip platforms
  for (let i = 0; i < 8; i++) {
    await holdKey(page, "KeyD", 350);
    if (i % 2 === 1) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(180);
    }
    await page.waitForTimeout(80);
  }
  await page.screenshot({ path: path.join(OUT, "platforms-slip.png"), fullPage: false });

  // Continue further for gold bounce platforms
  for (let i = 0; i < 10; i++) {
    await holdKey(page, "KeyD", 400);
    if (i % 2 === 0) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(60);
  }
  await page.screenshot({ path: path.join(OUT, "platforms-bounce.png"), fullPage: false });

  await canvas.screenshot({ path: path.join(OUT, "platforms-canvas.png") });

  const artCheck = await page.evaluate(async () => {
    const files = ["platform-grip.png", "platform-slip.png", "platform-bounce.png"];
    const fetchStatus = {};
    for (const f of files) {
      try {
        const r = await fetch(`assets/imagine/platforms/${f}`);
        fetchStatus[f] = r.status;
      } catch (e) {
        fetchStatus[f] = String(e && e.message ? e.message : e);
      }
    }
    const art = window.__ELOVE_ART || null;
    const ArtGlobal = typeof Art !== "undefined" ? Art : null;
    let neonColors = null;
    if (ArtGlobal?.neon) {
      neonColors = {
        platform: !!(ArtGlobal.neon.platform && ArtGlobal.neon.platform.width),
        platformSlip: !!(ArtGlobal.neon.platformSlip && ArtGlobal.neon.platformSlip.width),
        platformBounce: !!(ArtGlobal.neon.platformBounce && ArtGlobal.neon.platformBounce.width),
        dims: {
          platform: ArtGlobal.neon.platform
            ? { w: ArtGlobal.neon.platform.width, h: ArtGlobal.neon.platform.height }
            : null,
          platformSlip: ArtGlobal.neon.platformSlip
            ? { w: ArtGlobal.neon.platformSlip.width, h: ArtGlobal.neon.platformSlip.height }
            : null,
          platformBounce: ArtGlobal.neon.platformBounce
            ? {
                w: ArtGlobal.neon.platformBounce.width,
                h: ArtGlobal.neon.platformBounce.height,
              }
            : null,
        },
      };
    }
    return { eloveArt: art, artExposed: !!ArtGlobal, neonPlatforms: neonColors, fetchStatus };
  });

  const report = {
    url: URL,
    screenshots: [
      "platforms-spawn.png",
      "platforms-slip.png",
      "platforms-bounce.png",
      "platforms-canvas.png",
    ].map((n) => path.join(OUT, n)),
    platformNetworkHits: platformHits,
    artCheck,
    grokPlatformAssetsLoaded:
      (platformHits["platform-grip.png"] === 200 || artCheck.fetchStatus["platform-grip.png"] === 200) &&
      (platformHits["platform-slip.png"] === 200 || artCheck.fetchStatus["platform-slip.png"] === 200) &&
      (platformHits["platform-bounce.png"] === 200 ||
        artCheck.fetchStatus["platform-bounce.png"] === 200),
  };

  console.log(JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT, "platforms-capture-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
