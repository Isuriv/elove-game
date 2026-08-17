/**
 * Generate faux-3D power-ups + hanging cable props via Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-powerups.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "powerups");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const ITEMS = [
  {
    file: "shield.png",
    prompt:
      "Game sprite, solid pure black background #000000, isometric faux-3D pixel art hard-light energy shield pickup, cyan neon crystal cube with magenta rim, chunky pixels, clean silhouette, no text no HUD",
  },
  {
    file: "battery.png",
    prompt:
      "Game sprite, solid pure black background #000000, isometric faux-3D pixel art cyberpunk battery power cell pickup, dark metal with cyan magenta LEDs, chunky pixels, clean silhouette, no text",
  },
  {
    file: "heart.png",
    prompt:
      "Game sprite, solid pure black background #000000, isometric faux-3D pixel art repair heart pickup with slight depth, neon magenta and pink, chunky pixels, clean silhouette, no text",
  },
  {
    file: "magnet.png",
    prompt:
      "Game sprite, solid pure black background #000000, isometric faux-3D pixel art horseshoe magnet pickup, purple body with cyan and magenta tips, chunky pixels, clean silhouette, no text",
  },
  {
    file: "cable.png",
    prompt:
      "Game sprite, solid pure black background #000000, vertical pixel art hanging cyberpunk cable wire dangling down, frayed tip, neon magenta cyan accents on dark cable, chunky pixels, no text, suitable as a platform decoration",
  },
];

async function generateOne(apiKey, item) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: item.prompt,
      n: 1,
      aspect_ratio: "1:1",
      response_format: "b64_json",
    }),
  });
  if (!res.ok) throw new Error(`${item.file}: ${res.status} ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  let buf;
  if (b64) buf = Buffer.from(b64, "base64");
  else if (url) buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  else throw new Error(`${item.file}: no image`);
  const outPath = path.join(OUT, item.file);
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error("Missing XAI_API_KEY");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  npm run imagine:powerups -- shield");
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const queue = only.length
    ? ITEMS.filter((i) => only.some((a) => i.file.includes(a)))
    : ITEMS;
  console.log(`Using model ${MODEL}`);
  for (const item of queue) {
    process.stdout.write(`${item.file}... `);
    try {
      const p = await generateOne(apiKey, item);
      console.log(`ok -> ${path.relative(ROOT, p)}`);
    } catch (e) {
      console.log("FAIL");
      console.error(e.message || e);
    }
  }
}

main();
