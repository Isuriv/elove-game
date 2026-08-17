/**
 * Generate end-of-level holographic Elove message plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-holo-notes.mjs
 *
 * Writes: assets/imagine/clues/holo-comm-panel.png
 *         assets/imagine/clues/holo-elove.png
 *
 * Without XAI_API_KEY, use Cursor GenerateImage for the same filenames, then copy into OUT.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "clues");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const ITEMS = [
  {
    file: "holo-comm-panel.png",
    aspect_ratio: "16:9",
    prompt: [
      "Video game holographic communicator UI plate, isolated on solid pure black background #000000.",
      "A floating translucent cyan and magenta hologram message screen, hexagonal rounded rectangle,",
      "glowing neon edge, horizontal scanlines, volumetric light, slight flicker glitch on the corners.",
      "Large empty blank center region with no writing for text overlay.",
      "Small circular projector pad at the bottom emitting a cone of cyan light.",
      "Mass Effect and Star Wars holocomm aesthetic, synthwave, cute game UI, not photoreal.",
      "Absolutely no text, no letters, no numbers, no logos, no watermarks, no paper, no parchment.",
      "Clean silhouette, empty writing area.",
    ].join(" "),
  },
  {
    file: "holo-elove.png",
    aspect_ratio: "1:1",
    prompt: [
      "Cute chibi black cat with amber eyes as a translucent cyan holographic projection,",
      "isolated on solid pure black background #000000.",
      "Video game hologram of a small fluffy black cat standing, scanline ghosting,",
      "volumetric cyan light, magenta rim, flickering transparent edges,",
      "standing above a tiny circular hologram projector pad with rising light cone.",
      "Mass Effect holocomm style, chunky cute game character, not photoreal,",
      "not an anime girl, not a human. No text, no letters, no UI, no logos. Clean silhouette.",
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
    console.error('  $env:XAI_API_KEY = "xai-..."');
    console.error("  npm run imagine:holo-notes");
    console.error("Without a key, use Cursor GenerateImage for holo-comm-panel.png and holo-elove.png.");
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const queue = only.length
    ? ITEMS.filter((i) => only.some((a) => i.file.includes(a)))
    : ITEMS;
  console.log(`Using model ${MODEL}`);
  console.log(`Writing to ${OUT}`);
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
