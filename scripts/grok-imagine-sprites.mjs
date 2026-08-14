/**
 * Generate improved game sprites via xAI Grok Imagine.
 *
 * Usage (PowerShell):
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-sprites.mjs
 *
 * Writes PNGs to assets/imagine/ and prints paths.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const SPRITES = [
  {
    file: "player-cat-rocket.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite sheet style single character, transparent-looking solid pure black background #000000,",
      "side-view 2D pixel art cat riding a small heart-marked rocket, facing right,",
      "cyberpunk synthwave palette neon magenta cyan purple,",
      "chunky readable pixels, clean silhouette, no HUD, no text, no ground,",
      "suitable for a side-scrolling action game player character",
    ].join(" "),
  },
  {
    file: "enemy-drone.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D pixel art hostile flying combat drone facing left,",
      "dark metal with glowing orange-red eyes and thrusters,",
      "cyberpunk neon accents, chunky pixels, clean silhouette,",
      "no text no HUD, enemy for a side scroller",
    ].join(" "),
  },
  {
    file: "enemy-cyborg-idle.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D pixel art futuristic soldier cyborg standing facing right,",
      "white-grey armor, bright red visor slit, simple pose,",
      "cyberpunk neon city enemy, chunky pixels, clean silhouette, no text",
    ].join(" "),
  },
  {
    file: "enemy-cyborg-walk-a.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D pixel art futuristic soldier cyborg mid-walk facing right,",
      "white-grey armor, bright red visor, walking pose frame A,",
      "same character design as a cyberpunk side-scroller enemy, chunky pixels, no text",
    ].join(" "),
  },
  {
    file: "enemy-cyborg-walk-b.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D pixel art futuristic soldier cyborg mid-walk facing right,",
      "white-grey armor, bright red visor, walking pose frame B alternate step,",
      "same character design as a cyberpunk side-scroller enemy, chunky pixels, no text",
    ].join(" "),
  },
  {
    file: "enemy-cyborg-attack.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "side-view 2D pixel art futuristic soldier cyborg shooting facing right,",
      "white-grey armor, bright red visor, holding a neon cyan blaster,",
      "muzzle flash small, chunky pixels, clean silhouette, no text",
    ].join(" "),
  },
  {
    file: "pickup-blade.png",
    aspect_ratio: "1:1",
    prompt: [
      "Game sprite, solid pure black background #000000,",
      "2D pixel art energy sword / neon blade pickup item,",
      "magenta and cyan glow, floating slightly, chunky pixels, no text",
    ].join(" "),
  },
];

async function generateOne(apiKey, item) {
  const body = {
    model: MODEL,
    prompt: item.prompt,
    n: 1,
    aspect_ratio: item.aspect_ratio,
    response_format: "b64_json",
  };

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${item.file}: ${res.status} ${text.slice(0, 400)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  const url = json?.data?.[0]?.url;
  if (b64) {
    const buf = Buffer.from(b64, "base64");
    const outPath = path.join(OUT, item.file);
    await fs.writeFile(outPath, buf);
    return outPath;
  }
  if (url) {
    const imgRes = await fetch(url);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const outPath = path.join(OUT, item.file);
    await fs.writeFile(outPath, buf);
    return outPath;
  }
  throw new Error(`${item.file}: no image data in response`);
}

async function main() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error("Missing XAI_API_KEY. Set it then re-run:");
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  node scripts/grok-imagine-sprites.mjs");
    process.exit(1);
  }

  await fs.mkdir(OUT, { recursive: true });
  console.log(`Using model ${MODEL}`);
  console.log(`Writing to ${OUT}`);

  const only = process.argv.slice(2);
  const queue = only.length
    ? SPRITES.filter((s) => only.includes(s.file) || only.includes(path.parse(s.file).name))
    : SPRITES;

  for (const item of queue) {
    process.stdout.write(`Generating ${item.file}... `);
    try {
      const out = await generateOne(apiKey, item);
      console.log(`ok -> ${path.relative(ROOT, out)}`);
    } catch (err) {
      console.log("FAIL");
      console.error(err.message || err);
    }
  }
}

main();
