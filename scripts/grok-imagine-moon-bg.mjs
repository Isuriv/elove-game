/**
 * Generate Moon Bouncing parallax plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-moon-bg.mjs
 *
 * Writes: assets/imagine/moon/{moon-sky-far,moon-surface-far,moon-midscape,
 *         moon-fg-accent,moon-railgun,moon-satellite-a..d,moon-starship-interior}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "moon");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: ink #0A0E18, slate #1A2438, lunar grey #C8C8D0, ash #8A8A98, soft cyan #7EC8E8, pale gold #FFE8A0, steel #A8B4C0 - cute professional Moon aesthetic, not grimdark";

const ITEMS = [
  {
    file: "moon-sky-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky background plate,",
      "soft deep space night over the Moon, charcoal to deep indigo sky,",
      "sparse tiny stars, subtle Earth crescent glow, soft cool grey lunar haze,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-surface-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant Moon crater ridge silhouette plate for parallax,",
      "soft cute cratered lunar hills across lower third only,",
      "soft haze above, empty dark sky upper two-thirds,",
      "no characters, no text, no logos,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-midscape.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cute Moon base scenery for side-scroller,",
      "regolith dunes, small habitat modules and landing pads as soft shapes,",
      "soft empty sky in upper third, pastel industrial Moon charm,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-fg-accent.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground Moon accents for side-scroller,",
      "soft grey rock outcrops and faint cable conduits from top edge,",
      "faint regolith rail along bottom, large empty black middle #000000 for gameplay,",
      "soft cyan LED tips pale gold blink accents,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-railgun.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art electromagnetic rail gun cannon sprite,",
      "long horizontal barrel, thick dark outline, bold saturated colors,",
      "glossy highlight pixels, toy-like proportions,",
      "steel grey body with cyan energy coils and pale gold muzzle glow,",
      "solid pure black background #000000,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-satellite-a.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art communications satellite sprite flying sideways,",
      "solar panel wings, antenna dish, thick dark outline, toy-like 16-bit,",
      "silver cyan pale gold accents, solid pure black background #000000,",
      "clean silhouette, no characters, no text, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-satellite-b.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art weather satellite sprite flying sideways variant,",
      "boxy body twin solar arrays, thick dark outline, toy-like proportions,",
      "steel silver cyan pale gold, solid pure black background #000000,",
      "clean silhouette, no characters, no text, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-satellite-c.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Starlink-style constellation satellite sprite,",
      "flat panel body antenna mast, thick dark outline, bold colors,",
      "white silver cyan accents, solid pure black background #000000,",
      "clean silhouette, no characters, no text, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-satellite-d.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art cute research satellite sprite flying sideways,",
      "round body with dish and solar wings, thick dark outline, toy-like,",
      "lunar silver cyan pale rose accents, solid pure black background #000000,",
      "clean silhouette, no characters, no text, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "moon-starship-interior.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide cute Starship interior cabin backdrop for game win screen,",
      "soft stainless steel walls, round porthole windows showing stars and grey Moon,",
      "warm cabin lights, cozy bench seat, soft cyan and pale gold accents,",
      "empty of characters, no text, no logos, cozy romantic space cabin,",
      PALETTE,
    ].join(" "),
  },
];

async function generateOne(item, key) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: item.prompt,
      n: 1,
      aspect_ratio: item.aspect_ratio,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${item.file}: ${res.status} ${text}`);
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  const url = json.data?.[0]?.url;
  let buf;
  if (b64) {
    buf = Buffer.from(b64, "base64");
  } else if (url) {
    const imgRes = await fetch(url);
    buf = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error(`${item.file}: no image data`);
  }
  await fs.writeFile(path.join(OUT, item.file), buf);
  console.log("wrote", item.file, buf.length);
}

async function main() {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    console.error("Set XAI_API_KEY to generate Moon plates (or use GenerateImage + copy).");
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  for (const item of ITEMS) {
    await generateOne(item, key);
  }
  console.log("Done ->", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
