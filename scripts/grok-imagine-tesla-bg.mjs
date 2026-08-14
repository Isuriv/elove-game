/**
 * Generate Tesla Works parallax background plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-tesla-bg.mjs
 *
 * Writes: assets/imagine/tesla/{tesla-sky-far,tesla-factory-far,tesla-midscape,
 *         tesla-fg-accent,tesla-steam,tesla-car,tesla-cybertruck,tesla-roadster,tesla-suv}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "tesla");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: soft grey #C8D0D8, white #F5F7FA, silver #E8EEF4, Tesla blue #3E6AE1, soft red #E82127, mint steel #A8C0D0 - cute Gigafactory aesthetic, not grimdark";

const ITEMS = [
  {
    file: "tesla-sky-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky background plate,",
      "soft pastel industrial sky silver-blue to soft white horizon,",
      "distant tiny cute factory silhouettes on far horizon only,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-factory-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant Gigafactory silhouette plate for parallax,",
      "soft cute warehouse roofs and solar strips across lower half,",
      "electric blue window glow, soft red safety lights, soft haze above,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-midscape.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cute Gigafactory scenery for side-scroller,",
      "assembly halls, charging pods, rounded robotic arms as soft shapes,",
      "soft empty sky in upper third, pastel industrial charm,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-steam.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated soft industrial steam cloud sprite,",
      "solid pure black background #000000,",
      "silver-white steam with electric blue rim glow,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-fg-accent.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground industrial accents for side-scroller,",
      "soft grey cable conduits hanging from top edge, faint rail along bottom,",
      "large empty black middle #000000 for gameplay,",
      "Tesla blue LED tips soft red blink accents,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-car.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Tesla sedan sprite, solid pure black background #000000,",
      "silver-white body, electric blue headlight, soft red taillight, side view,",
      "clean silhouette, no characters, no text, single car,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-cybertruck.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Cybertruck sprite, solid pure black background #000000,",
      "angular stainless wedge truck side view, electric blue headlight strip,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-roadster.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art red Tesla roadster sprite, solid pure black background #000000,",
      "glossy red sports car side view, electric blue headlight, silver accents,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "tesla-suv.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art white Tesla SUV sprite, solid pure black background #000000,",
      "soft white crossover side view, electric blue headlight strip, soft red taillight,",
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
