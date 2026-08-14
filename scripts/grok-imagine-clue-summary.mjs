/**
 * Generate Level 1 end-of-level pieced-paper clue summary plate via xAI Grok Imagine.
 *
 *   $env:XAI_API_KEY = "xai-..."
 *   node scripts/grok-imagine-clue-summary.mjs
 *
 * Writes: assets/imagine/clues/clue-summary-paper.png
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
    file: "clue-summary-paper.png",
    aspect_ratio: "4:3",
    prompt: [
      "Isolated pieced-together torn paper note collage for a game UI overlay,",
      "multiple irregular torn parchment scraps taped and pieced into one assembled letter shape,",
      "aged cream beige light brown paper pieces with rough torn edges, visible tape strips,",
      "overlapping scraps, faint fold creases and fiber texture,",
      "large empty blank writing area in the center for text overlay,",
      "solid pure black background #000000 around the collage,",
      "no text, no handwriting, no characters, no UI chrome, no neon,",
      "top-down flat lay, clean silhouette, scrapbook ransom-note collage aesthetic,",
      "soft paper shadows between pieces",
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
  for (const item of ITEMS) {
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
