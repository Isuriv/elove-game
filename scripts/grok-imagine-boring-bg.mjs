/**
 * Generate Boring Company parallax background plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-boring-bg.mjs
 *
 * Writes: assets/imagine/boring/{boring-sky-far,boring-tunnel-far,boring-midscape,
 *         boring-fg-accent,boring-rock-boulder,boring-rock-slab,boring-rock-jagged,
 *         boring-rock-round}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "boring");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: lit tunnel concrete #6E7C86, warm amber construction light #E8A84A, cyan work light #5AC8D2, ochre rock #8B7355, teal rock #5A8A82, soft sand #C4A06A - cute The Boring Company tunnel aesthetic, NOT pitch-black, NOT grimdark, readable midtones";

const ITEMS = [
  {
    file: "boring-sky-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky/background plate for a lit underground tunnel,",
      "soft concrete vault ceiling glow, amber and cyan construction light haze,",
      "readable mid-grey tunnel atmosphere not dark void,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-tunnel-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant tunnel bore silhouette plate for parallax,",
      "soft ribbed concrete rings and support arches across lower half,",
      "amber safety lights and cyan LED strips, soft haze,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-midscape.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cute tunnel scenery for side-scroller,",
      "concrete arches, digger silhouettes as soft shapes, rock piles,",
      "soft empty upper third for gameplay readability, pastel industrial charm,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-fg-accent.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground tunnel accents for side-scroller,",
      "soft concrete struts hanging from top edge, faint conduit along bottom,",
      "large empty black middle #000000 for gameplay,",
      "amber LED tips and cyan blink accents,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-rock-boulder.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art giant boulder rock sprite, solid pure black background #000000,",
      "ochre and teal stone, soft sand highlights, side view floating rock,",
      "clean silhouette, no characters, no text, single rock,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-rock-slab.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art giant flat rock slab sprite, solid pure black background #000000,",
      "layered ochre concrete-stone slab side view, cyan rim fleck,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-rock-jagged.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art jagged giant rock sprite, solid pure black background #000000,",
      "teal-ochre crystalline boulder side view, amber tip accent,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "boring-rock-round.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art round giant rock sprite, solid pure black background #000000,",
      "smooth ochre boulder with teal patch, cute tunnel debris,",
      "clean silhouette, no characters, no text,",
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
  const queue = only.length
    ? ITEMS.filter((i) => only.some((a) => i.file.includes(a)))
    : ITEMS;
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
