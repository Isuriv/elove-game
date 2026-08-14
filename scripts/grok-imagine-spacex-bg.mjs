/**
 * Generate SpaceX Ascent / Starbase parallax background plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-spacex-bg.mjs
 *
 * Writes: assets/imagine/spacex/{spacex-sky-far,spacex-pad-far,spacex-midscape,
 *         spacex-fg-accent,spacex-rocket-falcon,spacex-rocket-starship,
 *         spacex-rocket-starship-b,spacex-rocket-starship-c,spacex-rocket-starship-d,
 *         spacex-rocket-starship-stack,spacex-rocket-heavy,spacex-rocket-crew,
 *         spacex-nebula-a,spacex-nebula-b,spacex-rocket-to-moon}.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "spacex");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: navy #0B1D36, teal mist #1A3A4A, steel #C8D4E0, white #F5F7FA, cyan glow #5BC0EB, soft flame orange #FF6B2C, sand pad #C4B49A - cute professional Starbase aesthetic, not grimdark";

const ITEMS = [
  {
    file: "spacex-sky-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky background plate,",
      "soft deep navy night sky with cool colorful space nebulas,",
      "cyan teal violet-magenta clouds and soft orange ember wisps,",
      "sparse tiny stars, soft atmospheric haze,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-pad-far.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant Starbase launch complex silhouette plate for parallax,",
      "soft cute launch towers and gantries across lower third only,",
      "soft haze above, empty sky upper two-thirds,",
      "no characters, no text, no logos,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-midscape.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cute Starbase launch pad scenery for side-scroller,",
      "assembly halls, rounded towers, flame trenches as soft shapes,",
      "soft empty sky in upper third, pastel industrial charm,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-fg-accent.png",
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground launch accents for side-scroller,",
      "soft steel cable conduits hanging from top edge, faint rail along bottom,",
      "large empty black middle #000000 for gameplay,",
      "cyan LED tips soft orange blink accents,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  // Rocket floaters - match Cake Realm pastry sprite language (chunky pixel, black BG)
  {
    file: "spacex-rocket-falcon.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Falcon 9 rocket sprite blasting off upward,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold saturated colors,",
      "glossy white highlight pixels, stair-step shading, toy-like proportions,",
      "white rocket nose up, black interstage band,",
      "big cartoon orange yellow white flame plume blasting from engines with cyan sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-starship.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art SpaceX Starship rocket sprite blasting off upward,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold colors,",
      "glossy highlight pixels, chunky 16-bit shading, toy-like,",
      "stainless steel silver cylinder with pointed nose cone,",
      "forward flap fins near nose and larger aft flaps near base,",
      "dark heat-tile belly strip, three Raptor engine bells,",
      "huge cartoon orange cyan yellow flame plume blasting from bottom with sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-starship-b.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art SpaceX Starship rocket sprite blasting off upward variant,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold saturated colors,",
      "glossy white highlight pixels, stair-step shading, toy-like proportions,",
      "metallic stainless steel body, conical nose, canard flaps and rear flaps,",
      "dark heat-shield strip, bright multi-engine cartoon flame plume with cyan sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-starship-c.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art SpaceX Starship rocket sprite blasting off upward,",
      "solid pure black background #000000,",
      "cute pastry game sprite style: thick dark outline, bold colors, glossy highlights,",
      "tall stainless steel fuselage, pointed nose cone, visible flap fins,",
      "gridline paneling, orange yellow white cyan flame plume from engines,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-starship-d.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art SpaceX Starship rocket sprite blasting off upward at slight lean,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold colors,",
      "glossy metallic silver stainless steel, pointed nose cone,",
      "forward and aft flap fins, dark heat tile belly, cartoon flame plume with sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-starship-stack.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art SpaceX Super Heavy plus Starship stack blasting off upward,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold saturated colors,",
      "glossy highlights, toy-like proportions,",
      "stainless steel Starship nose cone stacked on thicker Super Heavy booster,",
      "aft flaps, massive multi-engine cartoon orange yellow white flame plume with cyan sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-heavy.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Falcon Heavy triple-booster rocket sprite blasting off upward,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold saturated colors,",
      "glossy white highlights, chunky pixel shading, toy-like,",
      "three white boosters side by side nose up,",
      "big cartoon orange yellow flame plumes blasting from all three bases with cyan sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-crew.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Crew Dragon on booster rocket sprite blasting off upward,",
      "solid pure black background #000000,",
      "same style as cute game pastry sprites: thick dark outline, bold colors,",
      "glossy highlight pixels, chunky 16-bit shading, toy-like,",
      "cute white capsule on slender white booster nose up,",
      "big cartoon orange yellow flame plume blasting from bottom with cyan sparkles,",
      "clean silhouette, no characters, no text, no logos, not photoreal,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-nebula-a.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art space nebula cloud floater,",
      "soft glowing cosmic nebula wisps in cyan teal soft magenta-violet,",
      "steel white sparkles, solid pure black background #000000,",
      "no characters, no text, no planets, no rockets, clean silhouette,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-nebula-b.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art space nebula cloud floater variant,",
      "swirling cosmic dust in deep navy cyan glow soft flame-orange rim,",
      "solid pure black background #000000,",
      "no characters, no text, no logos, clean silhouette,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "spacex-rocket-to-moon.png",
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art accent: cute cartoon Starship rocket flying toward a cratered grey moon,",
      "rocket nose pointing upper-right toward the moon, big cartoon flame plume,",
      "thick dark outline, toy-like proportions, solid pure black background #000000,",
      "no characters, no text, no logos, not photoreal,",
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
    console.error("Set XAI_API_KEY to generate SpaceX plates (or use GenerateImage + copy).");
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
