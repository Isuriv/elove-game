/**
 * Generate Neuralink OR-room parallax background plates via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-neuralink-bg.mjs
 *
 * Writes: assets/imagine/neuralink/{neuralink-sky-far,neuralink-or-far,neuralink-midscape,
 *         neuralink-fg-accent,neuralink-brain-a..d}.png
 *         and assets/imagine/powerups/neuralink-device.png
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "neuralink");
const POWERUPS = path.join(ROOT, "assets", "imagine", "powerups");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: sterile white #E8F0F4, cool teal #4DB6AC, soft cyan #7DDFE8, charcoal equipment #2A2F36, soft amber accent #E8A84A, rose brain #E8B4B8 - cute Neuralink operating-room aesthetic, NOT pitch-black, NOT grimdark, readable midtones";

const ITEMS = [
  {
    file: "neuralink-sky-far.png",
    dir: OUT,
    aspect_ratio: "16:9",
    prompt: [
      "Wide side-scrolling game sky/background plate for a bright Neuralink neurosurgery operating room,",
      "soft white and cool teal sterile walls, overhead surgical light haze,",
      "readable midtone OR atmosphere not dark void,",
      "no characters, no text, no UI, seamless horizontal feel,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-or-far.png",
    dir: OUT,
    aspect_ratio: "16:9",
    prompt: [
      "Wide distant operating-room silhouette plate for parallax,",
      "soft medical monitors, surgical arms, implant consoles across lower half,",
      "teal and cyan LED strips, soft haze,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-midscape.png",
    dir: OUT,
    aspect_ratio: "16:9",
    prompt: [
      "Wide mid-ground cute Neuralink OR scenery for side-scroller,",
      "sterile beds, monitor banks, implant docking stations,",
      "soft empty upper third for gameplay readability, pastel medical-tech charm,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-fg-accent.png",
    dir: OUT,
    aspect_ratio: "16:9",
    prompt: [
      "Wide foreground OR accents for side-scroller,",
      "soft hanging surgical lights from top edge, faint conduits along bottom,",
      "large empty black middle #000000 for gameplay,",
      "teal LED tips and cyan blink accents,",
      "no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-brain-a.png",
    dir: OUT,
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art floating human brain sprite, solid pure black background #000000,",
      "soft pink-beige brain with cool cyan neural glow filaments, side view floating brain,",
      "clean silhouette, no characters, no text, single brain,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-brain-b.png",
    dir: OUT,
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art floating brain with Neuralink chip implant, solid pure black background #000000,",
      "soft rose brain, teal implant plate, cyan glow threads, side view,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-brain-c.png",
    dir: OUT,
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art floating brain with cyan neural network lines, solid pure black background #000000,",
      "lavender-pink brain side view,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-brain-d.png",
    dir: OUT,
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art round floating brain sprite, solid pure black background #000000,",
      "beige-pink folds, teal highlight, amber spark accent,",
      "clean silhouette, no characters, no text,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "neuralink-device.png",
    dir: POWERUPS,
    aspect_ratio: "1:1",
    prompt: [
      "Isolated chunky pixel art Neuralink brain implant device collectible, solid pure black background #000000,",
      "tiny black coin implant with thin thread electrodes and soft cyan LED glow,",
      "clean silhouette, no characters, no text, cute game pickup,",
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
  await fs.mkdir(item.dir, { recursive: true });
  const outPath = path.join(item.dir, item.file);
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
