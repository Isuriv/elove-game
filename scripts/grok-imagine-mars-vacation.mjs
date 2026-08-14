/**
 * Generate Level 5 Mars City vacation keyframes via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-mars-vacation.mjs
 *
 * Writes: assets/imagine/starship/movie/{vacation-01-mars-city-arrival,
 *         vacation-02-city-plaza,vacation-03-skybridge-sunset,
 *         vacation-04-dome-night}.png
 *
 * Without XAI_API_KEY, use Cursor GenerateImage for the same filenames, then copy into OUT.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "imagine", "starship", "movie");
const API = "https://api.x.ai/v1/images/generations";
const MODEL = process.env.GROK_IMAGINE_MODEL || "grok-imagine-image";

const PALETTE =
  "exact game palette: navy #0B1D36, teal mist #1A3A4A, soft flame orange #FF6B2C, cyan glow #5BC0EB, pale gold #FFE8A0, warm Mars rust #C45A32 - cute professional space-romance aesthetic, whimsical game-art, not grimdark";

const STYLE =
  "cinematic wide 16:9 keyframe for a short in-game love movie coda, soft lighting, no text, no UI, no logos, no watermarks";

const CATS =
  "TWO chibi cats vacationing: white cream player cat with pink blush on cyan-pink heart rocket with pink hearts, and fluffy golden-yellow Elove cat with amber eyes (same chibi proportions, NOT anime girl, NOT black fur)";

const ITEMS = [
  {
    file: "vacation-01-mars-city-arrival.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "rust-red Mars sci-fi city arrival: sleek chrome and glass towers, soft cyan neon walkways, distant stainless Starship on a pad,",
      CATS,
      "thin orange Mars sky,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "vacation-02-city-plaza.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "futuristic Mars city plaza boulevard with glass skybridges and cute hover scooters,",
      CATS,
      "snuggling / holding close, peach-orange thin atmosphere,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "vacation-03-skybridge-sunset.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "glowing cyan skybridge overlook at soft Mars dusk with glittering megacity towers and rust canyons beyond,",
      CATS,
      "sitting close together, pale gold stars beginning,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "vacation-04-dome-night.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "night Mars dome cafe overlooking city lights with cyan neon reflections, heart-shaped constellation in navy sky,",
      CATS,
      "cuddling under a soft pale-gold canopy, happily forever vacation feeling,",
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
    console.error(
      "Set XAI_API_KEY to generate Mars vacation frames (or use GenerateImage + copy into assets/imagine/starship/movie/)."
    );
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  for (const item of ITEMS) {
    await generateOne(item, key);
  }
  console.log("Done ->", OUT);
  console.log("Then: npm run encode:mars-vacation  ->  mars-vacation-movie.mp4");
  console.log("Bump shipVer / cache-bust query to l5-mars-vacation-* after regenerating.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
