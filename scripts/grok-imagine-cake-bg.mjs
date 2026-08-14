/**
 * Generate Cake Realm parallax background plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-cake-bg.mjs
 *
 * Writes: assets/imagine/cake/{cake-sky-far,cake-mountains,cake-midscape,cake-cloud,cake-fg-accent,
 *         pastry-cupcake,pastry-macaron,pastry-croissant,pastry-donut,pastry-slice}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "cake");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: neon magenta #ff2ea6, hot pink #ff7ec8, electric cyan #00e8ff, gold #ffe066, deep purple #1a0a2e, cream #fff5fb - neon cake synthwave aesthetic";

const ITEMS = [
  {
    file: "cake-sky-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky background plate,",
      "pastel cake frosting paradise sky gradient lavender-pink to peach-cream,",
      "distant cake-tower mountain silhouettes on horizon,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "cake-mountains.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant cake mountain silhouette plate for parallax,",
      "frosting peaks and layered cake ridges across lower half,",
      "soft haze above, magenta cream cyan rim light,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "cake-midscape.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cake scenery for side-scroller,",
      "stacked cake hills, frosting swirls, cherry toppings, candy pillars,",
      "soft empty sky in upper third, neon pastel cake aesthetic,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "cake-cloud.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated fluffy frosting cloud sprite,",
      "solid pure black background #000000,",
      "soft pink cream whipped frosting with cyan sparkle edges,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "cake-fg-accent.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground frosting drip accents for side-scroller,",
      "drips hanging from top edge, crumb ridge along bottom,",
      "large empty black middle #000000 for gameplay,",
      "magenta neon frosting cyan glaze gold sprinkles,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "pastry-cupcake.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art cupcake sprite, solid pure black background #000000,",
      "pink frosting swirl, gold cherry, cream wrapper, cyan sugar sparkles,",
      "clean silhouette, no characters, no text, single cupcake,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "pastry-macaron.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art macaron sprite, solid pure black background #000000,",
      "magenta shells with cream filling, cyan rim glow,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "pastry-croissant.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art croissant sprite, solid pure black background #000000,",
      "golden flaky croissant with magenta sugar dust and cyan highlight,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "pastry-donut.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art glazed donut sprite, solid pure black background #000000,",
      "pink frosting donut with magenta cyan gold sprinkles, hole in center,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "pastry-slice.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art cake slice sprite, solid pure black background #000000,",
      "cream and strawberry layers, magenta frosting drip, gold cherry,",
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
