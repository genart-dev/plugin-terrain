#!/usr/bin/env node
/**
 * Generate per-category gallery PNGs using ImageMagick convert.
 * Usage: node generate-galleries.cjs
 *
 * Prerequisite: PNGs must already exist in examples/<category>/*.png
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "galleries");
const EXAMPLES = path.join(__dirname, "examples");
const COLS = 4;
const TILE = 200;
const GAP = 6;
const PAD = 10;
const BG = "#1a1a2e";

fs.mkdirSync(OUT, { recursive: true });

const CATEGORIES = [
  "sky", "profile", "clouds", "water",
  "river", "path", "shore", "field", "rock", "treeline",
  "celestial", "fog", "starfield", "cliff-face", "snowfield",
  "building", "bridge", "reflection", "vignette-foliage", "forest-floor", "haze",
  "fence", "boat", "erosion",
  "landscape", "scenes",
];

let total = 0;

for (const cat of CATEGORIES) {
  const dir = path.join(EXAMPLES, cat);
  if (!fs.existsSync(dir)) {
    console.log(`SKIP ${cat} (no directory)`);
    continue;
  }

  const pngs = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(dir, f));

  if (pngs.length === 0) {
    console.log(`SKIP ${cat} (no PNGs)`);
    continue;
  }

  const rows = Math.ceil(pngs.length / COLS);
  const w = PAD * 2 + COLS * TILE + (COLS - 1) * GAP;
  const h = PAD * 2 + rows * TILE + (rows - 1) * GAP;

  // Build convert command: create base canvas then overlay each resized image
  const parts = [`convert -size ${w}x${h} "xc:${BG}"`];

  for (let i = 0; i < pngs.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (TILE + GAP);
    const y = PAD + row * (TILE + GAP);
    // Each image: load, resize, then composite onto canvas at offset
    parts.push(`\\( "${pngs[i]}" -resize ${TILE}x${TILE} \\) -geometry +${x}+${y} -composite`);
  }

  const outFile = path.join(OUT, `${cat}-gallery.png`);
  parts.push(`"${outFile}"`);

  console.log(`Generating ${cat} gallery (${pngs.length} images)...`);
  try {
    execSync(parts.join(" "), { shell: "/bin/bash", stdio: "pipe", timeout: 60_000 });
    total++;
  } catch (err) {
    console.error(`  FAILED: ${err.stderr?.toString().trim() || err.message}`);
  }
}

console.log(`\nDone: ${total} category galleries in galleries/`);
