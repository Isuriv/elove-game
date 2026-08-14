/**
 * Build temporary sprite sheets from existing Imagine/MyPixels singles
 * so animation works before / without a fresh Grok Imagine run.
 *
 *   node scripts/build-sheets-from-existing.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IM = path.join(ROOT, "assets", "imagine");
const GAME = path.join(ROOT, "assets", "game");
const FRAMES = path.join(IM, "frames");
const SHEETS = path.join(IM, "sheets");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function pick(...candidates) {
  for (const c of candidates) {
    if (await exists(c)) return c;
  }
  return null;
}

async function stitch(framePaths, outPath, cell = 128) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const urls = [];
  for (const fp of framePaths) {
    const buf = await fs.readFile(fp);
    urls.push(`data:image/png;base64,${buf.toString("base64")}`);
  }
  const outB64 = await page.evaluate(
    async ({ urls, cell }) => {
      const imgs = [];
      for (const src of urls) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });
        imgs.push(img);
      }
      const c = document.createElement("canvas");
      c.width = cell * imgs.length;
      c.height = cell;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        const scale = Math.min(cell / img.width, cell / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const ox = i * cell + ((cell - w) / 2) | 0;
        const oy = ((cell - h) / 2) | 0;
        ctx.drawImage(img, ox, oy, w, h);
      }
      return c.toDataURL("image/png").split(",")[1];
    },
    { urls, cell }
  );
  await browser.close();
  await fs.writeFile(outPath, Buffer.from(outB64, "base64"));
}

/** Duplicate a source into N slightly shifted variants for placeholder animation. */
async function makeVariants(srcPath, count, outDir, prefix) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const buf = await fs.readFile(srcPath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  const outs = await page.evaluate(
    async ({ dataUrl, count }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = dataUrl;
      });
      const results = [];
      for (let i = 0; i < count; i++) {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 128, 128);
        const scale = Math.min(120 / img.width, 120 / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const bob = (i % 2 === 0 ? 0 : 2) + (i === 2 ? -1 : 0);
        const ox = ((128 - w) / 2) | 0;
        const oy = (((128 - h) / 2) | 0) + bob;
        ctx.drawImage(img, ox, oy, w, h);
        // Tiny thruster / glow flicker on later frames
        if (i > 0) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = i === 3 ? "#ff2ea6" : "#00e8ff";
          ctx.fillRect(ox + 2, oy + h - 4, 3 + i, 2);
          ctx.globalAlpha = 1;
        }
        results.push(c.toDataURL("image/png").split(",")[1]);
      }
      return results;
    },
    { dataUrl, count }
  );
  await browser.close();
  const paths = [];
  for (let i = 0; i < outs.length; i++) {
    const p = path.join(outDir, `${prefix}-${i}.png`);
    await fs.writeFile(p, Buffer.from(outs[i], "base64"));
    paths.push(p);
  }
  return paths;
}

async function main() {
  await fs.mkdir(FRAMES, { recursive: true });
  await fs.mkdir(SHEETS, { recursive: true });

  const manifest = { generatedAt: new Date().toISOString(), source: "existing", sheets: {} };

  // Player
  const playerSrc = await pick(
    path.join(IM, "player-cat-rocket.png"),
    path.join(GAME, "catridingrocket.png")
  );
  if (playerSrc) {
    const frames = await makeVariants(playerSrc, 4, FRAMES, "player-placeholder");
    await stitch(frames, path.join(SHEETS, "player-cat-rocket.png"));
    manifest.sheets["player-cat-rocket"] = {
      file: "player-cat-rocket.png",
      cols: 4,
      rows: 1,
      cell: 128,
      anims: { idle: [0, 1], fly: [1, 2], slash: [3], hurt: [0] },
    };
    console.log("player-cat-rocket sheet ok");
  }

  // Drone (fly + hurt only - no attack sheet cells)
  const droneSrc = await pick(path.join(IM, "enemy-drone.png"), path.join(GAME, "enemydrone.png"));
  if (droneSrc) {
    const frames = await makeVariants(droneSrc, 3, FRAMES, "drone-placeholder");
    await stitch(frames, path.join(SHEETS, "enemy-drone.png"));
    manifest.sheets["enemy-drone"] = {
      file: "enemy-drone.png",
      cols: 3,
      rows: 1,
      cell: 128,
      anims: { fly: [0, 1, 2], hurt: [1] },
    };
    console.log("enemy-drone sheet ok");
  }

  // Cyborg - use real distinct frames when present
  const cyFrames = [];
  for (const name of [
    "enemy-cyborg-idle.png",
    "enemy-cyborg-walk-a.png",
    "enemy-cyborg-walk-b.png",
    "enemy-cyborg-attack.png",
  ]) {
    const p = path.join(IM, name);
    if (await exists(p)) cyFrames.push(p);
  }
  if (cyFrames.length === 4) {
    await stitch(cyFrames, path.join(SHEETS, "enemy-cyborg.png"));
    manifest.sheets["enemy-cyborg"] = {
      file: "enemy-cyborg.png",
      cols: 4,
      rows: 1,
      cell: 128,
      anims: { idle: [0], walk: [1, 2], attack: [3], hurt: [0] },
    };
    console.log("enemy-cyborg sheet ok");
  }

  // Blade
  const bladeSrc = await pick(path.join(IM, "pickup-blade.png"));
  if (bladeSrc) {
    const frames = await makeVariants(bladeSrc, 4, FRAMES, "blade-placeholder");
    await stitch(frames, path.join(SHEETS, "pickup-blade.png"));
    manifest.sheets["pickup-blade"] = {
      file: "pickup-blade.png",
      cols: 4,
      rows: 1,
      cell: 128,
      anims: { spin: [0, 1, 2, 3] },
    };
    console.log("pickup-blade sheet ok");
  }

  await fs.writeFile(path.join(SHEETS, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("wrote assets/imagine/sheets/manifest.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
