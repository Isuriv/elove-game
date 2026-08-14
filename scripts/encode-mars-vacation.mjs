/**
 * Encode assets/imagine/starship/movie/vacation-*.png -> mars-vacation-movie.mp4
 * (Ken Burns zoompan + crossfades). Requires ffmpeg-static.
 *
 *   node scripts/encode-mars-vacation.mjs
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "imagine", "starship", "movie");
const TMP = path.join(OUT_DIR, "_clips_vacation");
const FILES = [
  "vacation-01-mars-city-arrival.png",
  "vacation-02-city-plaza.png",
  "vacation-03-skybridge-sunset.png",
  "vacation-04-dome-night.png",
];
const ZOOMS = [
  "min(1.0+0.0011*on,1.11)",
  "min(1.0+0.0010*on,1.10)",
  "min(1.0+0.0009*on,1.09)",
  "min(1.0+0.0012*on,1.13)",
];
const XS = [
  "iw/2-(iw/zoom/2)+on*0.15",
  "iw/2-(iw/zoom/2)",
  "iw/2-(iw/zoom/2)+on*0.22",
  "iw/2-(iw/zoom/2)",
];
const YS = [
  "ih/2-(ih/zoom/2)-on*0.12",
  "ih/2-(ih/zoom/2)+on*0.10",
  "ih/2-(ih/zoom/2)-on*0.08",
  "ih/2-(ih/zoom/2)-on*0.14",
];

const ffmpeg = require("ffmpeg-static");
if (!ffmpeg || !fs.existsSync(ffmpeg)) {
  console.error(
    "ffmpeg-static missing - run: npm install --no-save ffmpeg-static && npm approve-scripts ffmpeg-static"
  );
  process.exit(1);
}

fs.mkdirSync(TMP, { recursive: true });
const clips = [];
for (let i = 0; i < FILES.length; i++) {
  const input = path.join(OUT_DIR, FILES[i]);
  if (!fs.existsSync(input)) {
    console.error("missing", input);
    process.exit(1);
  }
  const out = path.join(TMP, `clip${String(i + 1).padStart(2, "0")}.mp4`);
  const vf = `zoompan=z='${ZOOMS[i]}':x='${XS[i]}':y='${YS[i]}':d=78:s=1280x720:fps=30,format=yuv420p`;
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-loop",
      "1",
      "-i",
      input,
      "-vf",
      vf,
      "-t",
      "2.6",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      out,
    ],
    { stdio: "inherit" }
  );
  clips.push(out);
}

const final = path.join(OUT_DIR, "mars-vacation-movie.mp4");
execFileSync(
  ffmpeg,
  [
    "-y",
    "-i",
    clips[0],
    "-i",
    clips[1],
    "-i",
    clips[2],
    "-i",
    clips[3],
    "-filter_complex",
    "[0:v][1:v]xfade=transition=fade:duration=0.4:offset=2.2[v01];[v01][2:v]xfade=transition=fade:duration=0.4:offset=4.4[v012];[v012][3:v]xfade=transition=fade:duration=0.4:offset=6.6[vout]",
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    final,
  ],
  { stdio: "inherit" }
);
fs.rmSync(TMP, { recursive: true, force: true });
console.log("Wrote", final, fs.statSync(final).size, "bytes");
console.log("Bump shipVer / cache-bust to l5-mars-vacation-* after re-encoding.");
