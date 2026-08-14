import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
await fs.mkdir(OUT, { recursive: true });

const label = process.argv[2] || "pass1";
const bust = Date.now();
const url = `http://127.0.0.1:8081/?level=4&v=${bust}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(4000);
const shot = path.join(OUT, `spacex-level-${label}.png`);
await page.screenshot({ path: shot });

const info = await page.evaluate(async () => {
  return {
    err: window.__eloveErr || null,
    mode: document.getElementById("play-hud")?.classList.contains("hidden")
      ? "title"
      : "play",
    toast: document.getElementById("toast")?.textContent || "",
    themeHint: document.getElementById("tutorial")?.textContent || "",
    display: window.__ELOVE_DISPLAY || null,
  };
});
console.log(JSON.stringify({ url, shot, info }, null, 2));
await browser.close();
