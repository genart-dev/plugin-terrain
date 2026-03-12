#!/usr/bin/env node
/**
 * Generates .genart-workspace files for terrain presets.
 * Usage: node generate-workspace-files.cjs
 *
 * Creates:
 *   - examples/<category>/<category>.genart-workspace  (per-category workspace)
 *   - examples/terrain-gallery.genart-workspace        (full gallery workspace)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "examples");
const GRID_SPACING = 700; // 600px canvas + 100px gap
const COLS = 7;
const NOW = "2026-03-11T00:00:00.000Z";

// Category definitions with preset IDs
const CATEGORIES = {
  sky: {
    title: "Sky Presets",
    presets: ["dawn", "noon", "golden-hour", "dusk", "night"],
  },
  profile: {
    title: "Terrain Profile Presets",
    presets: ["alpine-range", "rolling-hills", "mesa-plateau", "coastal-cliffs", "sand-dunes", "foothills"],
  },
  clouds: {
    title: "Cloud Presets",
    presets: ["fair-weather", "overcast", "wispy-high", "storm-clouds", "scattered"],
  },
  water: {
    title: "Water Presets",
    presets: ["still-lake", "choppy-sea", "mountain-stream", "river", "pond"],
  },
  landscape: {
    title: "Landscape Composites",
    presets: ["mountain-dawn", "rolling-pastoral", "desert-sunset", "coastal-storm", "lake-at-night", "mountain-stream-scene"],
  },
};

function buildWorkspace(id, title, sketches) {
  return {
    "genart-workspace": "1.0",
    id,
    title,
    created: NOW,
    modified: NOW,
    viewport: { x: 0, y: 0, zoom: 0.4 },
    sketches,
    groups: [],
    series: [],
  };
}

let totalFiles = 0;

// Per-category workspaces
for (const [cat, def] of Object.entries(CATEGORIES)) {
  const sketches = def.presets.map((presetId, i) => ({
    file: `./${presetId}.genart`,
    position: {
      x: (i % COLS) * GRID_SPACING,
      y: Math.floor(i / COLS) * GRID_SPACING,
    },
  }));

  const ws = buildWorkspace(`terrain-${cat}`, def.title, sketches);
  const outFile = path.join(root, cat, `${cat}.genart-workspace`);
  fs.writeFileSync(outFile, JSON.stringify(ws, null, 2) + "\n");
  console.log(`  ${path.relative(root, outFile)} (${sketches.length} sketches)`);
  totalFiles++;
}

// Full gallery workspace — all categories in rows
const allSketches = [];
let currentRow = 0;

for (const [cat, def] of Object.entries(CATEGORIES)) {
  def.presets.forEach((presetId, i) => {
    allSketches.push({
      file: `${cat}/${presetId}.genart`,
      position: {
        x: (i % COLS) * GRID_SPACING,
        y: currentRow * GRID_SPACING,
      },
    });
    if ((i + 1) % COLS === 0) currentRow++;
  });
  // Move to next row after each category
  currentRow = Math.ceil(currentRow + 1);
}

const galleryWs = buildWorkspace("terrain-gallery", "Terrain Preset Gallery", allSketches);
galleryWs.viewport.zoom = 0.15;
const galleryFile = path.join(root, "terrain-gallery.genart-workspace");
fs.writeFileSync(galleryFile, JSON.stringify(galleryWs, null, 2) + "\n");
console.log(`  ${path.relative(root, galleryFile)} (${allSketches.length} sketches)`);
totalFiles++;

console.log(`\nDone: ${totalFiles} workspace files generated.`);
