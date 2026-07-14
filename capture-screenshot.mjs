/* Capture a gameplay screenshot for aesthetic iteration */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "screenshots");

async function main() {
  const { mkdir } = await import("fs/promises");
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // Start game
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  // Move right into the level a bit
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(1800);
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(400);

  const wrap = page.locator("#game-wrap");
  const shot = path.join(out, "gameplay-bg.png");
  await wrap.screenshot({ path: shot });
  console.log("saved", shot);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
