/**
 * Generate three synthwave platform tile sprites via xAI Grok Imagine.
 * Palette locked to in-game neon: magenta #ff2ea6, cyan #00e8ff, gold #ffe066, ink #1a0a2e.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-platforms.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "platforms");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: neon magenta #ff2ea6, hot pink #ff7ec8, electric cyan #00e8ff, soft cyan #7efcff, gold #ffe066, deep purple ink #1a0a2e #1a1040 #2a1860, cream highlight #fff5fb";

const ITEMS = [
  {
    file: "platform-grip.png",
    aspect_ratio: "16:9",
    prompt: [
      "Game tile sprite, solid pure black background #000000,",
      "side-view 2D pixel art floating platform slab for a synthwave cyberpunk side-scroller,",
      "dark purple metal body with rivets and panel lines,",
      "thick glowing neon MAGENTA top lip with thin white highlight edge,",
      "small cyan LED dots on underside, hanging wire stubs optional,",
      "chunky readable pixels, clean silhouette, no characters, no text, no HUD,",
      "single horizontal platform tile, fills most of frame width,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "platform-slip.png",
    aspect_ratio: "16:9",
    prompt: [
      "Game tile sprite, solid pure black background #000000,",
      "side-view 2D pixel art SLIPPERY ice-chrome floating platform for synthwave side-scroller,",
      "glossy cyan glass / polished chrome top surface with bright specular shine and sparkle pixels,",
      "cool cyan #00e8ff rim instead of pink, frosted white highlight streak,",
      "dark purple underside with cyan vents, looks icy and frictionless,",
      "chunky readable pixels, clean silhouette, no characters, no text, no HUD,",
      "single horizontal platform tile, fills most of frame width,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "platform-bounce.png",
    aspect_ratio: "16:9",
    prompt: [
      "Game tile sprite, solid pure black background #000000,",
      "side-view 2D pixel art BOUNCE energy pad platform for synthwave side-scroller,",
      "dark purple chassis with a glowing gold #ffe066 and magenta spring/energy chevron on top,",
      "looks springy and charged, small upward arrow chevrons or zigzag energy,",
      "magenta rim accents, cyan edge LEDs, chunky readable pixels,",
      "clean silhouette, no characters, no text, no HUD,",
      "single horizontal platform tile, fills most of frame width,",
      PALETTE,
    ].join(" "),
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
      aspect_ratio: item.aspect_ratio,
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
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  console.log(`Using model ${MODEL}`);
  console.log(`Writing to ${OUT}`);
  const only = process.argv.slice(2);
  const queue = only.length ? ITEMS.filter((i) => only.some((a) => i.file.includes(a))) : ITEMS;
  for (const item of queue) {
    process.stdout.write(`${item.file}... `);
    try {
      const p = await generateOne(apiKey, item);
      console.log(`ok -> ${path.relative(ROOT, p)}`);
    } catch (e) {
      console.log("FAIL");
      console.error(e.message || e);
      process.exitCode = 1;
    }
  }
}

main();
