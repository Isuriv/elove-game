import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const bust = Date.now();
await page.goto(`http://127.0.0.1:8081/?level=2.5.5&v=${bust}`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const G = window.__ELOVE?.Game;
  const Art = window.__ELOVE_ART;
  const btn = document.querySelector('[data-level="2.55"]');
  return {
    err: window.__eloveErr || null,
    levelId: G?.getLevelId?.(),
    theme: window.__ELOVE?.scene?.theme,
    btnLabel: btn?.querySelector(".lvl-num")?.textContent,
    btnName: btn?.querySelector(".lvl-name")?.textContent,
    brains: Art?.neuralink?.brains?.length ?? 0,
    sky: !!Art?.neuralink?.sky,
    orFar: !!Art?.neuralink?.orFar,
    mid: !!Art?.neuralink?.midscape,
    fg: !!Art?.neuralink?.foreground,
    device: !!Art?.powerups?.["neuralink-device"],
    clue: !!Art?.powerups?.clue,
    parse255: G?.parseLevelId?.("2.5.5"),
    parse255b: G?.parseLevelId?.("2.55"),
    levels: G?.LEVELS?.map((l) => ({ id: l.id, key: l.key, name: l.name })),
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({
  path: path.join(ROOT, "screenshots", "neuralink-level-pass3.png"),
});

await page.goto(`http://127.0.0.1:8081/?level=2.5&v=${bust + 1}`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await page.waitForTimeout(1500);
const boring = await page.evaluate(() => ({
  err: window.__eloveErr || null,
  theme: window.__ELOVE?.scene?.theme,
  levelId: window.__ELOVE?.Game?.getLevelId?.(),
}));
console.log("boring", JSON.stringify(boring));

await page.goto(`http://127.0.0.1:8081/?level=3&v=${bust + 2}`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await page.waitForTimeout(1500);
const tesla = await page.evaluate(() => ({
  err: window.__eloveErr || null,
  theme: window.__ELOVE?.scene?.theme,
  levelId: window.__ELOVE?.Game?.getLevelId?.(),
}));
console.log("tesla", JSON.stringify(tesla));
await browser.close();
