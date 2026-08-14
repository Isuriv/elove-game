/**
 * Generate Level 5 end "Grok Imagine Movie" keyframes via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-mars-movie.mjs
 *
 * Writes: assets/imagine/starship/movie/{movie-01-blastoff,movie-02-moon-flyby,
 *         movie-03-deep-space,movie-04-mars-arrival}.png
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

const ITEMS = [
  {
    file: "movie-01-blastoff.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "stainless SpaceX Starship blasting off into deep navy space,",
      "huge cartoon soft orange cyan yellow flame plume,",
      "lit cabin window with TWO chibi cats snuggling: white cream player cat on cyan-pink heart rocket, and fluffy golden-yellow Elove cat with amber eyes (same chibi proportions, NOT anime girl, NOT black fur),",
      "soft stars and teal mist,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "movie-02-moon-flyby.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "sleek stainless Starship flying past a large cratered grey Moon,",
      "several cute chunky satellites with solar panels orbiting the Moon,",
      "warm cabin window clearly showing white chibi player cat and golden-yellow Elove cat snuggling,",
      "deep navy space, soft cyan rim light, pale gold stars,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "movie-03-deep-space.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "stainless Starship sailing through deep space toward a tiny distant rust-red Mars,",
      "soft teal and violet nebula wisps, sparse pale gold stars,",
      "cabin window showing white chibi player cat and golden-yellow Elove cat cuddled together,",
      "sense of a long romantic voyage,",
      PALETTE,
    ].join(" "),
  },
  {
    file: "movie-04-mars-arrival.png",
    aspect_ratio: "16:9",
    prompt: [
      STYLE,
      "rust-red Mars filling much of the frame with thin orange atmosphere limb,",
      "several cute chunky satellites with solar panels orbiting Mars,",
      "sleek stainless Starship approaching from the left with soft cyan glow; cabin window shows white chibi player cat and golden-yellow Elove cat looking out,",
      "warm pale gold highlights, arrival feeling,",
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
      "Set XAI_API_KEY to generate Mars movie frames (or use GenerateImage + copy into assets/imagine/starship/movie/)."
    );
    process.exit(1);
  }
  await fs.mkdir(OUT, { recursive: true });
  for (const item of ITEMS) {
    await generateOne(item, key);
  }
  console.log("Done ->", OUT);
  console.log("Then: npm run encode:mars-movie  ->  mars-love-movie.mp4");
  console.log("Bump shipVer / cache-bust query to l5-mars-video-* after regenerating.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
