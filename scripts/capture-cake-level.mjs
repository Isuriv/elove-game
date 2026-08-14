import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots");
await fs.mkdir(OUT, { recursive: true });

const bust = Date.now();
const url = `http://127.0.0.1:8081/?level=2&v=${bust}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(OUT, "cake-enemy-tint-4x.png") });

const info = await page.evaluate(async () => {
  const src = await (await fetch("js/render2d.js?_=" + Date.now(), { cache: "no-store" })).text();
  return {
    err: window.__eloveErr || null,
    mode: document.getElementById("play-hud")?.classList.contains("hidden")
      ? "title"
      : "play",
    has4x: src.includes("px: 96") && src.includes("px: 84"),
    hasTint: src.includes('rgba(255, 46, 166, 0.3)'),
    hasPurpleOutline: src.includes('"#3a2458"') || src.includes("'#3a2458'"),
  };
});
console.log(JSON.stringify({ url, info }, null, 2));
await browser.close();
